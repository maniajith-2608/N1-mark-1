import type { Customer } from '../customers/types';
import type { JobCard } from '../jobCards/types';
import type { OrderInput, WorkOrder } from '../orders/types';
import type { Invoice, InvoiceInput, LineItem, Quote } from './types';

/** "1042" → "WO-01042", the job reference billing uses. */
export const jobReference = (workOrderId: string) =>
  `WO-${workOrderId.padStart(5, '0')}`;

/** A new work order from a quote: customer, part, quantity and material. */
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
    material: quote.material,
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
    notes: `Converted from quote ${quote.id}.`,
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
    customerName: jobCard.customerName,
    jobId: jobReference(jobCard.id),
    routeCard: order?.routeCardNo ?? '',
    partName: [jobCard.partName, jobCard.jobName].filter(Boolean).join(' — '),
    quantity: jobCard.quantity,
    status: 'new',
    lineItems,
    discount: 0,
    gstRate: quote ? quote.gstRate : defaultGstRate,
    quoteId: quote?.id ?? null,
    // Fixed from the order's PO; not edited on the invoice.
    poAmount: order?.poAmount ?? null,
    notes: '',
  };
}

/**
 * Already tied to an order: converted to one, or billed against an order's
 * job. Such a quote can't be converted again.
 */
export const isQuoteMapped = (quote: Quote, invoices: readonly Invoice[]) =>
  Boolean(quote.orderId) || invoices.some(i => i.quoteId === quote.id);
