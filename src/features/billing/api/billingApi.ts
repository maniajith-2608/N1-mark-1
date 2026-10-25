import {
  definedOnly,
  fetchAllNodes,
  fromPaise,
  fromWireEnum,
  graphqlRequest,
  textOrEmpty,
  textOrNull,
  toPaise,
} from '../../../services/api';
import type { FileReference } from '../../../services/files/fileStorage';
import type {
  BillingPermissions,
  ConvertQuoteInput,
  Invoice,
  InvoiceInput,
  InvoiceStatus,
  InvoiceSummary,
  LineItem,
  Payment,
  PaymentInput,
  Quote,
  QuoteInput,
  QuoteStatus,
  SendInput,
  Totals,
} from '../types';

// N1 Core API: invoices / invoice / invoiceSummary / createInvoice /
// updateInvoice / markInvoicePaid / sendInvoice, and quotes / quote /
// createQuote / updateQuote / deleteQuote / sendQuote / convertQuoteToOrder.
// Money is paise on the wire and rupees in the app; the totals are the
// server's, never worked out here.

const BILLING_FIELDS = `
  fragment LineFields on BillingLine {
    id operation description minutesPerPiece setupMinutes ratePerMinute amount
  }
  fragment TotalsFields on Totals {
    subtotal discount taxable gstRate supply cgst sgst igst gst total
  }
`;

const INVOICE_FIELDS = `
  fragment InvoiceFields on Invoice {
    id number customerId customerName jobId jobCardId orderId routeCard
    part quantity status issuedAt dueDate quoteId poAmount notes gstRate
    discount
    lines { ...LineFields }
    totals { ...TotalsFields }
    payment { paidOn receivedAmount tdsAmount tdsSection }
  }
  ${BILLING_FIELDS}
`;

const QUOTE_FIELDS = `
  fragment QuoteFields on Quote {
    id number customerId customerName part quantity material status gstRate
    orderId createdAt
    lines { ...LineFields }
    totals { ...TotalsFields }
  }
  ${BILLING_FIELDS}
`;

// A literal: the cost check counts a page size passed as a variable as 100,
// and 100 invoices with their lines cost more than the app may ask for.
const PAGE_SIZE = 50;

type LineNode = Omit<LineItem, 'amount'> & { amount: number };
type TotalsNode = Omit<Totals, 'supply'> & { supply: string };

type InvoiceNode = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  jobId: string | null;
  jobCardId: string | null;
  orderId: string | null;
  routeCard: string | null;
  part: string;
  quantity: number;
  status: Uppercase<InvoiceStatus>;
  issuedAt: string;
  dueDate: string;
  quoteId: string | null;
  poAmount: number | null;
  notes: string | null;
  gstRate: number;
  discount: number;
  lines: LineNode[];
  totals: TotalsNode;
  payment: Payment | null;
};

type QuoteNode = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  part: string;
  quantity: number;
  material: string | null;
  status: Uppercase<QuoteStatus>;
  gstRate: number;
  orderId: string | null;
  createdAt: string;
  lines: LineNode[];
  totals: TotalsNode;
};

const toLineItem = (line: LineNode): LineItem => ({
  id: line.id,
  operation: line.operation,
  description: line.description,
  minutesPerPiece: line.minutesPerPiece,
  setupMinutes: line.setupMinutes,
  ratePerMinute: fromPaise(line.ratePerMinute),
  amount: fromPaise(line.amount),
});

/** Lines go without ids: the server replaces the whole list. */
const toLineInput = (item: LineItem) => ({
  operation: item.operation,
  description: textOrNull(item.description),
  minutesPerPiece: item.minutesPerPiece,
  setupMinutes: item.setupMinutes,
  ratePerMinute: toPaise(item.ratePerMinute),
});

const toTotals = (totals: TotalsNode): Totals => ({
  subtotal: fromPaise(totals.subtotal),
  discount: fromPaise(totals.discount),
  taxable: fromPaise(totals.taxable),
  gstRate: totals.gstRate,
  supply: fromWireEnum(totals.supply),
  cgst: fromPaise(totals.cgst),
  sgst: fromPaise(totals.sgst),
  igst: fromPaise(totals.igst),
  gst: fromPaise(totals.gst),
  total: fromPaise(totals.total),
});

