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

export const FORM_PAGE_MARGIN_MM = DTR_PAGE_MARGIN_MM;
export const FORM_PRINTABLE_WIDTH_MM = DTR_PRINTABLE_WIDTH_MM; // 198
export const FORM_PRINTABLE_HEIGHT_MM = DTR_PRINTABLE_HEIGHT_MM; // 285
/** Landscape printable area (A4 rotated). */
export const FORM_LANDSCAPE_PRINTABLE_WIDTH_MM = DTR_PRINTABLE_HEIGHT_MM; // 285
export const FORM_LANDSCAPE_PRINTABLE_HEIGHT_MM = DTR_PRINTABLE_WIDTH_MM; // 198

const parseBorderPx = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const isBoxedCell = (cell, win) => {
  const cs = win.getComputedStyle(cell);
  return ['Top', 'Right', 'Bottom', 'Left'].every(
    (side) => parseBorderPx(cs[`border${side}Width`]) > 0,
  );
};

/**
 * html2canvas does not collapse adjacent 1px table borders the way browsers
 * do in print. Convert boxed cells to one-sided borders so PDF matches print.
 */
const prepareFormGridForHtml2Canvas = (clonedDoc) => {
  const win = clonedDoc.defaultView;
  if (!win) return;

  clonedDoc.querySelectorAll('.form-page table').forEach((table) => {
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
        if (isBoxedCell(cell, win)) boxed.push({ cell, r, c });
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

const resolveGeometry = (orientation = 'portrait') => {
  const landscape = orientation === 'landscape';
  return {
    orientation: landscape ? 'landscape' : 'portrait',
    printableWidthMm: landscape
      ? FORM_LANDSCAPE_PRINTABLE_WIDTH_MM
      : FORM_PRINTABLE_WIDTH_MM,
    printableHeightMm: landscape
      ? FORM_LANDSCAPE_PRINTABLE_HEIGHT_MM
      : FORM_PRINTABLE_HEIGHT_MM,
    pageSizeCss: landscape ? 'A4 landscape' : 'A4 portrait',
  };
};

const buildPrintCss = ({ printableWidthMm, printableHeightMm, pageSizeCss }) => `
  @media print {
    @page {
      size: ${pageSizeCss};
      margin: ${FORM_PAGE_MARGIN_MM}mm;
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

    .form-print-area {
      display: block !important;
      width: ${printableWidthMm}mm !important;
      height: ${printableHeightMm}mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      overflow: hidden !important;
      background: white !important;
      page-break-inside: avoid !important;
      page-break-after: avoid !important;
    }

    .form-print-scale {
      transform-origin: top left !important;
    }

    .form-print-area .form-page {
      margin: 0 !important;
      background: white !important;
      page-break-inside: avoid !important;
    }
  }
`;

const buildCaptureLayoutCss = ({ printableWidthMm, printableHeightMm }) => `
  html, body { margin: 0; padding: 0; background: #fff; }
  .form-print-area {
    display: block;
    width: ${printableWidthMm}mm;
    height: ${printableHeightMm}mm;
    margin: 0 auto;
    padding: 0;
    overflow: hidden;
    background: #fff;
  }
  .form-print-scale { transform-origin: top left; }
`;

const FORM_MULTI_PAGE_CSS = `
  @media print {
    .form-print-area {
      page-break-after: always !important;
      break-after: page !important;
    }

    .form-print-area:last-of-type {
      page-break-after: auto !important;
      break-after: auto !important;
    }
  }
`;

/** Screen print CSS for portrait forms (optional <style> in the live page). */
export const FORM_PRINT_CSS = buildPrintCss(resolveGeometry('portrait'));

export function FormPrintStyles() {
  return <style>{FORM_PRINT_CSS}</style>;
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

const fitScaleWrapper = (scaleWrapper, printableWidthMm, printableHeightMm) => {
  const page = scaleWrapper?.querySelector('.form-page');
  if (!scaleWrapper || !page) return;

  const contentWidth = Math.max(page.scrollWidth, page.offsetWidth);
  const contentHeight = Math.max(page.scrollHeight, page.offsetHeight);
  if (!contentWidth || !contentHeight) return;

  const scale = Math.min(
    1,
    (printableWidthMm * MM_TO_PX) / contentWidth,
    (printableHeightMm * MM_TO_PX) / contentHeight,
  );

  scaleWrapper.style.width = `${contentWidth}px`;
  scaleWrapper.style.height = `${contentHeight}px`;

  if (scale < 1) {
    const offsetX = Math.max(
      0,
      (printableWidthMm * MM_TO_PX - contentWidth * scale) / 2,
    );
    scaleWrapper.style.transform = `translateX(${offsetX}px) scale(${scale})`;
  }
};

const fitFormToPage = (doc, printableWidthMm, printableHeightMm) => {
  doc.querySelectorAll('.form-print-scale').forEach((wrapper) => {
    fitScaleWrapper(wrapper, printableWidthMm, printableHeightMm);
  });
};

const normalizeHtmlPages = (htmlPages) =>
  (Array.isArray(htmlPages) ? htmlPages : [htmlPages]).filter(Boolean);

/**
 * Ensure each page HTML is a `.form-page` root. If the caller passes the
 * outer `.form-print-area` (or already-wrapped page), unwrap/normalize.
 */
const toFormPageHtml = (html) => {
  const trimmed = String(html || '').trim();
  if (!trimmed) return '';

  if (trimmed.includes('class="form-page"') || trimmed.includes("class='form-page'")) {
    // Prefer the inner .form-page when a print-area wrapper was passed.
    const match = trimmed.match(
      /<div[^>]*class=["'][^"']*form-page[^"']*["'][^>]*>[\s\S]*$/i,
    );
    if (match && trimmed.includes('form-print-area')) {
      try {
        const tpl = document.createElement('template');
        tpl.innerHTML = trimmed;
        const page = tpl.content.querySelector('.form-page');
        if (page) return page.outerHTML;
      } catch {
        /* fall through */
      }
    }
    return trimmed;
  }

  return `<div class="form-page">${trimmed}</div>`;
};

const createFormFrameDocument = async (
  pages,
  { title, orientation = 'portrait' } = {},
) => {
  const geom = resolveGeometry(orientation);
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'Form document');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${geom.printableWidthMm}mm`,
    `height:${geom.printableHeightMm}mm`,
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
        `<main class="form-print-area"><div class="form-print-scale">${toFormPageHtml(html)}</div></main>`,
    )
    .join('');

  printDocument.open();
  printDocument.write(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <base href="${document.baseURI}" />
        <title>${escapeHtml(title || 'Form')}</title>
        <style>
          * { box-sizing: border-box; }
          ${buildCaptureLayoutCss(geom)}
          ${buildPrintCss(geom)}
          ${pages.length > 1 ? FORM_MULTI_PAGE_CSS : ''}
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
  fitFormToPage(
    printDocument,
    geom.printableWidthMm,
    geom.printableHeightMm,
  );
  return { frame, geom };
};

export const triggerFileDownload = (blob, fileName) => {
  const safeName = sanitizePdfFileName(
    fileName?.toLowerCase?.().endsWith('.pdf')
      ? fileName
      : `${fileName || 'Form'}.pdf`,
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
 * Print one or more already-rendered forms as HTML in an isolated document.
 * No canvas/PDF — opens the browser print dialog.
 */
export async function printFormHtmlPages(
  htmlPages,
  { title, orientation = 'portrait' } = {},
) {
  const pages = normalizeHtmlPages(htmlPages);
  if (!pages.length) return;

  const result = await createFormFrameDocument(pages, { title, orientation });
  if (!result) return;
  const { frame } = result;

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
 * Build a multi-page PDF from form HTML and trigger an automatic download.
 * Print stays on the fast HTML path; only Download uses this raster step.
 */
export async function downloadFormHtmlPages(
  htmlPages,
  fileName,
  { title, onProgress, orientation = 'portrait' } = {},
) {
  const pages = normalizeHtmlPages(htmlPages);
  if (!pages.length) return null;

  const safeName = sanitizePdfFileName(
    fileName?.toLowerCase?.().endsWith('.pdf')
      ? fileName
      : `${fileName || 'Form'}.pdf`,
  );

  const result = await createFormFrameDocument(pages, {
    title: title || safeName.replace(/\.pdf$/i, ''),
    orientation,
  });
  if (!result) return null;
  const { frame } = result;

  try {
    const doc = frame.contentDocument;
    const areas = Array.from(doc.querySelectorAll('.form-print-area'));
    if (!areas.length) throw new Error('No form pages to download.');

    const pdf = new jsPDF({
      orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = FORM_PAGE_MARGIN_MM;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;

    for (let i = 0; i < areas.length; i++) {
      onProgress?.(i + 1, areas.length);
      const canvas = await html2canvas(areas[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: prepareFormGridForHtml2Canvas,
      });
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

    const blob = pdf.output('blob');
    triggerFileDownload(blob, safeName);
    return safeName;
  } finally {
    frame.remove();
  }
}

/** Resolve HTML from a source element (prefer .form-page when present). */
const elementToPageHtml = (sourceElement) => {
  if (!sourceElement) return '';
  const page = sourceElement.classList?.contains('form-page')
    ? sourceElement
    : sourceElement.querySelector?.('.form-page');
  return (page || sourceElement).outerHTML;
};

/** Print a single on-screen form element. */
export async function printFormHtml(sourceElement, options) {
  if (!sourceElement) return;
  await printFormHtmlPages([elementToPageHtml(sourceElement)], options);
}

/** Download a single on-screen form element as a PDF file. */
export async function downloadFormHtml(sourceElement, fileName, options) {
  if (!sourceElement) return null;
  return downloadFormHtmlPages(
    [elementToPageHtml(sourceElement)],
    fileName,
    options,
  );
}
