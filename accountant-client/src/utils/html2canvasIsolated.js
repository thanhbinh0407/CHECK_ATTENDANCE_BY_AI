import html2canvas from 'html2canvas';

/**
 * Runs html2canvas on a detached node inside a blank iframe so the library
 * does not parse the host page stylesheets (html2canvas cannot parse oklch() and
 * other modern color functions that may appear in global CSS).
 */
export async function html2canvasIsolated(node, options = {}) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'pdf-export');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:absolute;left:-9999px;top:0;width:2000px;min-height:8000px;height:auto;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  try {
    const idoc = iframe.contentDocument;
    idoc.open();
    idoc.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
        '<style>html,body{margin:0;padding:0;background:#ffffff;color:#111111;}</style>' +
        '</head><body></body></html>'
    );
    idoc.close();
    idoc.body.appendChild(node);

    return await html2canvas(node, {
      logging: false,
      backgroundColor: '#ffffff',
      ...options,
    });
  } finally {
    iframe.remove();
  }
}
