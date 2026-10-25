import type { Attachment } from '../../shared/types';
import { rememberPickedFile } from './pickedFiles';

// The project builds without the DOM typings; just what this file touches.
type PickedFile = { name: string; size: number; type: string };
type FileInput = {
  type: string;
  accept: string;
  multiple: boolean;
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
  URL?: { createObjectURL?: (file: PickedFile) => string };
};
const browser = globalThis as unknown as Browser;

/**
 * Something to show the file from: images as a data URL (kept with the
 * record); PDFs as a link to the picked file, valid until the page reloads.
 */
async function previewUri(file: PickedFile): Promise<string | undefined> {
  if (file.type.startsWith('image/')) {
    return readAsDataUrl(file);
  }
  if (file.type === 'application/pdf') {
    return browser.URL?.createObjectURL?.(file);
  }
  return undefined;
}

/** Images, PDFs and office documents. */
const ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';

const readAsDataUrl = (file: PickedFile) =>
  new Promise<string>((resolve, reject) => {
    const reader = new browser.FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

type ChooseOptions = { accept?: string; multiple?: boolean };

/**
 * Opens the browser's file chooser. Images come back with a data URL so they
 * can be previewed. Resolves empty when the chooser is closed without a
 * choice.
 */
export function chooseFiles(
  kind: string,
  { accept = ACCEPT, multiple = false }: ChooseOptions = {},
): Promise<Attachment[]> {
  return new Promise(resolve => {
    const input = browser.document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.addEventListener('cancel', () => resolve([]));
    input.addEventListener('change', async () => {
      const files = Array.from(input.files ?? []);
      const stamp = Date.now();
      resolve(
        await Promise.all(
          files.map(async (file, i) => {
            const id = `${kind}-${stamp}-${i}`;
            // Kept for the upload when the record is saved.
            rememberPickedFile(id, file);
            return {
              id,
              name: file.name,
              kind,
              sizeBytes: file.size,
              uri: await previewUri(file),
            };
          }),
        ),
      );
    });
    input.click();
  });
}

/** Any number of documents (images, PDFs, office files). */
export function pickFiles(kind: string): Promise<Attachment[]> {
  return chooseFiles(kind, { multiple: true });
}
