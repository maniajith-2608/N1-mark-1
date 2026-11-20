import type { Attachment } from '../../../shared/types';
import { renderDrawingImage } from './renderer/renderDrawing';
import type { DrawingQr, StampedDrawing, StampedPreview } from './types';

/**
 * Native: drawings aren't drawn on the device yet, so nothing is stamped and
 * the drawing prints as a sheet with the order's QR instead.
 */
export async function stampDrawing(
  _doc: Attachment,
  _qrValue: string,
  _company?: string,
  _label?: string,
): Promise<StampedDrawing | null> {
  return null;
}

/** Native: nothing is stamped, so there is nothing to preview. */
export async function stampedPreview(
  _doc: Attachment,
  _qrValue: string,
  _company?: string,
  _label?: string,
): Promise<StampedPreview | null> {
  return null;
}

/**
 * The drawing's first page as an image, `pixels` long on its longer side,
 * with the customer's details (`company`) blanked and, given `qr`, the order
 * QR stamped on, as on web: drawn by the web code in a hidden WebView
 * (Android). Without `qr`, a picture is shown as uploaded, at its original
 * quality. Null for files that can't be drawn (DWG, STEP…), and on iOS for
 * now: the placeholder part shows instead.
 */
export function drawingThumbnail(
  doc: Attachment,
  company = '',
  pixels?: number,
  qr?: DrawingQr,
): Promise<string | null> {
  return renderDrawingImage(doc, company, pixels, qr);
}

/** Native: nothing is masked; the stored file opens as it is. */
export async function maskedDrawing(
  _doc: Attachment,
  _company: string,
): Promise<string | null> {
  return null;
}
