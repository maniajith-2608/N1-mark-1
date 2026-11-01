import type { Attachment } from '../../shared/types';
import { escapeHtml } from '../print/printPage';

// The project builds without the DOM typings; just what this file touches.
type Popup = {
  document: { write: (html: string) => void; close: () => void };
  focus: () => void;
  print: () => void;
  addEventListener: (event: 'load', cb: () => void) => void;
  location: { href: string };
  close: () => void;
};
type Browser = {
  open?: (url: string, target: string) => Popup | null;
};
const browser = globalThis as unknown as Browser;

const isImage = (doc: Attachment) => Boolean(doc.uri?.startsWith('data:image'));

/** Opens the file in a new tab. False when there's nothing to open. */
export function openDocument(doc: Attachment): boolean {
  if (!doc.uri || !browser.open) {
    return false;
  }
  return browser.open(doc.uri, '_blank') !== null;
}

/**
 * A tab opened now, while the tap still allows pop-ups, for a link that's on
 * its way. `show` fills it with a page of its own instead (title and body
 * HTML; the caller escapes it), which every browser and web view displays.
 */
export type ReservedTab = {
  open: (uri: string) => boolean;
  show: (title: string, body: string) => void;
  close: () => void;
};

/**
 * Opens an empty tab straight away: browsers block a tab opened after an
 * await (a stored file's download link), so it's filled in once the link
 * arrives. Null when pop-ups are blocked.
 */
export function reserveTab(): ReservedTab | null {
  const tab = browser.open?.('', '_blank');
  if (!tab) {
    return null;
  }
  return {
    open: uri => {
      tab.location.href = uri;
      return true;
    },
    show: (title, body) => {
      tab.document.write(
        `<!doctype html><meta charset="utf-8">` +
          '<meta name="viewport" content="width=device-width,initial-scale=1">' +
          `<title>${escapeHtml(title)}</title>` +
          '<style>body{margin:0;padding:16px;background:#f2f2f2;' +
          'font-family:system-ui,sans-serif;display:flex;flex-direction:column;' +
          'align-items:center;gap:16px}img{max-width:100%;height:auto;' +
          'background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.15)}</style>' +
          body,
      );
      tab.document.close();
    },
    close: () => tab.close(),
  };
}

/**
 * Opens the file in a new tab and prints it: images on a plain page, PDFs in
 * the browser's own viewer. False when there's nothing to print.
 */
export function printDocument(doc: Attachment): boolean {
  if (!doc.uri || !browser.open) {
    return false;
  }
  if (isImage(doc)) {
    const popup = browser.open('', '_blank');
    if (!popup) {
      return false;
    }
    popup.document.write(
      `<!doctype html><title>${escapeHtml(doc.name)}</title>` +
        '<style>body{margin:0;display:flex;justify-content:center}' +
        'img{max-width:100%}</style>' +
        `<img src="${doc.uri}" onload="window.focus();window.print()">`,
    );
    popup.document.close();
    return true;
  }
  const popup = browser.open(doc.uri, '_blank');
  if (!popup) {
    return false;
  }
  popup.addEventListener('load', () => {
    popup.focus();
    popup.print();
  });
  return true;
}
