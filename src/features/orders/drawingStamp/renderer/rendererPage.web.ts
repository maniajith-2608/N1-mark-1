/**
 * The page inside the Android app's hidden drawing WebView: the web build's
 * drawing code (pdf.js, blanking the customer's details), answering
 * RenderRequests. Built into android/app/src/main/assets/drawing-renderer by
 * scripts/build-drawing-renderer.js.
 */
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs';
import {
  forgetPickedFile,
  rememberPickedFile,
  type PickedBlob,
} from '../../../../services/files/pickedFiles';
import { drawingThumbnail, stampedPreview } from '../stampDrawing.web';
import type { RenderRequest, RendererMessage } from './protocol';

type Page = {
  addEventListener: (
    type: 'message',
    listener: (e: { data: unknown }) => void,
  ) => void;
  document: Page;
  ReactNativeWebView?: { postMessage: (message: string) => void };
  Blob: new (parts: unknown[], options: { type: string }) => PickedBlob;
  fetch: (url: string) => Promise<{ blob: () => Promise<unknown> }>;
  pdfjsWorker?: typeof pdfjsWorker;
};
const page = globalThis as unknown as Page;

// pdf.js runs its worker code on this page instead of in a Web Worker. The
// page is a local file, and WebView won't start a worker from a file or from
// a blob made on it, so a worker never starts and every drawing hangs. One
// shared worker port also broke after the first document was closed. With
// the handler here, pdf.js gives each document its own in-page worker.
page.pdfjsWorker = pdfjsWorker;

const reply = (message: RendererMessage) =>
  page.ReactNativeWebView?.postMessage(JSON.stringify(message));

async function render({
  id,
  kind,
  data,
  type,
  name,
  company,
  pixels,
  qr,
}: RenderRequest): Promise<RendererMessage> {
  const bytes = await (await page.fetch(data)).blob();
  rememberPickedFile(id, new page.Blob([bytes], { type }));
  const doc = { id, name, sizeBytes: 0 };
  try {
    if (kind === 'preview' && qr) {
      const preview = await stampedPreview(doc, qr.value, company, qr.label);
      return { type: 'previewed', id, preview };
    }
    const uri = await drawingThumbnail(doc, company, pixels, qr);
    return { type: 'rendered', id, uri };
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
    .then(reply)
    .catch(error =>
      reply({ type: 'failed', id: request.id, error: String(error) }),
    );
};
page.addEventListener('message', onMessage);
page.document.addEventListener('message', onMessage);

reply({ type: 'ready' });
