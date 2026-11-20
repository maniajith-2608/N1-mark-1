/**
 * Messages between the app and the hidden WebView that draws PDF drawings on
 * Android (DrawingRendererHost), as JSON strings.
 */

import type { DrawingQr } from '../types';

/** App → page: draw this drawing's first page. */
export type RenderRequest = {
  id: string;
  /** The file as a data URL, downloaded by the app (S3 refuses the page). */
  data: string;
  /** application/pdf, image/png or image/jpeg. */
  type: string;
  name: string;
  /** The customer whose name, address and logo are blanked. */
  company: string;
  /** The image's longer side. */
  pixels: number;
  /** Stamped on as it prints, when given. */
  qr?: DrawingQr;
};

/** Page → app. */
export type RendererMessage =
  | { type: 'ready' }
  | { type: 'rendered'; id: string; uri: string | null }
  | { type: 'failed'; id: string; error: string };
