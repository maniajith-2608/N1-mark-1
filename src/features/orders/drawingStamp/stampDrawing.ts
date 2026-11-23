import type { Attachment } from '../../../shared/types';
import {
  renderDrawingImage,
  renderStampedPreview,
} from './renderer/renderDrawing';
import type { DrawingQr, StampedDrawing, StampedPreview } from './types';

/**
 * Native: no stamped PDF file is made on the device (phones don't print or
 * save files yet), so the drawing prints as a sheet with the order's QR.
 */
export async function stampDrawing(
  _doc: Attachment,
  _qrValue: string,
  _company?: string,
  _label?: string,
): Promise<StampedDrawing | null> {
  return null;
}

/**
 * Every page as it prints, as images: the order QR stamped on, the
 * customer's details (`company`) blanked, as on web. Drawn by the web code
 * in the hidden WebView (Android); null on iOS for now and for files that
 * can't be drawn (DWG, STEP…).
 */
export function stampedPreview(
  doc: Attachment,
  qrValue: string,
  company = '',
  label = '',
): Promise<StampedPreview | null> {
  return renderStampedPreview(doc, { value: qrValue, label }, company);
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
