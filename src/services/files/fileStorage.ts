import { apiClient, ApiError } from '../api';
import type { Attachment } from '../../shared/types';
import { forgetPickedFile, pickedFile, type PickedBlob } from './pickedFiles';
import { openDocument } from './viewDocument';

// N1 Core files (guide section 5, rule 7): POST /files/upload-url returns a
// presigned POST; send its form fields first and the file last, then put the
// file reference into GraphQL. Open a file with POST /files/:id/download-url.

/** What a file belongs to; the backend checks the caller may change it. */
export type FileEntityType =
  | 'customer'
  | 'sales_order'
  | 'job_card'
  | 'qc_check'
  | 'invoice'
  | 'quote'
  | 'machine'
  | 'user'
  | 'organisation';

/** AppFileReference / AppFileReferenceInput on the wire. */
export type FileReference = {
  id: string;
  name: string;
  kind: string | null;
  sizeBytes: number;
};

type UploadUrlResponse = {
  file: { id: string; name: string; sizeBytes: number };
  upload: { url: string; fields: Record<string, string> };
};

type FormDataLike = { append: (name: string, value: unknown) => void };
type Browser = {
  FormData: new () => FormDataLike;
  fetch: (
    url: string,
    init: { method: string; body: FormDataLike },
  ) => Promise<{ ok: boolean; status: number }>;
};
const browser = globalThis as unknown as Browser;

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  dxf: 'image/vnd.dxf',
  dwg: 'image/vnd.dwg',
  step: 'model/step',
  stp: 'model/step',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** The browser's type, or one from the extension (CAD files often have none). */
function contentTypeOf(file: PickedBlob): string {
  if (file.type) {
    return file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

/** An attachment that already lives on the backend, as its reference. */
export const toFileReference = (doc: Attachment): FileReference => ({
  id: doc.id,
  name: doc.name,
  kind: doc.kind ?? null,
  sizeBytes: doc.sizeBytes,
});

export const fromFileReference = (ref: FileReference): Attachment => ({
  id: ref.id,
  name: ref.name,
  kind: ref.kind ?? undefined,
  sizeBytes: ref.sizeBytes,
});

/**
 * Uploads a freshly picked attachment and returns its file reference. An
 * attachment that is already on the backend (nothing picked under its id)
 * comes back as its reference, untouched.
 */
export async function uploadAttachment(
  entityType: FileEntityType,
  entityId: string,
  doc: Attachment,
): Promise<FileReference> {
  const file = pickedFile(doc.id);
  if (!file) {
    return toFileReference(doc);
  }
  const { data } = await apiClient.post<UploadUrlResponse>(
    '/files/upload-url',
    {
      entityType,
      entityId,
      name: file.name,
      contentType: contentTypeOf(file),
      sizeBytes: file.size,
    },
    // Picked ids carry the kind ("Design file-…"); the backend refuses spaces.
    {
      headers: {
        'Idempotency-Key': `upload-${entityId}-${doc.id}`.replace(
          /[^A-Za-z0-9_-]/g,
          '_',
        ),
      },
    },
  );
  const form = new browser.FormData();
  Object.entries(data.upload.fields).forEach(([name, value]) =>
    form.append(name, value),
  );
  form.append('file', file);
  const response = await browser.fetch(data.upload.url, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    throw new ApiError(`Upload failed (${response.status})`, response.status);
  }
  forgetPickedFile(doc.id);
  return {
    id: data.file.id,
    name: data.file.name,
    kind: doc.kind ?? null,
    sizeBytes: data.file.sizeBytes,
  };
}

/** Uploads each newly picked attachment; existing ones pass through. */
export function uploadAttachments(
  entityType: FileEntityType,
  entityId: string,
  docs: readonly Attachment[],
): Promise<FileReference[]> {
  return Promise.all(
    docs.map(doc => uploadAttachment(entityType, entityId, doc)),
  );
}

/** A new upload is virus-checked first; the download link waits for that. */
const NOT_READY_RETRIES = 5;
const NOT_READY_WAIT_MS = 1500;

/** A short-lived link to a stored file (POST /files/:id/download-url). */
export async function fileDownloadUrl(fileId: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const { data } = await apiClient.post<{ url: string }>(
        `/files/${fileId}/download-url`,
      );
      return data.url;
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.code !== 'FILE_NOT_READY' ||
        attempt >= NOT_READY_RETRIES
      ) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, NOT_READY_WAIT_MS));
    }
  }
}

/**
 * Opens an attachment: a freshly picked one from its preview, a stored one
 * through a download link. False when there's nothing to open.
 */
export async function openStoredFile(doc: Attachment): Promise<boolean> {
  if (doc.uri) {
    return openDocument(doc);
  }
  return openDocument({ ...doc, uri: await fileDownloadUrl(doc.id) });
}
