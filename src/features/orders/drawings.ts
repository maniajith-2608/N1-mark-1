import {
  fileDownloadUrl,
  openStoredFile,
} from '../../services/files/fileStorage';
import { reserveTab } from '../../services/files/viewDocument';
import { escapeHtml } from '../../services/print/printPage';
import type { Attachment } from '../../shared/types';
import {
  maskedDrawing,
  stampDrawing,
  stampedPreview,
  type DrawingQr,
} from './drawingStamp';
import { DRAWING_KIND, ORDER_STRINGS } from './constants';
import type { OrderSummary, WorkOrder } from './types';
import { orderQrValue } from './utils';

// An order holds one design file; its other drawings are stored among its
// documents, marked with DRAWING_KIND.

const isDrawing = (doc: Attachment) => doc.kind === DRAWING_KIND;

/** Every drawing on the order: the design file first, then the rest. */
export const orderDrawings = (
  o: Pick<WorkOrder, 'designFile' | 'documents'>,
): Attachment[] => [
  ...(o.designFile ? [o.designFile] : []),
  ...o.documents.filter(isDrawing),
];

/** The order's documents that aren't drawings (purchase order first). */
export const orderOtherDocuments = (o: Pick<WorkOrder, 'documents'>) =>
  o.documents.filter(doc => !isDrawing(doc));

/**
 * Drawings → the order's design file and documents: the first is the design
 * file, the rest join `otherDocuments` marked as drawings.
 */
export const drawingsToOrderFiles = (
  drawings: readonly Attachment[],
  otherDocuments: readonly Attachment[],
): Pick<WorkOrder, 'designFile' | 'documents'> => ({
  designFile: drawings[0] ?? null,
  documents: [
    ...otherDocuments,
    ...drawings.slice(1).map(doc => ({ ...doc, kind: DRAWING_KIND })),
  ],
});

/**
 * Opens (downloads) a drawing with the customer's (`company`) name, address
 * and logo blanked, as when printing. Files that can't be masked here (DWG,
 * STEP, or a native build) open as stored. False when nothing opened.
 */
export async function openMaskedDrawing(
  doc: Attachment,
  company: string,
): Promise<boolean> {
  // Web: the tab opens on the tap; the masked copy takes a moment.
  const tab = reserveTab();
  if (!tab) {
    return openStoredFile(doc);
  }
  try {
    const masked = await maskedDrawing(doc, company).catch(() => null);
    return tab.open(masked ?? doc.uri ?? (await fileDownloadUrl(doc.id)));
  } catch (error) {
    tab.close();
    throw error;
  }
}

/**
 * Downloads (opens) the drawing as it prints: the order QR and WO number
 * (`qr`) stamped on every page, the customer's (`company`) details blanked.
 * Files that can't be stamped here (DWG, STEP) open masked or as stored.
 * False when nothing opened.
 */
export async function downloadDrawingWithQr(
  doc: Attachment,
  qr: DrawingQr,
  company: string,
): Promise<boolean> {
  const tab = reserveTab();
  if (!tab) {
    return openStoredFile(doc);
  }
  try {
    const stamped = await stampDrawing(doc, qr.value, company, qr.label).catch(
      () => null,
    );
    const masked = stamped
      ? null
      : await maskedDrawing(doc, company).catch(() => null);
    return tab.open(
      stamped?.url ?? masked ?? doc.uri ?? (await fileDownloadUrl(doc.id)),
    );
  } catch (error) {
    tab.close();
    throw error;
  }
}

/**
 * Opens the drawing in a new tab as the shop floor prints it: the order's QR
 * and WO number stamped on, the customer's details blanked. The pages are
 * shown as images on a page of their own, which mobile browsers and in-app
 * web views display (they show a PDF opened from the app as a blank tab).
 * Files that can't be stamped here (DWG, STEP) open masked or as stored.
 * False when nothing opened.
 */
export async function openDrawingWithQr(
  doc: Attachment,
  order: OrderSummary,
): Promise<boolean> {
  const tab = reserveTab();
  if (!tab) {
    return openStoredFile(doc);
  }
  const D = ORDER_STRINGS.details;
  const title = `${ORDER_STRINGS.workOrder(order.number)} · ${doc.name}`;
  tab.show(title, `<p>${escapeHtml(D.preparingDrawing)}</p>`);
  try {
    const preview = await stampedPreview(
      doc,
      orderQrValue(order),
      order.customerName,
      ORDER_STRINGS.workOrder(order.number),
    ).catch(() => null);
    if (preview) {
      tab.show(
        title,
        preview.pages
          .map(
            (page, i) =>
              `<img src="${page.uri}" alt="${escapeHtml(
                `${doc.name} ${i + 1}`,
              )}">`,
          )
          .join(''),
      );
      return true;
    }
    const masked = await maskedDrawing(doc, order.customerName).catch(
      () => null,
    );
    return tab.open(masked ?? doc.uri ?? (await fileDownloadUrl(doc.id)));
  } catch (error) {
    tab.close();
    throw error;
  }
}
