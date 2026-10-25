/**
 * The bytes behind each picked Attachment, by its id, until it is uploaded.
 * Web pickers remember the browser File here; the native stand-in pickers
 * have no bytes, so their attachments can't be uploaded.
 */
export type PickedBlob = { name: string; size: number; type: string };

const picked = new Map<string, PickedBlob>();

export function rememberPickedFile(id: string, file: PickedBlob) {
  picked.set(id, file);
}

export function pickedFile(id: string): PickedBlob | undefined {
  return picked.get(id);
}

export function forgetPickedFile(id: string) {
  picked.delete(id);
}
