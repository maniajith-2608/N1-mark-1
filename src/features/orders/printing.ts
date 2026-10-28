import { lightTheme } from '../../theme';
import type { Attachment } from '../../shared/types';
import { ORDER_QR_SIZE } from '../../shared/constants';
import { formatFileSize, formatLongDate } from '../../shared/utils';
import {
  detailList,
  escapeHtml,
  printOrNotify,
  printPage,
  printPdf,
} from '../../services/print';
import { DIM_FONT, DIM_LABELS, PART, VIEW } from './components/DrawingPreview';
import { qrPath } from './components/QrCode';
import { stampDrawing } from './drawingStamp';
import { ORDER_STRINGS } from './constants';
import type { OrderSummary } from './types';
import { orderHeading, orderQrValue, orderTitle } from './utils';

const P = ORDER_STRINGS.print;
const { colors } = lightTheme;

/** Printed QR codes are larger than on screen: paper is read from further away. */
const PRINT_QR_SCALE = 1.5;

/** The drawing preview as SVG markup, in print colours. */
function drawingSvg(): string {
  const stroke = colors.textPrimary;
  const muted = colors.textSecondary;
  const cx = PART.x + PART.w / 2;
  const cy = PART.y + PART.h / 2;
  const dimY = PART.y + PART.h + 14;
  const dimX = PART.x + PART.w + 12;
  const text = (
    x: number,
    y: number,
    size: number,
    label: string,
    anchor = 'middle',
  ) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${muted}" text-anchor="${anchor}">${escapeHtml(
      label,
    )}</text>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}">` +
    `<rect x="${PART.x}" y="${PART.y}" width="${PART.w}" height="${PART.h}" stroke="${stroke}" stroke-width="1.2" fill="none"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${PART.hole}" stroke="${stroke}" stroke-width="1" fill="none"/>` +
    text(cx, cy + DIM_FONT / 3, DIM_FONT - 2, DIM_LABELS.hole) +
    `<line x1="${PART.x}" y1="${dimY}" x2="${
      PART.x + PART.w
    }" y2="${dimY}" stroke="${muted}" stroke-width="0.8"/>` +
    text(cx, dimY + DIM_FONT + 2, DIM_FONT - 1, DIM_LABELS.width) +
    `<line x1="${dimX}" y1="${PART.y}" x2="${dimX}" y2="${
      PART.y + PART.h
    }" stroke="${muted}" stroke-width="0.8"/>` +
    text(dimX + 5, cy, DIM_FONT - 1, DIM_LABELS.height, 'start') +
    '</svg>'
  );
}

/** The order's QR code as SVG markup, the same code the screen shows. */
function qrSvg(order: OrderSummary, scale = PRINT_QR_SCALE): string {
  const { path, modules } = qrPath(orderQrValue(order));
  const size = ORDER_QR_SIZE * scale;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${modules} ${modules}" shape-rendering="crispEdges" role="img" ` +
    `aria-label="${escapeHtml(ORDER_STRINGS.details.qrA11y(order.number))}">` +
    `<rect width="${modules}" height="${modules}" fill="${colors.qrBackground}"/>` +
    `<path d="${path}" fill="${colors.qrForeground}"/></svg>`
  );
}

const orderDetails = (order: OrderSummary) => {
  const Q = ORDER_STRINGS.qr;
  return detailList([
    [Q.customer, order.customerName],
    [Q.part, orderTitle(order)],
    [Q.partNumber, order.partNumber],
    [Q.poNumber, order.poNumber],
    [
      ORDER_STRINGS.details.quantity,
      order.quantity ? ORDER_STRINGS.quantity(order.quantity) : '',
    ],
    [ORDER_STRINGS.details.dueDate, formatLongDate(order.dueDate)],
  ]);
};

/** The order's QR beside its details: scanning it opens the job. */
const qrRow = (order: OrderSummary, label: string, value: string) =>
  '<div class="row"><div>' +
  `<div class="label">${escapeHtml(label)}</div>` +
  `<div class="value">${escapeHtml(value)}</div>` +
  `${orderDetails(order)}</div>${qrSvg(order)}</div>`;

/** The drawing with its number, the order's details and its QR code. */
export function drawingPrintHtml(order: OrderSummary, drawingNumber: string) {
  const heading = orderHeading(order);
  return printPage(
    P.drawingJob(heading),
    `<h1>${escapeHtml(heading)}</h1>` +
      `<div class="figure">${drawingSvg()}</div>` +
      qrRow(order, ORDER_STRINGS.details.drawingNo, drawingNumber),
  );
}

/**
 * One document: a picked image prints as itself; a file the app doesn't hold
 * yet prints as a sheet naming it, with the order's details and QR code, to
 * clip to the paper copy.
 */
export function documentPrintHtml(order: OrderSummary, doc: Attachment) {
  const heading = orderHeading(order);
  const meta = [doc.kind, formatFileSize(doc.sizeBytes)]
    .filter(Boolean)
    .join(' · ');
  const figure = doc.uri?.startsWith('data:image')
    ? `<div class="figure"><img src="${escapeHtml(doc.uri)}" alt="${escapeHtml(
        doc.name,
      )}"></div>`
    : '';
  return printPage(
    doc.name,
    `<h1>${escapeHtml(heading)}</h1>${figure}` + qrRow(order, meta, doc.name),
  );
}

/** The order QR on its own, large, to stick on a part or a tote. */
export function qrPrintHtml(order: OrderSummary) {
  const heading = orderHeading(order);
  return printPage(
    ORDER_STRINGS.details.orderQrFile(order.number),
    `<h1>${escapeHtml(heading)}</h1>` +
      `<div class="figure">${qrSvg(order, PRINT_QR_SCALE * 2)}</div>` +
      `<div class="row">${orderDetails(order)}</div>`,
  );
}

/**
 * Prints a drawing file with the order QR in a blank area of every page,
 * the customer's name, address and logo blanked out for the shop floor.
 * Where it can't be stamped (a DWG, a native build, a failed download) it
 * prints as a sheet naming the file, with the details and QR, as before.
 */
export async function printDrawingWithQr(
  order: OrderSummary,
  doc: Attachment,
): Promise<void> {
  const stamped = await stampDrawing(
    doc,
    orderQrValue(order),
    order.customerName,
  ).catch(() => null);
  if (stamped && (await printPdf(stamped.url))) {
    return;
  }
  await printOrNotify(
    documentPrintHtml(order, doc),
    doc.name,
    ORDER_STRINGS.details.printDrawing,
  );
}
