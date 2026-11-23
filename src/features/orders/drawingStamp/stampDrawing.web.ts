import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import { OPS, Util } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs';
import { lightTheme } from '../../../theme';
import {
  fileDownloadUrl,
  uploadTarget,
} from '../../../services/files/fileStorage';
import { pickedFile } from '../../../services/files/pickedFiles';
import type { Attachment } from '../../../shared/types';
import { DRAWING_QR } from '../constants';
import { qrPath } from '../components/QrCode';
import {
  clearInk,
  companyAreas,
  joinLines,
  logoAreas,
  type Box,
  type TextLine,
} from './companyArea';
import { findQrSpot, inkMapFromPixels, type QrSpot } from './findQrSpot';
import { removeWatermarks } from './removeWatermarks';
import type { DrawingQr, StampedDrawing, StampedPreview } from './types';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// The project builds without the DOM typings; just what this file touches.
type Context2D = {
  fillStyle: string;
  fillRect: (x: number, y: number, w: number, h: number) => void;
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

/**
 * The drawing's bytes: picked this session, or fetched from file storage
 * (through the dev server on localhost, which S3's CORS doesn't allow).
 */
async function drawingBlob(doc: Attachment): Promise<BlobLike> {
  const picked = pickedFile(doc.id) as BlobLike | undefined;
  if (picked) {
    return picked;
  }
  const url = doc.uri ?? uploadTarget(await fileDownloadUrl(doc.id));
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

const PICTURE_OPS = new Set<number>([
  OPS.paintImageXObject,
  OPS.paintInlineImageXObject,
  OPS.paintImageMaskXObject,
]);

/** Where the page paints pictures (logos, 3D views), in viewport pixels. */
async function pictureBoxes(
  page: pdfjs.PDFPageProxy,
  viewport: pdfjs.PageViewport,
): Promise<Box[]> {
  const { fnArray, argsArray } = await page.getOperatorList();
  type Matrix = [number, number, number, number, number, number];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const saved: Matrix[] = [];
  const boxes: Box[] = [];
  fnArray.forEach((fn, i) => {
    const args = argsArray[i];
    if (fn === OPS.save) {
      saved.push(ctm);
    } else if (fn === OPS.restore) {
      ctm = saved.pop() ?? ctm;
    } else if (fn === OPS.transform) {
      ctm = Util.transform(ctm, args) as Matrix;
    } else if (fn === OPS.paintFormXObjectBegin) {
      saved.push(ctm);
      ctm = args[0] ? (Util.transform(ctm, args[0]) as Matrix) : ctm;
    } else if (fn === OPS.paintFormXObjectEnd) {
      ctm = saved.pop() ?? ctm;
    } else if (PICTURE_OPS.has(fn)) {
      // A picture fills the unit square of its matrix.
      const [x0, y0, x1, y1] = viewport.convertToViewportRectangle(
        Util.getAxialAlignedBoundingBox([0, 0, 1, 1], ctm),
      );
      boxes.push({
        x0: Math.floor(Math.min(x0, x1)),
        y0: Math.floor(Math.min(y0, y1)),
        x1: Math.ceil(Math.max(x0, x1)),
        y1: Math.ceil(Math.max(y0, y1)),
      });
    }
  });
  return boxes;
}

/**
 * Draws the page small and finds the company's details to blank (when a
 * company is given: its name and address, and logos in the title block),
 * in that small viewport's pixels.
 */
async function companyDetails(page: pdfjs.PDFPageProxy, company: string) {
  const { canvas, context, viewport } = await renderPage(
    page,
    DRAWING_QR.mapPixels,
  );
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const drawn = inkMapFromPixels(data, canvas.width, canvas.height);
  const hidden = company
    ? [
        ...companyAreas(drawn, await textLines(page, viewport), company),
        ...logoAreas(drawn, await pictureBoxes(page, viewport)),
      ]
    : [];
  return { drawn, hidden, viewport };
}

/**
 * The company's details to blank and room for a QR, in pixels. Blanked
 * areas count as paper, so the QR may go there.
 */
async function spotOnPage(
  page: pdfjs.PDFPageProxy,
  company: string,
  withLabel: boolean,
) {
  const { drawn, hidden, viewport } = await companyDetails(page, company);
  const map = clearInk(drawn, hidden);
  const px = (mm: number) => Math.round(mm * PT_PER_MM * viewport.scale);
  // A label takes a band on top, so the square grows to keep the QR's size.
  const band = withLabel ? px(DRAWING_QR.labelMm) : 0;
  const spot = findQrSpot(map, {
    preferred: px(DRAWING_QR.preferredMm) + band,
    min: px(DRAWING_QR.minMm) + band,
    gap: px(DRAWING_QR.gapMm),
    margin: px(DRAWING_QR.marginMm),
  });
  return { spot, band, hidden, viewport };
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
 * The PDF point at (x, y) on screen, with the PDF points per screen pixel
 * and the turn that keeps drawings upright on a rotated page.
 */
function pdfFrame(viewport: pdfjs.PageViewport, x: number, y: number) {
  const [x0, y0] = viewport.convertToPdfPoint(x, y);
  const [x1, y1] = viewport.convertToPdfPoint(x + 1, y);
  return {
    x: x0,
    y: y0,
    ptPerPx: Math.hypot(x1 - x0, y1 - y0),
    rotate: degrees((Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI),
  };
}

/** A white `w` × `h` box (screen pixels) with its top left at (x, y). */
function drawPaper(
  page: PDFPage,
  viewport: pdfjs.PageViewport,
  { x, y, w, h }: { x: number; y: number; w: number; h: number },
) {
  const { ptPerPx, ...at } = pdfFrame(viewport, x, y);
  page.drawSvgPath(`M0 0h${w}v${h}h-${w}z`, {
    ...at,
    scale: ptPerPx,
    color: toRgb(lightTheme.colors.qrBackground),
  });
}

/**
 * Draws the QR (on its white quiet zone) `size` pixels square with its top
 * left at (x, y) on screen, upright however the page is rotated.
 */
function drawQr(
  page: PDFPage,
  viewport: pdfjs.PageViewport,
  { x, y, size }: { x: number; y: number; size: number },
  qrValue: string,
) {
  const { path, modules } = qrPath(qrValue);
  const { ptPerPx, ...at } = pdfFrame(viewport, x, y);
  const options = { ...at, scale: (size * ptPerPx) / modules };
  drawPaper(page, viewport, { x, y, w: size, h: size });
  page.drawSvgPath(path, {
    ...options,
    color: toRgb(lightTheme.colors.qrForeground),
  });
}

/** `label` centred in the `band` pixels at the top of `spot`, on white. */
function drawLabel(
  page: PDFPage,
  viewport: pdfjs.PageViewport,
  spot: QrSpot,
  band: number,
  label: string,
  font: PDFFont,
) {
  drawPaper(page, viewport, { x: spot.x, y: spot.y, w: spot.size, h: band });
  const { ptPerPx } = pdfFrame(viewport, spot.x, spot.y);
  const size = Math.min(
    band * DRAWING_QR.labelFontRatio * ptPerPx,
    (spot.size * ptPerPx) / font.widthOfTextAtSize(label, 1),
  );
  const width = font.widthOfTextAtSize(label, size) / ptPerPx;
  const baseline = pdfFrame(
    viewport,
    spot.x + (spot.size - width) / 2,
    spot.y + band * DRAWING_QR.labelBaselineRatio,
  );
  page.drawText(label, {
    x: baseline.x,
    y: baseline.y,
    rotate: baseline.rotate,
    size,
    font,
    color: toRgb(lightTheme.colors.qrForeground),
  });
}

/** The drawing as PDF bytes, or null for files that can't be drawn here. */
async function drawingPdfBytes(doc: Attachment) {
  const blob = await drawingBlob(doc);
  const type = typeOf(doc, blob);
  if (!type) {
    return null;
  }
  // Watermarks never reach print, preview, download or a thumbnail.
  return type === PDF_TYPE
    ? removeWatermarks(new Uint8Array(await blob.arrayBuffer()))
    : imageAsPdf(blob, type);
}

/**
 * The stamped PDF's bytes, or null for files that can't be drawn here.
 * `company`: the customer, whose name, address and logo are blanked.
 * `label`: printed above the QR, e.g. "WO #13"; blank for none.
 * `maxPages`: stamp only the first pages (a thumbnail needs one).
 */
async function stampedBytes(
  doc: Attachment,
  qrValue: string,
  company: string,
  label: string,
  maxPages = Infinity,
) {
  const bytes = await drawingPdfBytes(doc);
  if (!bytes) {
    return null;
  }
  // pdf.js takes its copy of the bytes away to its worker.
  const source = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();
  const font = label ? await pdf.embedFont(StandardFonts.HelveticaBold) : null;
  const crowdedPages: number[] = [];
  try {
    for (let i = 0; i < Math.min(pages.length, maxPages); i++) {
      const { spot, band, hidden, viewport } = await spotOnPage(
        await source.getPage(i + 1),
        company,
        Boolean(font),
      );
      hidden.forEach(box => blankOut(pages[i], box, viewport));
      if (font) {
        drawLabel(pages[i], viewport, spot, band, label, font);
      }
      const qrSize = spot.size - band;
      drawQr(
        pages[i],
        viewport,
        { x: spot.x + band / 2, y: spot.y + band, size: qrSize },
        qrValue,
      );
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
 * blank area with `label` (the WO number) above it, and the
 * customer's details (`company`) blanked so operators don't see them. Null
 * for files that can't be drawn here (DWG, STEP…).
 */
export async function stampDrawing(
  doc: Attachment,
  qrValue: string,
  company = '',
  label = '',
): Promise<StampedDrawing | null> {
  const stamped = await stampedBytes(doc, qrValue, company, label);
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
  label = '',
): Promise<StampedPreview | null> {
  const stamped = await stampedBytes(doc, qrValue, company, label);
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
 * The drawing with the customer's details (`company`) blanked and no QR,
 * for downloading or opening in a tab. Null for files that can't be drawn
 * here (DWG, STEP…).
 */
export async function maskedDrawing(
  doc: Attachment,
  company: string,
): Promise<string | null> {
  const bytes = await drawingPdfBytes(doc);
  if (!bytes) {
    return null;
  }
  const source = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();
  try {
    for (let i = 0; i < pages.length; i++) {
      const { hidden, viewport } = await companyDetails(
        await source.getPage(i + 1),
        company,
      );
      hidden.forEach(box => blankOut(pages[i], box, viewport));
    }
  } finally {
    source.destroy();
  }
  const blob = new browser.Blob([await pdf.save()], { type: PDF_TYPE });
  return browser.URL.createObjectURL(blob);
}

/** The stamped drawing's first page as a PNG `pixels` long. */
async function stampedFirstPage(
  doc: Attachment,
  company: string,
  pixels: number,
  qr: DrawingQr,
): Promise<string | null> {
  const stamped = await stampedBytes(doc, qr.value, company, qr.label, 1);
  if (!stamped) {
    return null;
  }
  const source = await pdfjs.getDocument({ data: stamped.bytes }).promise;
  try {
    const { canvas } = await renderPage(await source.getPage(1), pixels);
    return canvas.toDataURL('image/png');
  } finally {
    source.destroy();
  }
}

/**
 * The drawing's first page as an image, `pixels` long on its longer side
 * (small for a thumbnail, large for the full-screen view), with the
 * customer's details (`company`) blanked as when printing and, given `qr`,
 * the order QR stamped on as it prints. Null for files that can't be drawn
 * here (DWG, STEP…).
 */
export async function drawingThumbnail(
  doc: Attachment,
  company = '',
  pixels: number = DRAWING_QR.thumbnailPixels,
  qr?: DrawingQr,
): Promise<string | null> {
  if (qr) {
    return stampedFirstPage(doc, company, pixels, qr);
  }
  if (doc.uri?.startsWith('data:image')) {
    return doc.uri;
  }
  const blob = await drawingBlob(doc);
  const type = typeOf(doc, blob);
  if (type !== PDF_TYPE) {
    return type ? browser.URL.createObjectURL(blob) : null;
  }
  const data = await removeWatermarks(new Uint8Array(await blob.arrayBuffer()));
  const source = await pdfjs.getDocument({ data }).promise;
  try {
    const page = await source.getPage(1);
    const { hidden, viewport: found } = await companyDetails(page, company);
    const { canvas, context, viewport } = await renderPage(page, pixels);
    // Found on a smaller drawing of the same page: scale up to this one.
    const k = viewport.scale / found.scale;
    context.fillStyle = lightTheme.colors.qrBackground;
    hidden.forEach(b =>
      context.fillRect(
        Math.floor(b.x0 * k),
        Math.floor(b.y0 * k),
        Math.ceil((b.x1 - b.x0 + 1) * k),
        Math.ceil((b.y1 - b.y0 + 1) * k),
      ),
    );
    return canvas.toDataURL('image/png');
  } finally {
    source.destroy();
  }
}
