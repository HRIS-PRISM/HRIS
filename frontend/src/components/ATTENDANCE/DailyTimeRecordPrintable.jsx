import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  DTR_PAGE_MARGIN_MM,
  DTR_PRINTABLE_WIDTH_MM,
  DTR_PRINTABLE_HEIGHT_MM,
  sanitizePdfFileName,
} from '../../utils/dtrFormatHelpers';

const MM_TO_PX = 96 / 25.4;
const PX_TO_MM = 25.4 / 96;

const parseBorderPx = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const isBoxedDtrCell = (cell, win) => {
  const cs = win.getComputedStyle(cell);
  return ['Top', 'Right', 'Bottom', 'Left'].every(
    (side) => parseBorderPx(cs[`border${side}Width`]) > 0,
  );
};

/**
 * html2canvas does not collapse adjacent 1px table borders the way browsers
 * do in print, so each shared edge is painted twice and the DTR grid looks
 * about twice as thick as Print. Convert boxed cells to one-sided borders
 * (right + bottom, plus outer top/left) so the snapshot matches print.
 */
const prepareDtrGridForHtml2Canvas = (clonedDoc) => {
  const win = clonedDoc.defaultView;
  if (!win) return;

  clonedDoc.querySelectorAll('.dtr-table').forEach((table) => {
    const boxed = [];
    const occupied = [];

    const mark = (r, c, rowSpan, colSpan) => {
      for (let i = 0; i < rowSpan; i += 1) {
        occupied[r + i] ||= [];
        for (let j = 0; j < colSpan; j += 1) occupied[r + i][c + j] = true;
      }
    };

    const firstFreeCol = (r) => {
      occupied[r] ||= [];
      let c = 0;
      while (occupied[r][c]) c += 1;
      return c;
    };

    Array.from(table.rows).forEach((tr, r) => {
      Array.from(tr.cells).forEach((cell) => {
        const c = firstFreeCol(r);
        const rowSpan = Number(cell.rowSpan) || 1;
        const colSpan = Number(cell.colSpan) || 1;
        mark(r, c, rowSpan, colSpan);
        if (isBoxedDtrCell(cell, win)) boxed.push({ cell, r, c });
      });
    });

    if (!boxed.length) return;

    table.style.setProperty('border-collapse', 'separate', 'important');
    table.style.setProperty('border-spacing', '0', 'important');

    const minR = Math.min(...boxed.map((b) => b.r));
    const minC = Math.min(...boxed.map((b) => b.c));

    boxed.forEach(({ cell, r, c }) => {
      const color = win.getComputedStyle(cell).borderTopColor || '#000';
      const top = r === minR ? '1px' : '0';
      const left = c === minC ? '1px' : '0';
      cell.style.setProperty('border-style', 'solid', 'important');
      cell.style.setProperty('border-color', color, 'important');
      cell.style.setProperty('border-width', `${top} 1px 1px ${left}`, 'important');
    });
  });
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Print stylesheet — prints the same on-screen DTR HTML (no canvas, no portal clone).
 * Hide app chrome; show only .dtr-print-area with full table layout intact.
 */
export const DTR_PRINT_CSS = `
  /* thead defaults to bold in many browsers — force meta rows normal */
  .dtr-table thead td.dtr-meta-cell,
  .dtr-table thead td.dtr-meta-cell * {
    font-weight: 400 !important;
  }

  @media print {
    @page {
      size: A4 portrait;
      margin: ${DTR_PAGE_MARGIN_MM}mm;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    .no-print,
    .MuiDrawer-root,
    .MuiAppBar-root,
    .MuiBackdrop-root,
    header,
    footer {
      display: none !important;
    }

    .dtr-print-area {
      display: block !important;
      width: ${DTR_PRINTABLE_WIDTH_MM}mm !important;
      height: ${DTR_PRINTABLE_HEIGHT_MM}mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      /* Clip instead of paginating: the scale wrapper already fits one page. */
      overflow: hidden !important;
      background: white !important;
      page-break-inside: avoid !important;
      page-break-after: avoid !important;
    }

    /* Scaled down uniformly by fitDtrToPage() so one A4 sheet always fits. */
    .dtr-print-scale {
      transform-origin: top left !important;
    }

    .dtr-print-area .table-container,
    .dtr-print-area .table-wrapper {
      display: block !important;
      width: auto !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: white !important;
      box-shadow: none !important;
      border: none !important;
    }

    /*
     * DTRTemplate owns all dimensions, spacing, typography, rows and borders.
     * Do not restyle its descendants here: screen and PDF must remain identical.
     */
    .dtr-print-area .dtr-page {
      margin: 0 !important;
      background: white !important;
      page-break-inside: avoid !important;
    }

    /* Right copy only. Leave table size alone; pull it off the page edge
       so printer margins do not clip U-time. */
    .dtr-print-area .dtr-page > .dtr-sheet:last-child {
      position: relative !important;
      left: -2mm !important;
    }
  }
`;

export function DTRPrintStyles() {
  return <style>{DTR_PRINT_CSS}</style>;
}

const waitForPrintAssets = async (doc) => {
  const images = Array.from(doc.images);
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }),
  );

  if (doc.fonts?.ready) {
    await doc.fonts.ready;
  }
};

