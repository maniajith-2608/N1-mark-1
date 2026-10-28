import type { Attachment } from '../../shared/types';
import { DRAWING_KIND } from './constants';
import type { WorkOrder } from './types';

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
