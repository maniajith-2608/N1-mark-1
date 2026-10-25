import {
  formatCurrency,
  gstAmounts,
  toNumber,
  workOrderSearchTerms,
  type GstSupply,
} from '../../shared/utils';
import { ApiError } from '../../services/api';
import { BILLING_STRINGS } from './constants';
import { matchesAny } from '../../shared/hooks';
import type {
  Invoice,
  InvoiceFilters,
  LineItem,
  LineItemDraft,
  Quote,
  QuoteFilters,
  Totals,
} from './types';

/** (pieces × running time + setup time) × rate: setup is once per batch. */
const workedOutAmount = (
  item: Pick<LineItem, 'minutesPerPiece' | 'setupMinutes' | 'ratePerMinute'>,
  quantity: number,
) =>
  Math.round(
    (quantity * item.minutesPerPiece + item.setupMinutes) * item.ratePerMinute,
  );

/**
 * A line's amount: the server's for a saved line, worked out only for a
 * line being edited.
 */
export const lineAmount = (
  item: Pick<
    LineItem,
    'minutesPerPiece' | 'setupMinutes' | 'ratePerMinute' | 'amount'
  >,
  quantity: number,
) => item.amount ?? workedOutAmount(item, quantity);

/**
 * The live preview while editing (saved documents show the server's
 * totals). GST is charged on the subtotal after discount, at the document's rate:
 * CGST + SGST within the organization's state, IGST across states. The total
 * is the same either way.
 */
export function calculateTotals(
  items: readonly LineItem[],
  quantity: number,
  discount: number,
  gstRate: number,
  supply: GstSupply = 'intra',
): Totals {
  const subtotal = items.reduce(
    (sum, item) => sum + workedOutAmount(item, quantity),
    0,
  );
  const applied = Math.min(Math.max(0, discount), subtotal);
  const taxable = subtotal - applied;
  const gst = gstAmounts(taxable, gstRate, supply);
  return {
    subtotal,
    discount: applied,
    taxable,
    gstRate: supply === 'none' ? 0 : gstRate,
    supply,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: gst.igst,
    gst: gst.total,
    total: taxable + gst.total,
  };
}

/** The server's totals: never worked out again on the device. */
export const invoiceTotal = (i: Invoice) => i.totals.total;
export const quoteTotal = (q: Quote) => q.totals.total;

export const toDraft = (item: LineItem): LineItemDraft => ({
  id: item.id,
  operation: item.operation,
  description: item.description,
  minutes: String(item.minutesPerPiece),
  setup: String(item.setupMinutes),
  rate: String(Number(item.ratePerMinute.toFixed(2))),
  exactRate: item.ratePerMinute,
});

export const fromDraft = (draft: LineItemDraft): LineItem => ({
  id: draft.id,
  operation: draft.operation.trim(),
  description: draft.description.trim(),
  minutesPerPiece: toNumber(draft.minutes),
  setupMinutes: toNumber(draft.setup),
  ratePerMinute:
    draft.exactRate !== undefined &&
    draft.rate === String(Number(draft.exactRate.toFixed(2)))
      ? draft.exactRate
      : toNumber(draft.rate),
});

/** Rows with nothing in them are dropped on save. */
export const isEmptyDraft = (d: LineItemDraft) =>
  !d.operation.trim() &&
  !d.description.trim() &&
  !toNumber(d.minutes) &&
  !toNumber(d.setup) &&
  !toNumber(d.rate);

let draftCounter = 0;
export const newDraft = (): LineItemDraft => {
  draftCounter += 1;
  return {
    id: `new-${Date.now()}-${draftCounter}`,
    operation: '',
    description: '',
    minutes: '',
    setup: '',
    rate: '',
  };
};

/** "2 min": the operation's running time. */
export const runningTimeLabel = (item: LineItem) =>
  BILLING_STRINGS.lineItems.minutes(item.minutesPerPiece);
/** "15 min": the operation's one-off setup time. */
export const setupTimeLabel = (item: LineItem) =>
  BILLING_STRINGS.lineItems.minutes(item.setupMinutes);

/** "₹26.67/min" */
export const rateLabel = (item: LineItem) =>
  BILLING_STRINGS.lineItems.perMinute(
    formatCurrency(Number(item.ratePerMinute.toFixed(2))),
  );

/** Invoices issued in the same calendar month as `now`. */
export const isThisMonth = (iso: string, now = new Date()) => {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
};

/**
 * "WO-00125" plus the bare number ("125") in every form people type it, so
 * "WO-00125", "125", "WO #125" and "wo125" all find the invoice.
 */
export const jobIdSearchTerms = (jobId: string) => {
  const number = jobId.match(/\d+/)?.[0]?.replace(/^0+(?=\d)/, '') ?? '';
  return `${jobId} ${workOrderSearchTerms(number)}`;
};

export const invoiceSearchText = (i: Invoice) =>
  `${i.number} ${i.customerName} ${jobIdSearchTerms(i.jobId)} ${i.routeCard} ${
    i.partName
  }`;
export const quoteSearchText = (q: Quote) =>
  `${q.number} ${q.customerName} ${q.partName} ${q.material}`;

/** Status filters: an empty list shows everything. */
export const matchesInvoiceFilters = (i: Invoice, f: InvoiceFilters) =>
  matchesAny(f.status, i.status);
export const matchesQuoteFilters = (q: Quote, f: QuoteFilters) =>
  matchesAny(f.status, q.status);
export const INITIAL_INVOICE_FILTERS: InvoiceFilters = { status: [] };
export const INITIAL_QUOTE_FILTERS: QuoteFilters = { status: [] };

/** The customer has no email on file: ask for one and send again with `to`. */
export const isEmailMissing = (error: unknown) =>
  error instanceof ApiError && error.code === 'CUSTOMER_EMAIL_MISSING';
