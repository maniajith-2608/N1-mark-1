// The project builds without the DOM typings; just what this file touches.
type FrameWindow = {
  focus: () => void;
  print: () => void;
};
type Frame = {
  src: string;
  style: Record<string, string>;
  contentWindow: FrameWindow | null;
  addEventListener: (event: 'load', cb: () => void) => void;
  remove: () => void;
};
type Browser = {
  document?: {
    createElement: (tag: 'iframe') => Frame;
    body: { appendChild: (el: Frame) => void };
  };
  addEventListener?: (event: 'focus', cb: () => void, o: object) => void;
};
const browser = globalThis as unknown as Browser;

/** Out of sight, but rendered: a hidden frame's PDF viewer won't print. */
const OFFSCREEN = {
  position: 'fixed',
  right: '0',
  bottom: '0',
  width: '1px',
  height: '1px',
  border: '0',
  opacity: '0',
};

/**
 * Web: prints a PDF (by its link) from an off-screen frame, so the
 * browser's print dialog opens without leaving the app. The frame goes once
 * the app has focus again, after the dialog closes.
 */
export function printPdf(url: string): Promise<boolean> {
  const doc = browser.document;
  if (!doc) {
    return Promise.resolve(false);
  }
  return new Promise(resolve => {
    const frame = doc.createElement('iframe');
    Object.assign(frame.style, OFFSCREEN);
    frame.addEventListener('load', () => {
      const win = frame.contentWindow;
      if (!win) {
        frame.remove();
        resolve(false);
        return;
      }
      browser.addEventListener?.('focus', () => frame.remove(), { once: true });
      win.focus();
      win.print();
      resolve(true);
    });
    frame.src = url;
    doc.body.appendChild(frame);
  });
}
