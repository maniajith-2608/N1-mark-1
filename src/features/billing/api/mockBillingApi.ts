import {
  createMockCollection,
  delay,
  nextSequentialId,
} from '../../../services/mock/mockServer';
import type { FileReference } from '../../../services/files/fileStorage';
import { jobCardsApi } from '../../jobCards/api/jobCardsApi';
import { ordersApi } from '../../orders/api/ordersApi';
import { orderFromQuote } from '../workflow';
import type {
  BillingPermissions,
  ConvertQuoteInput,
  Invoice,
  InvoiceInput,
  InvoiceSummary,
  PaymentInput,
  Quote,
  QuoteInput,
  SendInput,
} from '../types';
import {
  MOCK_INVOICES,
  MOCK_QUOTES,
  mockInvoiceTotals,
  mockQuoteTotals,
} from './mockData';

const ID_PAD = 4;
const yearPrefix = (kind: 'INV' | 'QT') =>
  `${kind}-${new Date().getFullYear()}-`;
const today = () => new Date().toISOString().slice(0, 10);

// In-memory stand-in for the N1 Core billing operations (see billingApi.ts):
// the number, status and totals are filled in here as the server would.
const invoices = createMockCollection<Invoice, InvoiceInput>({
  seed: MOCK_INVOICES,
  nextId: rows => nextSequentialId(rows, yearPrefix('INV'), ID_PAD),
  build: (input, id) => ({
    ...input,
    id,
    number: id,
    status: 'new',
    orderId: input.jobCardId,
    issuedAt: new Date().toISOString(),
    dueDate: today(),
    payment: null,
    totals: mockInvoiceTotals(input),
  }),
});

const quotes = createMockCollection<Quote, QuoteInput>({
  seed: MOCK_QUOTES,
  nextId: rows => nextSequentialId(rows, yearPrefix('QT'), ID_PAD),
  build: (input, id) => ({
    ...input,
    id,
    number: id,
    status: 'draft',
    createdAt: new Date().toISOString(),
    totals: mockQuoteTotals(input),
  }),
});

/** Billing a job card marks it invoiced, as the server does. */
async function createInvoice(input: InvoiceInput) {
  const row = await invoices.create(input);
  if (input.jobCardId) {
    await jobCardsApi.update(input.jobCardId, { billing: 'invoiced' } as never);
  }
  return row;
}

async function updateInvoice(id: string, changes: Partial<InvoiceInput>) {
  const row = await invoices.update(id, changes);
  return invoices.update(id, { totals: mockInvoiceTotals(row) } as never);
}

async function updateQuote(id: string, changes: Partial<QuoteInput>) {
  const row = await quotes.update(id, changes);
  return quotes.update(id, { totals: mockQuoteTotals(row) } as never);
}

async function markPaid(id: string, { paidOn, tds }: PaymentInput) {
  const row = await invoices.get(id);
  const tdsAmount = tds?.amount ?? 0;
  return invoices.update(id, {
    status: 'paid',
    payment: {
      paidOn,
      receivedAmount: row.totals.total - tdsAmount,
      tdsAmount,
      tdsSection: tds?.section ?? null,
    },
  } as never);
}

async function summary(): Promise<InvoiceSummary> {
  const rows = await invoices.list();
  const count = (status: Invoice['status']) =>
    rows.filter(i => i.status === status).length;
  const sum = (list: Invoice[]) =>
    list.reduce((total, i) => total + i.totals.total, 0);
  const month = today().slice(0, 7);
  return {
    total: rows.length,
    new: count('new'),
    overdue: count('overdue'),
    paid: count('paid'),
    billedThisMonth: sum(rows.filter(i => i.issuedAt.startsWith(month))),
    outstanding: sum(rows.filter(i => i.status !== 'paid')),
    overdueAmount: sum(rows.filter(i => i.status === 'overdue')),
  };
}

// The mock backend makes no PDFs.
const noPdf = async (_id: string): Promise<FileReference | null> => {
  await delay();
  return null;
};

export const invoicesApi = {
  list: invoices.list,
  create: createInvoice,
  update: updateInvoice,
  remove: invoices.remove,
  reset: invoices.reset,
  markPaid,
  send: async (_id: string, _input?: SendInput) => delay(),
  pdf: noPdf,
  summary,
  permissions: async (): Promise<BillingPermissions> => {
    await delay();
    return { markPaid: true };
  },
};

/** Converting makes the order, as the server does, and links the quote. */
async function convert(id: string, input: ConvertQuoteInput) {
  const quote = await quotes.get(id);
  const order = await ordersApi.create({
    ...orderFromQuote(quote, undefined),
    poNumber: input.poNumber,
    dueDate: input.dueDate,
  });
  return quotes.update(id, { orderId: order.id });
}

export const quotesApi = {
  list: quotes.list,
  create: quotes.create,
  update: updateQuote,
  remove: quotes.remove,
  reset: quotes.reset,
  send: async (id: string, _input?: SendInput) =>
    quotes.update(id, { status: 'sent' }),
  convert,
  pdf: noPdf,
};
