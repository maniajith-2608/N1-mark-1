import type { Customer } from '../customers/types';
import type { JobCard } from '../jobCards/types';
import type { OrderInput, WorkOrder } from '../orders/types';
import type { InvoiceInput, LineItem, Quote } from './types';

/** "1042" → "WO-01042", the job reference billing uses. */
export const jobReference = (workOrderId: string) =>
  `WO-${workOrderId.padStart(5, '0')}`;

// Job cards are moving to backend ids, with the work order number (WO-n) and
// the order id as their own fields; until then the id is the WO number.
type JobCardRef = JobCard & { number?: string | null; orderId?: string };

/** The job card's work order as people know it, e.g. "WO-12". */
export function jobCardLabel(jobCard: JobCard) {
  const number = (jobCard as JobCardRef).number ?? jobCard.id;
  // A bare number (the mock data's) gets the WO prefix.
  return /^\d+$/.test(number) ? jobReference(number) : number;
}

/** The order a job card was made from. */
export const jobCardOrderId = (jobCard: JobCard) =>
  (jobCard as JobCardRef).orderId ?? jobCard.id;

/** A new work order from a quote: customer, part, quantity and material grade. */
export function orderFromQuote(
  quote: Quote,
  customer: Customer | undefined,
): OrderInput {
  return {
    customerId: customer?.id ?? '',
    customerName: quote.customerName,
    customerEmail: customer?.email ?? '',
    partName: quote.partName,
    jobName: '',
    description: quote.partName,
    quantity: quote.quantity,
    priority: 'medium',
    dueDate: '',
    poNumber: '',
    poAmount: null,
    routeCardNo: '',
    dcNo: '',
    dcDate: '',
    partNumber: '',
    drawingNumber: '',
    rmPartNumber: '',
    shopOrderNumber: '',
    rawMaterialSize: '',
    heatNumber: '',
    projectId: '',
    rawMaterialGrade: quote.material,
    materialSource: '',
    quoteId: quote.id,
    notes: `Converted from quote ${quote.number}.`,
    designFile: null,
    documents: [],
  };
}

/**
 * A draft invoice for a finished job. With a quote it is billed at the
 * quote's operations and GST rate; without one, the job's operations are
 * listed with no rates yet, to be filled in.
 */
export function invoiceForDispatch(
  jobCard: JobCard,
  order: WorkOrder | undefined,
  quote: Quote | undefined,
  defaultGstRate: number,
): InvoiceInput {
  const lineItems: LineItem[] = quote
    ? quote.lineItems
    : jobCard.operations.map(op => ({
        id: op.id,
        operation: op.name,
        description: '',
        minutesPerPiece: 0,
        setupMinutes: 0,
        ratePerMinute: 0,
      }));
  return {
    customerId: jobCard.customerId,
    customerName: jobCard.customerName,
    jobId: jobCardLabel(jobCard),
    jobCardId: jobCard.id,
    routeCard: order?.routeCardNo ?? '',
    partName: [jobCard.partName, jobCard.jobName].filter(Boolean).join(' — '),
    quantity: jobCard.quantity,
    lineItems,
    discount: 0,
    gstRate: quote ? quote.gstRate : defaultGstRate,
    quoteId: quote?.id ?? null,
    // Fixed from the order's PO; not edited on the invoice.
    poAmount: order?.poAmount ?? null,
    notes: '',
  };
}
