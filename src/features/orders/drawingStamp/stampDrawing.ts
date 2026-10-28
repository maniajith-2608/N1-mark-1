import type { Attachment } from '../../../shared/types';
import type { StampedDrawing, StampedPreview } from './types';

/**
 * Native: drawings aren't drawn on the device yet, so nothing is stamped and
 * the drawing prints as a sheet with the order's QR instead.
 */
export async function stampDrawing(
  _doc: Attachment,
  _qrValue: string,
  _company?: string,
): Promise<StampedDrawing | null> {
  return null;
}

/** Native: nothing is stamped, so there is nothing to preview. */
export async function stampedPreview(
  _doc: Attachment,
  _qrValue: string,
  _company?: string,
): Promise<StampedPreview | null> {
  return null;
}

/** Native: no thumbnail yet; the placeholder part shows instead. */
export async function drawingThumbnail(_doc: Attachment): Promise<null> {
  return null;
}
