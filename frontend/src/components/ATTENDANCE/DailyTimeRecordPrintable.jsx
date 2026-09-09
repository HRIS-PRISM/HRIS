import React from 'react';
import {
  DTR_PAGE_MARGIN_MM,
  DTR_PRINTABLE_WIDTH_MM,
  DTR_PRINTABLE_HEIGHT_MM,
} from '../../utils/dtrFormatHelpers';

const MM_TO_PX = 96 / 25.4;

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
  const scaleWrapper = doc.querySelector('.dtr-print-scale');
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

/**
 * Print the already-rendered DTR HTML in an isolated document.
 * This preserves the React template and inline styles while avoiding app-shell
 * overflow/position rules. No canvas, screenshot, or raster image is created.
 */
export async function printDtrHtml(sourceElement) {
  if (!sourceElement) return;

  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'DTR print document');
  frame.setAttribute('aria-hidden', 'true');
  // Sized to the real printable area so measurements match the printed page.
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
    return;
  }

  printDocument.open();
  printDocument.write(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <base href="${document.baseURI}" />
        <title>Daily Time Record</title>
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #fff; }
          ${DTR_PRINT_CSS}
        </style>
      </head>
      <body>
        <main class="dtr-print-area">
          <div class="dtr-print-scale">${sourceElement.outerHTML}</div>
        </main>
      </body>
    </html>`);
  printDocument.close();

  await waitForPrintAssets(printDocument);
  await new Promise((resolve) =>
    frame.contentWindow.requestAnimationFrame(() =>
      frame.contentWindow.requestAnimationFrame(resolve),
    ),
  );

  fitDtrToPage(printDocument);

  const removeFrame = () => {
    window.setTimeout(() => frame.remove(), 0);
  };

  frame.contentWindow.addEventListener('afterprint', removeFrame, {
    once: true,
  });
  frame.contentWindow.focus();
  frame.contentWindow.print();

  // Fallback for browsers that do not fire afterprint on iframe documents.
  window.setTimeout(() => {
    if (frame.isConnected) frame.remove();
  }, 60000);
}