function toInvoice(node: InvoiceNode): Invoice {
  return {
    id: node.id,
    number: node.number,
    customerId: node.customerId,
    customerName: node.customerName,
    jobId: textOrEmpty(node.jobId),
    jobCardId: node.jobCardId,
    orderId: node.orderId,
    routeCard: textOrEmpty(node.routeCard),
    partName: node.part,
    quantity: node.quantity,
    status: fromWireEnum(node.status),
    lineItems: node.lines.map(toLineItem),
    discount: fromPaise(node.discount),
    gstRate: node.gstRate,
    quoteId: node.quoteId,
    poAmount: node.poAmount === null ? null : fromPaise(node.poAmount),
    notes: textOrEmpty(node.notes),
    issuedAt: node.issuedAt,
    dueDate: node.dueDate,
    payment: node.payment && {
      ...node.payment,
      receivedAmount: fromPaise(node.payment.receivedAmount),
      tdsAmount: fromPaise(node.payment.tdsAmount),
    },
    totals: toTotals(node.totals),
  };
}

function toQuote(node: QuoteNode): Quote {
  return {
    id: node.id,
    number: node.number,
    customerId: node.customerId,
    customerName: node.customerName,
    partName: node.part,
    quantity: node.quantity,
    material: textOrEmpty(node.material),
    status: fromWireEnum(node.status),
    lineItems: node.lines.map(toLineItem),
    gstRate: node.gstRate,
    orderId: node.orderId,
    createdAt: node.createdAt,
    totals: toTotals(node.totals),
  };
}

/** The editable invoice fields that were given, as the wire has them. */
function invoiceFields(input: Partial<InvoiceInput>) {
  return definedOnly({
    gstRate: input.gstRate,
    discount:
      input.discount === undefined ? undefined : toPaise(input.discount),
    lines: input.lineItems?.map(toLineInput),
    notes: input.notes === undefined ? undefined : textOrNull(input.notes),
    poAmount:
      input.poAmount === undefined || input.poAmount === null
        ? undefined
        : toPaise(input.poAmount),
  });
}

const sendVariables = (id: string, { to, cc }: SendInput = {}) =>
  definedOnly({
    id,
    to: textOrNull(to) ?? undefined,
    cc: cc?.length ? cc : undefined,
  });

/** Newest invoice first, every page. */
async function listInvoices(): Promise<Invoice[]> {
  const nodes = await fetchAllNodes<InvoiceNode>(
    `query Invoices($after: String) {
      invoices(
        first: ${PAGE_SIZE}
        after: $after
        sort: { field: NUMBER, direction: DESC }
      ) {
        edges { node { ...InvoiceFields } }
        pageInfo { hasNextPage endCursor }
      }
    }
    ${INVOICE_FIELDS}`,
    'invoices',
  );
  return nodes.map(toInvoice);
}

/**
 * Bills a job card (the server fills in its customer, part, quantity and
 * route card) or, without one, an invoice made by hand.
 */
async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const byHand = !input.jobCardId;
  const data = await graphqlRequest<{ createInvoice: InvoiceNode }>(
    `mutation CreateInvoice($input: InvoiceInput!) {
      createInvoice(input: $input) { ...InvoiceFields }
    }
    ${INVOICE_FIELDS}`,
    {
      input: {
        ...invoiceFields(input),
        gstRate: input.gstRate,
        lines: input.lineItems.map(toLineInput),
        ...definedOnly({
          jobCardId: input.jobCardId ?? undefined,
          quoteId: input.quoteId ?? undefined,
        }),
        ...(byHand && {
          customerId: input.customerId,
          part: input.partName.trim(),
          quantity: input.quantity,
          routeCard: textOrNull(input.routeCard),
        }),
      },
    },
  );
  return toInvoice(data.createInvoice);
}

