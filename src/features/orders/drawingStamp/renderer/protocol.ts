/**
 * Messages between the app and the hidden WebView that draws PDF drawings on
 * Android (DrawingRendererHost), as JSON strings.
 */

import type { DrawingQr, StampedPreview } from '../types';

/**
 * App → page: draw this drawing. `thumbnail` (the default): its first page
 * as one image `pixels` long. `preview`: every page with `qr` stamped on, as
 * it prints (StampedPreview).
 */
export type RenderRequest = {
  id: string;
  kind?: 'thumbnail' | 'preview';
  /** The file as a data URL, downloaded by the app (S3 refuses the page). */
  data: string;
  /** application/pdf, image/png or image/jpeg. */
  type: string;
  name: string;
  /** The customer whose name, address and logo are blanked. */
  company: string;
  /** The thumbnail's longer side. */
  pixels: number;
  /** Stamped on as it prints, when given; a preview always has one. */
  qr?: DrawingQr;
};

/** Page → app. */
export type RendererMessage =
  | { type: 'ready' }
  | { type: 'rendered'; id: string; uri: string | null }
  | { type: 'previewed'; id: string; preview: StampedPreview | null }
  | { type: 'failed'; id: string; error: string };
