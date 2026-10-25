import type { Attachment } from '../../shared/types';
import { rememberPickedFile } from './pickedFiles';

// The project builds without the DOM typings; just what this file touches.
type PickedFile = { name: string; size: number; type: string };
type FileInput = {
  type: string;
  accept: string;
  files: ArrayLike<PickedFile> | null;
  addEventListener: (event: 'change' | 'cancel', cb: () => void) => void;
  click: () => void;
};
type Reader = {
  result: unknown;
  error: unknown;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  readAsDataURL: (file: PickedFile) => void;
};
type Browser = {
  document: { createElement: (tag: 'input') => FileInput };
  FileReader: new () => Reader;
};
const browser = globalThis as unknown as Browser;

const readAsDataUrl = (file: PickedFile) =>
  new Promise<string>((resolve, reject) => {
    const reader = new browser.FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/**
 * Opens the browser's file chooser for one image. Resolves null when the
 * chooser is closed without a choice.
 */
export function pickImage(kind: string): Promise<Attachment | null> {
  return new Promise(resolve => {
    const input = browser.document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('cancel', () => resolve(null));
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const id = `${kind}-${Date.now()}`;
      // Kept for the upload when the record is saved.
      rememberPickedFile(id, file);
      resolve({
        id,
        name: file.name,
        kind,
        sizeBytes: file.size,
        uri: await readAsDataUrl(file),
      });
    });
    input.click();
  });
}