/** Discount, GST rate, notes and lines; the status follows on the server. */
async function updateInvoice(
  id: string,
  changes: Partial<InvoiceInput>,
): Promise<Invoice> {
  const data = await graphqlRequest<{ updateInvoice: InvoiceNode }>(
    `mutation UpdateInvoice($id: ID!, $input: InvoiceUpdateInput!) {
      updateInvoice(id: $id, input: $input) { ...InvoiceFields }
    }
    ${INVOICE_FIELDS}`,
    {
      id,
      input: {
        ...invoiceFields(changes),
        ...definedOnly({
          part: changes.partName?.trim(),
          quantity: changes.quantity,
          routeCard:
            changes.routeCard === undefined
              ? undefined
              : textOrNull(changes.routeCard),
        }),
      },
    },
  );
  return toInvoice(data.updateInvoice);
}

/** Invoices are never deleted; the list has no Delete for them. */
async function removeInvoice(): Promise<string> {
  throw new Error('Invoices can’t be deleted');
}

/** Paid on a day, with the TDS the customer withheld (owner and accountant). */
async function markInvoicePaid(
  id: string,
  { paidOn, tds }: PaymentInput,
): Promise<Invoice> {
  const data = await graphqlRequest<{ markInvoicePaid: InvoiceNode }>(
    `mutation MarkInvoicePaid($id: ID!, $input: PaymentInput!) {
      markInvoicePaid(id: $id, input: $input) { ...InvoiceFields }
    }
    ${INVOICE_FIELDS}`,
    {
      id,
      input: {
        paidOn,
        ...(tds && {
          tds: { amount: toPaise(tds.amount), section: tds.section.trim() },
        }),
      },
    },
  );
  return toInvoice(data.markInvoicePaid);
}

/** Emails the PDF; `to` defaults to the customer's email on the server. */
async function sendInvoice(id: string, input?: SendInput): Promise<void> {
  await graphqlRequest(
    `mutation SendInvoice($id: ID!, $to: String, $cc: [String!]) {
      sendInvoice(id: $id, to: $to, cc: $cc) { id }
    }`,
    sendVariables(id, input),
  );
}

/** The invoice PDF (made by the server on first ask), to open or download. */
async function invoicePdf(id: string): Promise<FileReference | null> {
  const data = await graphqlRequest<{
    invoice: { pdfFile: FileReference | null };
  }>(
    `query InvoicePdf($id: ID!) {
      invoice(id: $id) { id pdfFile { id name kind sizeBytes } }
    }`,
    { id },
  );
  return data.invoice.pdfFile;
}

async function invoiceSummary(): Promise<InvoiceSummary> {
  const data = await graphqlRequest<{ invoiceSummary: InvoiceSummary }>(
    `query InvoiceSummary {
      invoiceSummary {
        total new overdue paid billedThisMonth outstanding overdueAmount
      }
    }`,
  );
  const s = data.invoiceSummary;
  return {
    ...s,
    billedThisMonth: fromPaise(s.billedThisMonth),
    outstanding: fromPaise(s.outstanding),
    overdueAmount: fromPaise(s.overdueAmount),
  };
}

// Only the owner and the accountant may record a payment; the app's session
// shows both (and the backend's admin) as "Admin", so ask for the real role.
const PAYMENT_ROLES = ['OWNER', 'ACCOUNTANT'];

async function permissions(): Promise<BillingPermissions> {
  const data = await graphqlRequest<{ me: { user: { role: string } } }>(
    'query BillingPermissions { me { user { id role } } }',
  );
  return {
    markPaid: PAYMENT_ROLES.includes(data.me.user.role.toUpperCase()),
  };
}

export const invoicesApi = {
  list: listInvoices,
  create: createInvoice,
  update: updateInvoice,
  remove: removeInvoice,
  markPaid: markInvoicePaid,
  send: sendInvoice,
  pdf: invoicePdf,
  summary: invoiceSummary,
  permissions,
};

