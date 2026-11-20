import { Platform } from 'react-native';
import { fileDownloadUrl } from '../../../../services/files/fileStorage';
import type { Attachment } from '../../../../shared/types';
import { DRAWING_QR } from '../../constants';
import type { DrawingQr } from '../types';
import type { RenderRequest, RendererMessage } from './protocol';

/**
 * Native side of the drawing WebView: requests wait here until
 * DrawingRendererHost has loaded the page, then go to it one by one.
 */

/** A drawing that hasn't come back by then is given up (placeholder). */
const RENDER_TIMEOUT_MS = 60000;

const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

type Pending = {
  resolve: (uri: string | null) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

let send: ((message: string) => void) | null = null;
let waiting: (() => void)[] = [];
const pending = new Map<string, Pending>();
let nextId = 0;

/** The host's page is ready (`post` sends to it) or gone (null). */
export function setRendererPage(post: ((message: string) => void) | null) {
  send = post;
  if (post) {
    const ready = waiting;
    waiting = [];
    ready.forEach(go => go());
  } else {
    // The WebView reloaded or died: what it was drawing is lost.
    pending.forEach(p => {
      clearTimeout(p.timer);
      p.reject(new Error('Drawing renderer restarted'));
    });
    pending.clear();
  }
}

/** A message from the host's page. */
export function onRendererMessage(raw: string) {
  let message: RendererMessage;
  try {
    message = JSON.parse(raw);
  } catch {
    return;
  }
  if (message.type === 'ready') {
    return;
  }
  const p = pending.get(message.id);
  if (!p) {
    return;
  }
  pending.delete(message.id);
  clearTimeout(p.timer);
  if (message.type === 'rendered') {
    p.resolve(message.uri);
  } else {
    p.reject(new Error(message.error));
  }
}

const pageReady = () =>
  send ? Promise.resolve() : new Promise<void>(go => waiting.push(go));

function request(body: Omit<RenderRequest, 'id'>): Promise<string | null> {
  const id = `drawing-${++nextId}`;
  return pageReady().then(
    () =>
      new Promise<string | null>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error('Drawing took too long'));
        }, RENDER_TIMEOUT_MS);
        pending.set(id, { resolve, reject, timer });
        send?.(JSON.stringify({ id, ...body }));
      }),
  );
}

/** The stored file's bytes as a base64 data URL of `type`. */
async function downloadAsDataUrl(doc: Attachment, type: string) {
  const url = doc.uri ?? (await fileDownloadUrl(doc.id));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Drawing download failed');
  }
  const blob = await response.blob();
  const read = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Drawing download failed'));
    reader.readAsDataURL(blob);
  });
  // S3 may label it binary/octet-stream; the bytes are what matter.
  return `data:${type};base64,${read.slice(read.indexOf(',') + 1)}`;
}

/**
 * The drawing's first page as an image `pixels` long, customer details
 * blanked and, given `qr`, the order QR stamped on (see stampDrawing.ts).
 * Android only for now; null elsewhere.
 */
export async function renderDrawingImage(
  doc: Attachment,
  company: string,
  pixels: number = DRAWING_QR.thumbnailPixels,
  qr?: DrawingQr,
): Promise<string | null> {
  if (doc.uri?.startsWith('data:image')) {
    return doc.uri;
  }
  if (Platform.OS !== 'android') {
    return null;
  }
  const extension = doc.name.split('.').pop()?.toLowerCase() ?? '';
  // Without a QR, a picture is shown as uploaded, at its original quality.
  // With a QR it is stamped like a PDF.
  const imageType = IMAGE_TYPES[extension];
  if (imageType && !qr) {
    return downloadAsDataUrl(doc, imageType);
  }
  const type = imageType ?? (extension === 'pdf' ? 'application/pdf' : '');
  if (!type) {
    return null;
  }
  const data = await downloadAsDataUrl(doc, type);
  return request({ data, type, name: doc.name, company, pixels, qr });
}
