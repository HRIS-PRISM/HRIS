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
 * Build a multi-page PDF from DTR HTML and trigger an automatic download.
 * Print stays on the fast HTML path; only Download uses this raster step.
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

  const frame = await createDtrFrameDocument(pages, {
    title: title || safeName.replace(/\.pdf$/i, ''),
  });
  if (!frame) return null;

  try {
    const doc = frame.contentDocument;
    const areas = Array.from(doc.querySelectorAll('.dtr-print-area'));
    if (!areas.length) throw new Error('No DTR pages to download.');

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
        scale: areas.length >= 30 ? 1.1 : areas.length >= 15 ? 1.35 : 1.6,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgW = canvas.width;
      const imgH = canvas.height;
      const scale = Math.min(maxW / (imgW * 0.264583), maxH / (imgH * 0.264583));
      const drawW = imgW * 0.264583 * scale;
      const drawH = imgH * 0.264583 * scale;
      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', x, y, drawW, drawH);
    }

    const blob = pdf.output('blob');
    triggerFileDownload(blob, safeName);
    return safeName;
  } finally {
    frame.remove();
  }
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
