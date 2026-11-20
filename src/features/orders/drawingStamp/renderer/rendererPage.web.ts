/**
 * The page inside the Android app's hidden drawing WebView: the web build's
 * drawing code (pdf.js, blanking the customer's details), answering
 * RenderRequests. Built into android/app/src/main/assets/drawing-renderer by
 * scripts/build-drawing-renderer.js.
 */
import * as pdfjs from 'pdfjs-dist';
import workerSource from 'pdfjs-dist/build/pdf.worker.min.mjs';
import {
  forgetPickedFile,
  rememberPickedFile,
  type PickedBlob,
} from '../../../../services/files/pickedFiles';
import { drawingThumbnail } from '../stampDrawing.web';
import type { RenderRequest, RendererMessage } from './protocol';

type Page = {
  addEventListener: (
    type: 'message',
    listener: (e: { data: unknown }) => void,
  ) => void;
  document: Page;
  ReactNativeWebView?: { postMessage: (message: string) => void };
  Blob: new (parts: unknown[], options: { type: string }) => PickedBlob;
  URL: { createObjectURL: (blob: unknown) => string };
  Worker: new (url: string, options: { type: 'module' }) => unknown;
  fetch: (url: string) => Promise<{ blob: () => Promise<unknown> }>;
};
const page = globalThis as unknown as Page;

// The page is a local file, which can't start a worker from a file; this
// bundle carries the worker's code (see the build script) and starts it from
// a blob instead.
pdfjs.GlobalWorkerOptions.workerPort = new page.Worker(
  page.URL.createObjectURL(
    new page.Blob([workerSource], { type: 'text/javascript' }),
  ),
  { type: 'module' },
) as never;

const reply = (message: RendererMessage) =>
  page.ReactNativeWebView?.postMessage(JSON.stringify(message));

async function render({
  id,
  data,
  type,
  name,
  company,
  pixels,
  qr,
}: RenderRequest) {
  const bytes = await (await page.fetch(data)).blob();
  rememberPickedFile(id, new page.Blob([bytes], { type }));
  try {
    return await drawingThumbnail(
      { id, name, sizeBytes: 0 },
      company,
      pixels,
      qr,
    );
  } finally {
    forgetPickedFile(id);
  }
}

// Android delivers the app's messages on document, iOS on window.
const seen = new Set<string>();
const onMessage = ({ data }: { data: unknown }) => {
  let request: RenderRequest;
  try {
    request = JSON.parse(String(data));
  } catch {
    return;
  }
  if (!request?.id || seen.has(request.id)) {
    return;
  }
  seen.add(request.id);
  render(request)
    .then(uri => reply({ type: 'rendered', id: request.id, uri }))
    .catch(error =>
      reply({ type: 'failed', id: request.id, error: String(error) }),
    );
};
page.addEventListener('message', onMessage);
page.document.addEventListener('message', onMessage);

reply({ type: 'ready' });