/**
 * Shrink the cloned DTR uniformly until it fits the A4 printable area.
 *
 * A `<table>` treats `height` as a minimum, so a very tall month can still
 * exceed the printable height and spill onto a second page. Scaling the whole
 * subtree keeps the exact on-screen layout (no reflow, no restyling) while
 * guaranteeing a single sheet. Scaling is capped at 1 so a DTR that already
 * fits is printed at full size and uses the full page width.
 */
const fitDtrToPage = (doc) => {
  doc.querySelectorAll('.dtr-print-scale').forEach(fitScaleWrapper);
};

const fitScaleWrapper = (scaleWrapper) => {
  const page = scaleWrapper?.querySelector('.dtr-page');
  if (!scaleWrapper || !page) return;

  // A stretched flex child can overflow its parent without growing it, so take
  // the tallest of the page box and the individual DTR sheets.
  const sheetHeights = Array.from(page.querySelectorAll('.dtr-sheet')).map(
    (sheet) => Math.max(sheet.scrollHeight, sheet.offsetHeight),
  );
  const contentWidth = Math.max(page.scrollWidth, page.offsetWidth);
  const contentHeight = Math.max(page.scrollHeight, ...sheetHeights);
  if (!contentWidth || !contentHeight) return;

  const scale = Math.min(
    1,
    (DTR_PRINTABLE_WIDTH_MM * MM_TO_PX) / contentWidth,
    (DTR_PRINTABLE_HEIGHT_MM * MM_TO_PX) / contentHeight,
  );

  scaleWrapper.style.width = `${contentWidth}px`;
  scaleWrapper.style.height = `${contentHeight}px`;

  if (scale < 1) {
    // Keep the shrunken DTR centred so any leftover margin is split evenly
    // instead of all collecting on the right edge.
    const offsetX = Math.max(
      0,
      (DTR_PRINTABLE_WIDTH_MM * MM_TO_PX - contentWidth * scale) / 2,
    );
    scaleWrapper.style.transform = `translateX(${offsetX}px) scale(${scale})`;
  }
};

/* One printed sheet per DTR when several employees are printed in one job. */
const DTR_MULTI_PAGE_CSS = `
  @media print {
    .dtr-print-area {
      page-break-after: always !important;
      break-after: page !important;
    }

    .dtr-print-area:last-of-type {
      page-break-after: auto !important;
      break-after: auto !important;
    }
  }
`;

/** Screen/layout CSS so off-screen capture measures the same as print. */
const DTR_CAPTURE_LAYOUT_CSS = `
  html, body { margin: 0; padding: 0; background: #fff; }
  .dtr-print-area {
    display: block;
    width: ${DTR_PRINTABLE_WIDTH_MM}mm;
    height: ${DTR_PRINTABLE_HEIGHT_MM}mm;
    margin: 0 auto;
    padding: 0;
    overflow: hidden;
    background: #fff;
  }
  .dtr-print-scale { transform-origin: top left; }
  .dtr-page > .dtr-sheet:last-child {
    position: relative;
    left: -2mm;
  }
`;

const normalizeHtmlPages = (htmlPages) =>
  (Array.isArray(htmlPages) ? htmlPages : [htmlPages]).filter(Boolean);

const createDtrFrameDocument = async (pages, { title } = {}) => {
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'DTR document');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${DTR_PRINTABLE_WIDTH_MM}mm`,
    `height:${DTR_PRINTABLE_HEIGHT_MM}mm`,
    'border:0',
  ].join(';');
  document.body.appendChild(frame);

  const printDocument = frame.contentDocument;
  if (!printDocument) {
    frame.remove();
    return null;
  }

  const body = pages
    .map(
      (html) =>
        `<main class="dtr-print-area"><div class="dtr-print-scale">${html}</div></main>`,
    )
    .join('');

  printDocument.open();
  printDocument.write(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <base href="${document.baseURI}" />
        <title>${escapeHtml(title || 'Daily Time Record')}</title>
        <style>
          * { box-sizing: border-box; }
          ${DTR_CAPTURE_LAYOUT_CSS}
          ${DTR_PRINT_CSS}
          ${pages.length > 1 ? DTR_MULTI_PAGE_CSS : ''}
        </style>
      </head>
      <body>${body}</body>
    </html>`);
  printDocument.close();

  await waitForPrintAssets(printDocument);
  await new Promise((resolve) =>
    frame.contentWindow.requestAnimationFrame(() =>
      frame.contentWindow.requestAnimationFrame(resolve),
    ),
  );
  fitDtrToPage(printDocument);
  return frame;
};

