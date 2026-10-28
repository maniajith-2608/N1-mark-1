import { PDFDocument, degrees, rgb, type PDFPage } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs';
import { lightTheme } from '../../../theme';
import { fileDownloadUrl } from '../../../services/files/fileStorage';
import { pickedFile } from '../../../services/files/pickedFiles';
import type { Attachment } from '../../../shared/types';
import { DRAWING_QR } from '../constants';
import { qrPath } from '../components/QrCode';
import {
  clearInk,
  companyAreas,
  joinLines,
  type Box,
  type TextLine,
} from './companyArea';
import { findQrSpot, inkMapFromPixels, type QrSpot } from './findQrSpot';
import type { StampedDrawing, StampedPreview } from './types';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// The project builds without the DOM typings; just what this file touches.
type Context2D = {
  getImageData: (
    x: number,
    y: number,
    w: number,
    h: number,
  ) => { data: ArrayLike<number> };
};
type Canvas = {
  width: number;
  height: number;
  getContext: (type: '2d', options?: object) => Context2D | null;
  toDataURL: (type: string) => string;
};
type BlobLike = { arrayBuffer: () => Promise<ArrayBuffer>; type: string };
type Browser = {
  document: { createElement: (tag: 'canvas') => Canvas };
  fetch: (
    url: string,
  ) => Promise<{ ok: boolean; blob: () => Promise<BlobLike> }>;
  Blob: new (parts: unknown[], options: { type: string }) => BlobLike;
  URL: { createObjectURL: (blob: BlobLike) => string };
};
const browser = globalThis as unknown as Browser;

const PT_PER_MM = 72 / 25.4;
const PDF_TYPE = 'application/pdf';
const IMAGE_TYPES = ['image/png', 'image/jpeg'];
const EXTENSION_TYPES: Record<string, string> = {
  pdf: PDF_TYPE,
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

/** "#rrggbb" → pdf-lib colour. */
const toRgb = (hex: string) => {
  const channel = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
  return rgb(channel(1), channel(3), channel(5));
};

/** The drawing's bytes: picked this session, or fetched from file storage. */
async function drawingBlob(doc: Attachment): Promise<BlobLike> {
  const picked = pickedFile(doc.id) as BlobLike | undefined;
  if (picked) {
    return picked;
  }
  const url = doc.uri ?? (await fileDownloadUrl(doc.id));
  const response = await browser.fetch(url);
  if (!response.ok) {
    throw new Error('Drawing download failed');
  }
  return response.blob();
}

const typeOf = (doc: Attachment, blob: BlobLike) =>
  [PDF_TYPE, ...IMAGE_TYPES].includes(blob.type)
    ? blob.type
    : EXTENSION_TYPES[doc.name.split('.').pop()?.toLowerCase() ?? ''];

/**
 * A picture drawing becomes a one-page PDF whose longer side is that of an
 * A3 sheet, so the QR comes out the same size as on a PDF drawing.
 */
async function imageAsPdf(blob: BlobLike, type: string) {
  const pdf = await PDFDocument.create();
  const bytes = await blob.arrayBuffer();
  const image =
    type === 'image/png'
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);
  const scale =
    (DRAWING_QR.imageSheetMm * PT_PER_MM) / Math.max(image.width, image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
  return pdf.save();
}

/** Draws a page `pixels` long on its longer side, on a fresh canvas. */
async function renderPage(page: pdfjs.PDFPageProxy, pixels: number) {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({
    scale: pixels / Math.max(base.width, base.height),
  });
  const canvas = browser.document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas unavailable');
  }
  await page.render({ canvasContext: context as never, viewport }).promise;
  return { canvas, context, viewport };
}

type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

/** The page's text as lines, with their boxes in viewport pixels. */
async function textLines(
  page: pdfjs.PDFPageProxy,
  viewport: pdfjs.PageViewport,
): Promise<TextLine[]> {
  const { items } = await page.getTextContent();
  const boxes = (items as TextItem[])
    .filter(item => item.str.trim())
    .map(({ str, transform: [, , , , x, y], width, height }) => {
      const [x0, y0, x1, y1] = viewport.convertToViewportRectangle([
        x,
        y,
        x + width,
        y + height,
      ]);
      const box = {
        x0: Math.floor(Math.min(x0, x1)),
        y0: Math.floor(Math.min(y0, y1)),
        x1: Math.ceil(Math.max(x0, x1)),
        y1: Math.ceil(Math.max(y0, y1)),
      };
      return { text: str, box };
    });
  return joinLines(boxes);
}

/**
 * Draws the page small, finds the company's details to blank (when a
 * company is given) and room for a QR, in pixels. Blanked areas count as
 * paper, so the QR may go there.
 */
async function spotOnPage(page: pdfjs.PDFPageProxy, company: string) {
  const { canvas, context, viewport } = await renderPage(
    page,
    DRAWING_QR.mapPixels,
  );
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const drawn = inkMapFromPixels(data, canvas.width, canvas.height);
  const hidden = company
    ? companyAreas(drawn, await textLines(page, viewport), company)
    : [];
  const map = clearInk(drawn, hidden);
  const px = (mm: number) => Math.round(mm * PT_PER_MM * viewport.scale);
  const spot = findQrSpot(map, {
    preferred: px(DRAWING_QR.preferredMm),
    min: px(DRAWING_QR.minMm),
    gap: px(DRAWING_QR.gapMm),
    margin: px(DRAWING_QR.marginMm),
  });
  return { spot, hidden, viewport };
}

