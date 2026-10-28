import { apiClient, ApiError } from '../../api';
import {
  fileDownloadUrl,
  toFileReference,
  uploadAttachment,
  uploadIdempotencyKey,
  uploadTarget,
} from '../fileStorage';
import { pickedFile, rememberPickedFile } from '../pickedFiles';

jest.mock('../../api', () => ({
  ...jest.requireActual('../../api'),
  apiClient: { post: jest.fn() },
}));
const post = apiClient.post as jest.Mock;

type Form = { fields: [string, unknown][]; append: jest.Mock };
const g = globalThis as unknown as {
  FormData?: unknown;
  fetch?: unknown;
};
const original = { FormData: g.FormData, fetch: g.fetch };
let forms: Form[];
let fetchMock: jest.Mock;

beforeEach(() => {
  post.mockReset();
  forms = [];
  g.FormData = function FormData(this: Form) {
    this.fields = [];
    this.append = jest.fn((name, value) => this.fields.push([name, value]));
    forms.push(this);
  };
  fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 204 });
  g.fetch = fetchMock;
});

afterAll(() => Object.assign(g, original));

const doc = {
  id: 'drawing-1',
  name: 'Flange.dwg',
  kind: 'Design',
  sizeBytes: 9,
};

test('an attachment already on the backend passes through as its reference', async () => {
  const stored = { id: 'f1', name: 'PO.pdf', sizeBytes: 3 };

  await expect(uploadAttachment('sales_order', 'o1', stored)).resolves.toEqual(
    toFileReference(stored),
  );
  expect(post).not.toHaveBeenCalled();
});

test('a picked file is uploaded with the form fields first and the file last', async () => {
  const file = { name: 'Flange.dwg', size: 9, type: '' };
  rememberPickedFile(doc.id, file);
  post.mockResolvedValueOnce({
    data: {
      file: { id: 'f9', name: 'Flange.dwg', sizeBytes: 9 },
      upload: { url: 'http://minio/bucket', fields: { key: 'k', Policy: 'p' } },
    },
  });

  const ref = await uploadAttachment('job_card', 'j1', doc);

  expect(ref).toEqual({
    id: 'f9',
    name: 'Flange.dwg',
    kind: 'Design',
    sizeBytes: 9,
  });
  // CAD files often come without a browser type: it's taken from the extension.
  expect(post.mock.calls[0][1]).toMatchObject({
    entityType: 'job_card',
    entityId: 'j1',
    contentType: 'image/vnd.dwg',
    sizeBytes: 9,
  });
  expect(forms[0].fields).toEqual([
    ['key', 'k'],
    ['Policy', 'p'],
    ['file', file],
  ]);
  expect(fetchMock).toHaveBeenCalledWith('http://minio/bucket', {
    method: 'POST',
    body: forms[0],
  });
  expect(pickedFile(doc.id)).toBeUndefined();
});

test('a failed storage upload rejects and keeps the file for a retry', async () => {
  rememberPickedFile('retry-1', {
    name: 'a.pdf',
    size: 1,
    type: 'application/pdf',
  });
  post.mockResolvedValueOnce({
    data: {
      file: { id: 'f1', name: 'a.pdf', sizeBytes: 1 },
      upload: { url: 'u', fields: {} },
    },
  });
  fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });

  await expect(
    uploadAttachment('user', 'u1', {
      id: 'retry-1',
      name: 'a.pdf',
      sizeBytes: 1,
    }),
  ).rejects.toThrow('Upload failed (403)');
  expect(pickedFile('retry-1')).toBeDefined();
});

test('fileDownloadUrl waits while a new upload is still being checked', async () => {
  jest.useFakeTimers();
  post
    .mockRejectedValueOnce(
      new ApiError('still checked', 409, undefined, { code: 'FILE_NOT_READY' }),
    )
    .mockResolvedValueOnce({ data: { url: 'https://signed' } });

  const url = fileDownloadUrl('f1');
  await jest.runAllTimersAsync();

  await expect(url).resolves.toBe('https://signed');
  expect(post).toHaveBeenCalledWith('/files/f1/download-url');
  jest.useRealTimers();
});

test('fileDownloadUrl passes other errors straight through', async () => {
  post.mockRejectedValueOnce(
    new ApiError('gone', 404, undefined, { code: 'NOT_FOUND' }),
  );

  await expect(fileDownloadUrl('f1')).rejects.toThrow('gone');
  expect(post).toHaveBeenCalledTimes(1);
});

test('the upload idempotency key keeps to the characters the backend allows', () => {
  const entityId = '01a18444-dc54-74e7-8fbc-5c0e6a26e97d';
  expect(uploadIdempotencyKey(entityId, 'Design file-1793220400789-0')).toBe(
    `upload-${entityId}-Design_file-1793220400789-0`,
  );
  const long = uploadIdempotencyKey(entityId, `${'x'.repeat(200)}-42`);
  expect(long).toHaveLength(128);
  expect(long.endsWith('-42')).toBe(true);
  expect(long).toMatch(/^[A-Za-z0-9._:-]+$/);
});

test('in web dev the upload goes through the S3 proxy; otherwise straight to S3', () => {
  const url = 'https://bucket.s3.ap-south-1.amazonaws.com/';
  expect(uploadTarget(url, '/s3')).toBe(
    '/s3/bucket.s3.ap-south-1.amazonaws.com/',
  );
  expect(uploadTarget(url, '')).toBe(url);
});
