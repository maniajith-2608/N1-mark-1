import { useEffect, useState } from 'react';
import type { Attachment } from '../../../shared/types';
import { DRAWING_QR } from '../constants';
import { drawingThumbnail, type DrawingQr } from '../drawingStamp';

// Thumbnails by file, customer and size: a stored drawing is downloaded and
// drawn once for each customer whose details it blanks, at each size.
const thumbnails = new Map<string, Promise<string | null>>();

// A failed download (a network blip, an expired session) is tried again
// once, then forgotten so the next view retries instead of keeping the
// placeholder for the rest of the session.
function thumbnailOf(
  doc: Attachment,
  company: string,
  pixels: number,
  qr?: DrawingQr,
) {
  const key = [doc.id, company, pixels, qr?.value, qr?.label].join('\n');
  let thumbnail = thumbnails.get(key);
  if (!thumbnail) {
    thumbnail = drawingThumbnail(doc, company, pixels, qr)
      .catch(() => drawingThumbnail(doc, company, pixels, qr))
      .catch(() => {
        thumbnails.delete(key);
        return null;
      });
    thumbnails.set(key, thumbnail);
  }
  return thumbnail;
}

/**
 * The drawing's first page as an image, `pixels` long on its longer side
 * (thumbnail size unless given), once drawn, with the customer's
 * (`company`) name, address and logo blanked and, given `qr`, the order QR
 * stamped on as it prints; null until then, and for files that can't be
 * drawn (the placeholder shows instead).
 */
export function useDrawingThumbnail(
  doc: Attachment | undefined,
  company: string,
  pixels: number = DRAWING_QR.thumbnailPixels,
  qr?: DrawingQr,
) {
  const qrValue = qr?.value;
  const qrLabel = qr?.label;
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    setUri(null);
    if (!doc) {
      return;
    }
    let current = true;
    const stamp =
      qrValue === undefined
        ? undefined
        : { value: qrValue, label: qrLabel ?? '' };
    thumbnailOf(doc, company, pixels, stamp).then(
      next => current && setUri(next),
    );
    return () => {
      current = false;
    };
  }, [doc, company, pixels, qrValue, qrLabel]);
  return uri;
}