/** Paints `box` (viewport pixels) white on the PDF page. */
function blankOut(page: PDFPage, box: Box, viewport: pdfjs.PageViewport) {
  const [x0, y0] = viewport.convertToPdfPoint(box.x0, box.y0);
  const [x1, y1] = viewport.convertToPdfPoint(box.x1 + 1, box.y1 + 1);
  page.drawRectangle({
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0),
    color: toRgb(lightTheme.colors.qrBackground),
  });
}

/**
 * Draws the QR (on its white quiet zone) where `spot` is on screen. The
 * corners map through the viewport, so a rotated page gets an upright code.
 */
function drawQr(
  page: PDFPage,
  spot: QrSpot,
  viewport: pdfjs.PageViewport,
  qrValue: string,
) {
  const { path, modules } = qrPath(qrValue);
  const [x0, y0] = viewport.convertToPdfPoint(spot.x, spot.y);
  const [x1, y1] = viewport.convertToPdfPoint(spot.x + spot.size, spot.y);
  const side = Math.hypot(x1 - x0, y1 - y0);
  const options = {
    x: x0,
    y: y0,
    scale: side / modules,
    rotate: degrees((Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI),
  };
  const { colors } = lightTheme;
  page.drawSvgPath(`M0 0h${modules}v${modules}h-${modules}z`, {
    ...options,
    color: toRgb(colors.qrBackground),
  });
  page.drawSvgPath(path, { ...options, color: toRgb(colors.qrForeground) });
}

/**
 * The stamped PDF's bytes, or null for files that can't be drawn here.
 * `company`: the customer, whose name, address and logo are blanked.
 */
async function stampedBytes(doc: Attachment, qrValue: string, company: string) {
  const blob = await drawingBlob(doc);
  const type = typeOf(doc, blob);
  if (!type) {
    return null;
  }
  const bytes =
    type === PDF_TYPE
      ? new Uint8Array(await blob.arrayBuffer())
      : await imageAsPdf(blob, type);
  // pdf.js takes its copy of the bytes away to its worker.
  const source = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();
  const crowdedPages: number[] = [];
  try {
    for (let i = 0; i < pages.length; i++) {
      const { spot, hidden, viewport } = await spotOnPage(
        await source.getPage(i + 1),
        company,
      );
      hidden.forEach(box => blankOut(pages[i], box, viewport));
      drawQr(pages[i], spot, viewport, qrValue);
      if (!spot.clear) {
        crowdedPages.push(i + 1);
      }
    }
  } finally {
    source.destroy();
  }
  return { bytes: await pdf.save(), pageCount: pages.length, crowdedPages };
}

/**
 * The drawing with the order QR on every page, each in that page's largest
 * blank area, and the customer's details (`company`) blanked so operators
 * don't see them. Null for files that can't be drawn here (DWG, STEP…).
 */
export async function stampDrawing(
  doc: Attachment,
  qrValue: string,
  company = '',
): Promise<StampedDrawing | null> {
  const stamped = await stampedBytes(doc, qrValue, company);
  if (!stamped) {
    return null;
  }
  const { bytes, ...rest } = stamped;
  const blob = new browser.Blob([bytes], { type: PDF_TYPE });
  return { url: browser.URL.createObjectURL(blob), ...rest };
}

/**
 * The stamped drawing's pages as images, to check where the QR lands before
 * printing. Null for files that can't be drawn here (DWG, STEP…).
 */
export async function stampedPreview(
  doc: Attachment,
  qrValue: string,
  company = '',
): Promise<StampedPreview | null> {
  const stamped = await stampedBytes(doc, qrValue, company);
  if (!stamped) {
    return null;
  }
  const source = await pdfjs.getDocument({ data: stamped.bytes }).promise;
  try {
    const pages: StampedPreview['pages'] = [];
    for (let i = 1; i <= stamped.pageCount; i++) {
      const page = await source.getPage(i);
      const { canvas } = await renderPage(page, DRAWING_QR.previewPixels);
      pages.push({
        uri: canvas.toDataURL('image/png'),
        aspectRatio: canvas.width / canvas.height,
      });
    }
    return { pages, crowdedPages: stamped.crowdedPages };
  } finally {
    source.destroy();
  }
}

/**
 * The drawing's first page as an image, for its thumbnail. Null for files
 * that can't be drawn here (DWG, STEP…).
 */
export async function drawingThumbnail(
  doc: Attachment,
): Promise<string | null> {
  if (doc.uri?.startsWith('data:image')) {
    return doc.uri;
  }
  const blob = await drawingBlob(doc);
  const type = typeOf(doc, blob);
  if (type !== PDF_TYPE) {
    return type ? browser.URL.createObjectURL(blob) : null;
  }
  const data = new Uint8Array(await blob.arrayBuffer());
  const source = await pdfjs.getDocument({ data }).promise;
  try {
    const page = await source.getPage(1);
    const { canvas } = await renderPage(page, DRAWING_QR.thumbnailPixels);
    return canvas.toDataURL('image/png');
  } finally {
    source.destroy();
  }
}