/** Newest quote first, every page. */
async function listQuotes(): Promise<Quote[]> {
  const nodes = await fetchAllNodes<QuoteNode>(
    `query Quotes($after: String) {
      quotes(
        first: ${PAGE_SIZE}
        after: $after
        sort: { field: NUMBER, direction: DESC }
      ) {
        edges { node { ...QuoteFields } }
        pageInfo { hasNextPage endCursor }
      }
    }
    ${QUOTE_FIELDS}`,
    'quotes',
  );
  return nodes.map(toQuote);
}

/** A new quote is a draft, for a saved customer. */
async function createQuote(input: QuoteInput): Promise<Quote> {
  const data = await graphqlRequest<{ createQuote: QuoteNode }>(
    `mutation CreateQuote($input: QuoteInput!) {
      createQuote(input: $input) { ...QuoteFields }
    }
    ${QUOTE_FIELDS}`,
    {
      input: {
        customerId: input.customerId,
        part: input.partName.trim(),
        quantity: input.quantity,
        material: textOrNull(input.material),
        gstRate: input.gstRate,
        lines: input.lineItems.map(toLineInput),
      },
    },
  );
  return toQuote(data.createQuote);
}

/**
 * Part, quantity, material, GST rate and lines. The customer, status and
 * order aren't fields here: a quote keeps its customer, is sent with
 * sendQuote and linked to an order by convertQuoteToOrder.
 */
async function updateQuote(
  id: string,
  changes: Partial<QuoteInput>,
): Promise<Quote> {
  const data = await graphqlRequest<{ updateQuote: QuoteNode }>(
    `mutation UpdateQuote($id: ID!, $input: QuoteUpdateInput!) {
      updateQuote(id: $id, input: $input) { ...QuoteFields }
    }
    ${QUOTE_FIELDS}`,
    {
      id,
      input: definedOnly({
        part: changes.partName?.trim(),
        quantity: changes.quantity,
        material:
          changes.material === undefined
            ? undefined
            : textOrNull(changes.material),
        gstRate: changes.gstRate,
        lines: changes.lineItems?.map(toLineInput),
      }),
    },
  );
  return toQuote(data.updateQuote);
}

/** Only drafts can be deleted. */
async function deleteQuote(id: string): Promise<string> {
  await graphqlRequest(
    `mutation DeleteQuote($id: ID!) { deleteQuote(id: $id) }`,
    { id },
  );
  return id;
}

/** Draft → Sent, emailing the PDF; there's no way back to Draft. */
async function sendQuote(id: string, input?: SendInput): Promise<Quote> {
  const data = await graphqlRequest<{ sendQuote: QuoteNode }>(
    `mutation SendQuote($id: ID!, $to: String, $cc: [String!]) {
      sendQuote(id: $id, to: $to, cc: $cc) { ...QuoteFields }
    }
    ${QUOTE_FIELDS}`,
    sendVariables(id, input),
  );
  return toQuote(data.sendQuote);
}

/** A new work order from the quote; the quote comes back linked to it. */
async function convertQuote(
  id: string,
  input: ConvertQuoteInput,
): Promise<Quote> {
  const data = await graphqlRequest<{ convertQuoteToOrder: QuoteNode }>(
    `mutation ConvertQuoteToOrder($id: ID!, $input: ConvertQuoteInput!) {
      convertQuoteToOrder(id: $id, input: $input) { ...QuoteFields }
    }
    ${QUOTE_FIELDS}`,
    { id, input: { poNumber: input.poNumber.trim(), dueDate: input.dueDate } },
  );
  return toQuote(data.convertQuoteToOrder);
}

async function quotePdf(id: string): Promise<FileReference | null> {
  const data = await graphqlRequest<{
    quote: { pdfFile: FileReference | null };
  }>(
    `query QuotePdf($id: ID!) {
      quote(id: $id) { id pdfFile { id name kind sizeBytes } }
    }`,
    { id },
  );
  return data.quote.pdfFile;
}

export const quotesApi = {
  list: listQuotes,
  create: createQuote,
  update: updateQuote,
  remove: deleteQuote,
  send: sendQuote,
  convert: convertQuote,
  pdf: quotePdf,
};
