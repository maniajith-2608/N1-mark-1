import { Linking } from 'react-native';
import type { Attachment } from '../../shared/types';

/**
 * iOS / Android: a stored file's link opens in the phone's browser, which
 * shows or downloads it. Other files (picked on the device, not uploaded)
 * have no viewer yet, so nothing opens and callers explain that instead.
 * The web build uses viewDocument.web.ts.
 */
export function openDocument(doc: Attachment): boolean {
  if (!doc.uri || !/^https?:\/\//i.test(doc.uri)) {
    return false;
  }
  Linking.openURL(doc.uri).catch(() => undefined);
  return true;
}

export type ReservedTab = {
  open: (uri: string) => boolean;
  show: (title: string, body: string) => void;
  close: () => void;
};

/** Phones have no browser tabs to hold open. */
export function reserveTab(): ReservedTab | null {
  return null;
}

/** As openDocument: printing isn't available on phones yet. */
export function printDocument(_doc: Attachment): boolean {
  return false;
}
