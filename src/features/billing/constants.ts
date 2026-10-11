import type { N1DropDownOption, N1Tab } from '../../shared/components';
import type { StatusMeta } from '../../shared/types';
import type { BillingTab, InvoiceStatus, QuoteStatus } from './types';

export const BILLING_STRINGS = {
  title: 'Billing',
  tabs: { invoices: 'Invoices', quotes: 'Quotes' },
  statusFilter: 'Status',
  view: 'View',
  edit: 'Edit',
  a11y: {
    view: (id: string) => `View ${id}`,
    download: (id: string) => `Download ${id}`,
    edit: (id: string) => `Edit ${id}`,
    delete: (id: string) => `Delete ${id}`,
  },
  invoices: {
    title: 'Invoices',
    /** Phone cards: the main action. */
    viewCard: 'View invoice',
    search: 'Search by invoice, customer or WO #',
    noun: 'invoices',
    /** Pagination bar: "Showing 10 of 13 invoices · 8 paid · 3 new · …". */
    summary: (
      showing: string,
      s: { paid: number; new: number; overdue: number },
      thisMonth: string,
    ) =>
      `${showing} · ${s.new} new · ${s.overdue} overdue · ${s.paid} paid · ${thisMonth} this month`,
    columns: {
      invoice: 'Invoice',
      customer: 'Customer',
      job: 'Job',
      routeCard: 'Route card',
      amount: 'Amount',
      status: 'Status',
      actions: 'Actions',
    },
  },
  quotes: {
    /** Phone cards: the main action and the date. */
    viewCard: 'View quote',
    create: 'Create Quote',
    createA11y: 'Create quote',
    title: 'Quotes',
    search: 'Search by quote, customer or WO #',
    noun: 'quotes',
    /** Pagination bar: "Showing 8 of 8 quotes · 1 draft · 7 sent". */
    summary: (showing: string, s: { draft: number; sent: number }) =>
      `${showing} · ${s.draft} draft · ${s.sent} sent`,
    columns: {
      id: 'Quote ID',
      customer: 'Customer',
      amount: 'Amount',
      status: 'Status',
      actions: 'Actions',
    },
    delete: {
      title: 'Delete quote?',
      message: (id: string) =>
        `This will permanently remove ${id} and its operations. This can’t be undone.`,
      confirm: 'Delete quote',
    },
    // Billed or converted: the invoice or order still points at it.
    deleteLocked: (id: string) =>
      `${id} is used by an invoice or order and can’t be deleted`,
  },
  dispatch: {
    title: 'Dispatch this order?',
    billedTitle: 'Already billed',
    confirm: (job: string, customer: string) =>
      `${job} goes to billing as a new invoice for ${customer}, from the job’s operations. You can fill in the rates next.`,
    dispatch: 'Dispatch',
    existing: (invoiceId: string) =>
      `This job is already billed on ${invoiceId}.`,
    open: 'Open invoice',
    created: 'Invoice created',
    createdMessage: (invoiceId: string) =>
      `${invoiceId} was added to billing as a new invoice.`,
  },
  invoice: {
    title: 'Invoice',
    back: 'Back to billing',
    backToJobCard: 'Back to job card',
    openOrder: (jobId: string) => `Open order ${jobId}`,
    quote: 'Quote',
    subtitle: (id: string, status: string) => `${id} · ${status}`,
    customer: 'Customer',
    jobId: 'Job ID',
    routeCard: 'Route card',
    partName: 'Part name',
    quantity: 'Quantity',
    status: 'Status',
    additional: 'Additional details',
    amount: 'Amount details',
    discount: 'Discount',
    poAmount: 'PO amount',
    notes: 'Notes',
    send: 'Send Invoice',
    sendAction: 'Sending invoices',
    preview: 'Preview Invoice',
    downloadPdf: 'Download PDF',
    downloadAction: 'Downloading PDFs',
    markPaid: 'Mark as Paid',
    notFound: 'This invoice no longer exists.',
    /** Phones: the invoice at a glance. */
    billedTo: 'Billed to',
    jobDetails: 'Job details',
    operationsSummary: (count: number, amount: string) =>
      `${count} ${count === 1 ? 'operation' : 'operations'} · ${amount}`,
    openOperations: 'Open process operations',
    editTitle: 'Edit invoice',
    editOperations: 'Edit process operations',
    /** Phones: the operations as a bill, edited one at a time. */
    doneEditing: 'Done',
    editOperation: 'Edit operation',
    editOperationOf: (name: string) => `Edit ${name}`,
    addOperation: 'Add operation',
    saveOperation: 'Save operation',
    deleteOperationOf: (name: string) => `Delete ${name}`,
    deleteOperationTitle: 'Delete operation?',
    deleteOperationMessage: (name: string, doc: string) =>
      `${name} will be removed from this ${doc}.`,
    docLabel: 'invoice',
    operationRequired: 'Enter the operation name',
    subtotal: (count: number) =>
      `Subtotal · ${count} ${count === 1 ? 'operation' : 'operations'}`,
    subtotalNote: 'Before discount and GST',
  },
  quote: {
    title: 'Quote Detail',
    heading: 'Quote',
    back: 'Back to quotes',
    backToCustomer: 'Back to customer',
    addTitle: 'Add Quote',
    newSubtitle: 'New quote',
    status: 'Status',
    order: 'Order',
    orderValue: (orderId: string) => `WO #${orderId}`,
    preview: 'Preview Quote',
    downloadPdf: 'Download PDF',
    customer: 'Customer',
    customerPlaceholder: 'Enter customer name',
    partName: 'Part name',
    partNamePlaceholder: 'Enter part name',
    quantity: 'Quantity',
    quantityPlaceholder: 'Enter quantity',
    notFound: 'This quote no longer exists.',
    /** Phones: the quote at a glance, and Edit quote. */
    docLabel: 'quote',
    partDetails: 'Part details',
    editTitle: 'Edit quote',
    details: 'Quote details',
    amount: 'Amount details',
    openOperations: 'Open process operations',
  },
  lineItems: {
    title: 'Process operations',
    customizableInvoice: 'Columns are customizable per invoice',
    customizableQuote: 'Columns are customizable per quote',
    customizableShort: 'Customizable',
    operation: 'Operation',
    description: 'Description',
    runningTime: 'Running time',
    setupTime: 'Setup time',
    rate: 'Rate',
    amount: 'Amount',
    addRow: 'Add row',
    remove: (name: string) => `Remove ${name || 'row'}`,
    minutesUnit: 'min',
    minutesHeader: 'Running time (min)',
    setupHeader: 'Setup time (min)',
    setupUnit: 'setup',
    rateHeader: 'Rate (₹/min)',
    rateUnit: '/min',
    operationPlaceholder: 'e.g. Facing',
    descriptionPlaceholder: 'e.g. OD facing both ends',
    minutes: (minutes: number) => `${minutes} min`,
    perMinute: (rate: string) => `${rate}/min`,
    none: 'No operations yet.',
    needsOne: 'Add at least one operation',
  },
  /** The invoice as it prints (Preview Invoice). */
  preview: {
    modalTitle: 'Invoice preview',
    title: 'INVOICE',
    number: 'Invoice no.',
    date: 'Date',
    gstin: (gstin: string) => `GSTIN ${gstin}`,
    terms: 'Terms & conditions',
    thanks: 'Thank you for your business.',
    print: 'Print',
    printAction: 'Printing invoices',
    quoteModalTitle: 'Quote preview',
    quoteTitle: 'QUOTATION',
    quoteNumber: 'Quote no.',
    quotePrintAction: 'Printing quotes',
  },
  totals: {
    subtotal: 'Subtotal',
    gst: 'GST',
    discount: 'Discount',
    total: 'Total',
    cgst: (rate: string) => `CGST ${rate}`,
    sgst: (rate: string) => `SGST ${rate}`,
    igst: (rate: string) => `IGST ${rate}`,
    noGst: 'GST not applied',
    gstRate: 'GST rate',
    gstRatePlaceholder: 'Select GST rate',
  },
} as const;

export const BILLING_TABS: N1Tab<BillingTab>[] = [
  { key: 'invoices', label: BILLING_STRINGS.tabs.invoices },
  { key: 'quotes', label: BILLING_STRINGS.tabs.quotes },
];

export const INVOICE_STATUS_META: Record<InvoiceStatus, StatusMeta> = {
  new: { label: 'New', tone: 'info' },
  overdue: { label: 'Overdue', tone: 'danger' },
  paid: { label: 'Paid', tone: 'success' },
};

export const QUOTE_STATUS_META: Record<QuoteStatus, StatusMeta> = {
  draft: { label: 'Draft', tone: 'neutral' },
  sent: { label: 'Sent', tone: 'info' },
};

export const INVOICE_STATUS_OPTIONS: N1DropDownOption<InvoiceStatus>[] = (
  Object.keys(INVOICE_STATUS_META) as InvoiceStatus[]
).map(value => ({ value, label: INVOICE_STATUS_META[value].label }));

export const QUOTE_STATUS_OPTIONS: N1DropDownOption<QuoteStatus>[] = (
  Object.keys(QUOTE_STATUS_META) as QuoteStatus[]
).map(value => ({ value, label: QUOTE_STATUS_META[value].label }));