export const triggerFileDownload = (blob, fileName) => {
  const safeName = sanitizePdfFileName(
    fileName?.toLowerCase?.().endsWith('.pdf')
      ? fileName
      : `${fileName || 'Daily Time Record'}.pdf`,
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return safeName;
};

/**
 * Same A4 image layout as Download PDF. Shared so Print and Download match.
 */
const renderDtrPdfBlob = async (htmlPages, { title, onProgress } = {}) => {
  const pages = normalizeHtmlPages(htmlPages);
  if (!pages.length) return null;

  const frame = await createDtrFrameDocument(pages, { title });
  if (!frame) return null;

  try {
    const doc = frame.contentDocument;
    const areas = Array.from(doc.querySelectorAll('.dtr-print-area'));
    if (!areas.length) throw new Error('No DTR pages to print.');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = DTR_PAGE_MARGIN_MM;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;

    for (let i = 0; i < areas.length; i++) {
      onProgress?.(i + 1, areas.length);
      const canvas = await html2canvas(areas[i], {
        // Integer scale keeps 1px grid lines on pixel boundaries.
        scale: areas.length >= 30 ? 1 : 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: prepareDtrGridForHtml2Canvas,
      });
      // PNG keeps hairline grid strokes; JPEG smears 1px rules into thicker bars.
      const imgData = canvas.toDataURL('image/png');
      const srcW = (areas[i].offsetWidth || canvas.width) * PX_TO_MM;
      const srcH = (areas[i].offsetHeight || canvas.height) * PX_TO_MM;
      const fit = Math.min(maxW / srcW, maxH / srcH, 1);
      const drawW = srcW * fit;
      const drawH = srcH * fit;
      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);
    }

    return pdf.output('blob');
  } finally {
    frame.remove();
  }
};

const printPdfBlob = (blob) => {
  const url = URL.createObjectURL(blob);
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'DTR print');
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  frame.src = url;
  document.body.appendChild(frame);

  const cleanup = () => {
    window.setTimeout(() => {
      if (frame.isConnected) frame.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const trigger = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch (e) {
      const tab = window.open(url, '_blank');
      tab?.addEventListener('load', () => tab.print(), { once: true });
    }
    frame.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 60000);
  };

  frame.onload = () => window.setTimeout(trigger, 300);
};

/**
 * Print one or more already-rendered DTRs as HTML in an isolated document.
 * No canvas/PDF — opens the browser print dialog.
 */
export async function printDtrHtmlPages(htmlPages, { title } = {}) {
  const pages = normalizeHtmlPages(htmlPages);
  if (!pages.length) return;

  const frame = await createDtrFrameDocument(pages, { title });
  if (!frame) return;

  const removeFrame = () => {
    window.setTimeout(() => frame.remove(), 0);
  };

  frame.contentWindow.addEventListener('afterprint', removeFrame, {
    once: true,
  });
  frame.contentWindow.focus();
  frame.contentWindow.print();

  window.setTimeout(() => {
    if (frame.isConnected) frame.remove();
  }, 60000);
}

/**
 * Print using the same PDF image as Download, then open the print dialog.
 */
export async function printDtrPdfPages(htmlPages, { title, onProgress } = {}) {
  const blob = await renderDtrPdfBlob(htmlPages, { title, onProgress });
  if (!blob) return;
  printPdfBlob(blob);
}

/**
 * Build a multi-page PDF from DTR HTML and trigger an automatic download.
 */
export async function downloadDtrHtmlPages(
  htmlPages,
  fileName,
  { title, onProgress } = {},
) {
  const pages = normalizeHtmlPages(htmlPages);
  if (!pages.length) return null;

  const safeName = sanitizePdfFileName(
    fileName?.toLowerCase?.().endsWith('.pdf')
      ? fileName
      : `${fileName || 'Daily Time Record'}.pdf`,
  );

  const blob = await renderDtrPdfBlob(pages, {
    title: title || safeName.replace(/\.pdf$/i, ''),
    onProgress,
  });
  if (!blob) return null;
  triggerFileDownload(blob, safeName);
  return safeName;
}

/** Print a single on-screen DTR element. */
export async function printDtrHtml(sourceElement, options) {
  if (!sourceElement) return;
  await printDtrHtmlPages([sourceElement.outerHTML], options);
}

/** Download a single on-screen DTR element as a PDF file. */
export async function downloadDtrHtml(sourceElement, fileName, options) {
  if (!sourceElement) return null;
  return downloadDtrHtmlPages([sourceElement.outerHTML], fileName, options);
}
