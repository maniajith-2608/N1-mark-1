import { Platform } from 'react-native';
import { delay } from '../mock/mockServer';
import type { Attachment } from '../../shared/types';

/**
 * Stand-in file picker for iOS / Android: no picker library is installed
 * yet, so this returns a sample file after a short delay. Swap the body for
 * react-native-document-picker when one is chosen. The web build uses
 * pickDocument.web.ts, which opens the real file chooser.
 */
export async function pickDocument(
  kind: string,
  sampleName: string,
  _accept?: string,
): Promise<Attachment | null> {
  await delay();
  return {
    id: `${kind}-${Date.now()}`,
    name: sampleName,
    kind,
    sizeBytes: Platform.OS === 'web' ? 640 * 1024 : 512 * 1024,
  };
}

/** Stand-in for picking several files: one sample file, as above. */
export async function pickDocuments(
  kind: string,
  sampleName: string,
  accept?: string,
): Promise<Attachment[]> {
  const file = await pickDocument(kind, sampleName, accept);
  return file ? [file] : [];
}
