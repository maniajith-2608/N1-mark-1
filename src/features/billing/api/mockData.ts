import { DAY_MS, isoAgo } from '../../../services/mock/mockServer';
import type { Invoice, LineItem, Quote } from '../types';
import { calculateTotals } from '../utils';

/** The mock backend's totals: the real ones come from the server. */
export const mockInvoiceTotals = (
  i: Pick<Invoice, 'lineItems' | 'quantity' | 'discount' | 'gstRate'>,
) => calculateTotals(i.lineItems, i.quantity, i.discount, i.gstRate);
export const mockQuoteTotals = (
  q: Pick<Quote, 'lineItems' | 'quantity' | 'gstRate'>,
) => calculateTotals(q.lineItems, q.quantity, 0, q.gstRate);

/** "WO-00125" → "125": the mock job card and order behind it. */
export const mockJobNumber = (jobId: string) =>
  jobId.replace(/\D/g, '').replace(/^0+/, '');

// Rates are per minute; ₹80/3 shows as ₹26.67 and keeps the design's round amounts.
const SHAFT_OPERATIONS: LineItem[] = [
  {
    id: 'op1',
    operation: 'Facing',
    description: 'OD facing both ends',
    minutesPerPiece: 2,
    setupMinutes: 0,
    ratePerMinute: 30,
  },
  {
    id: 'op2',
    operation: 'Turning',
    description: 'Turn to ⌀28 mm',
    minutesPerPiece: 5,
    setupMinutes: 0,
    ratePerMinute: 20,
  },
  {
    id: 'op3',
    operation: 'Drilling',
    description: 'Drill ⌀10 mm through',
    minutesPerPiece: 2,
    setupMinutes: 0,
    ratePerMinute: 80 / 3,
  },
  {
    id: 'op4',
    operation: 'Grinding',
    description: 'Finish grind OD',
    minutesPerPiece: 2,
    setupMinutes: 0,
    ratePerMinute: 80 / 3,
  },
];

// INV-2026-0125: the shaft route plus finishing steps, so its operations run
// long enough to scroll inside the invoice card.
const SHAFT_FULL_OPERATIONS: LineItem[] = [
  ...SHAFT_OPERATIONS,
  {
    id: 'op5',
    operation: 'Chamfering',
    description: 'Chamfer both ends 1 × 45°',
    minutesPerPiece: 1,
    setupMinutes: 0,
    ratePerMinute: 20,
  },
  {
    id: 'op6',
    operation: 'Threading',
    description: 'Thread M24 × 1.5 one end',
    minutesPerPiece: 2,
    setupMinutes: 0,
    ratePerMinute: 30,
  },
  {
    id: 'op7',
    operation: 'Keyway milling',
    description: 'Mill 8 mm keyway',
    minutesPerPiece: 3,
    setupMinutes: 0,
    ratePerMinute: 20,
  },
  {
    id: 'op8',
    operation: 'Deburring',
    description: 'Deburr all edges',
    minutesPerPiece: 1,
    setupMinutes: 0,
    ratePerMinute: 10,
  },
  {
    id: 'op9',
    operation: 'Inspection',
    description: 'Final dimensional check',
    minutesPerPiece: 1,
    setupMinutes: 0,
    ratePerMinute: 10,
  },
];

const BRACKET_OPERATIONS: LineItem[] = [
  {
    id: 'op1',
    operation: 'Cutting',
    description: 'Saw cut to length',
    minutesPerPiece: 1,
    setupMinutes: 0,
    ratePerMinute: 25,
  },
  {
    id: 'op2',
    operation: 'Milling',
    description: 'Face and slot',
    minutesPerPiece: 4,
    setupMinutes: 0,
    ratePerMinute: 30,
  },
  {
    id: 'op3',
    operation: 'Welding',
    description: 'Tack and full weld',
    minutesPerPiece: 3,
    setupMinutes: 0,
    ratePerMinute: 35,
  },
];

const FLANGE_OPERATIONS: LineItem[] = [
  {
    id: 'op1',
    operation: 'Turning',
    description: 'Face and bore',
    minutesPerPiece: 6,
    setupMinutes: 0,
    ratePerMinute: 22,
  },
  {
    id: 'op2',
    operation: 'Drilling',
    description: 'PCD holes ×6',
    minutesPerPiece: 3,
    setupMinutes: 0,
    ratePerMinute: 25,
  },
];

type InvoiceSeed = Omit<
  Invoice,
  | 'discount'
  | 'notes'
  | 'lineItems'
  | 'gstRate'
  | 'quoteId'
  | 'poAmount'
  // Filled in from the rest, as the server would.
  | 'number'
  | 'customerId'
  | 'jobCardId'
  | 'orderId'
  | 'dueDate'
  | 'payment'
  | 'totals'
> &
  Partial<
    Pick<Invoice, 'discount' | 'notes' | 'gstRate' | 'quoteId' | 'poAmount'>
  > & {
    lineItems?: LineItem[];
  };

// Seeded documents were issued at 5% GST.
const SEED_GST_RATE = 5;

const invoice = (seed: InvoiceSeed): Invoice => {
  const base = {
    discount: 0,
    gstRate: SEED_GST_RATE,
    quoteId: null,
    poAmount: null,
    notes: '',
    lineItems: SHAFT_OPERATIONS,
    ...seed,
  };
  const totals = mockInvoiceTotals(base);
  const day = base.issuedAt.slice(0, 10);
  return {
    ...base,
    number: base.id,
    customerId: '',
    jobCardId: mockJobNumber(base.jobId),
    orderId: mockJobNumber(base.jobId),
    dueDate: day,
    payment:
      base.status === 'paid'
        ? {
            paidOn: day,
            receivedAmount: totals.total,
            tdsAmount: 0,
            tdsSection: null,
          }
        : null,
    totals,
  };
};

export const MOCK_INVOICES: Invoice[] = [
  invoice({
    id: 'INV-2026-0125',
    customerName: 'ABC Engineering',
    // Billed against this quote (same customer, part and operations).
    quoteId: 'QT-2026-0042',
    jobId: 'WO-00125',
    routeCard: 'RC-2225',
    partName: 'Machined Shaft',
    quantity: 150,
    status: 'new',
    lineItems: SHAFT_FULL_OPERATIONS,
    // The customer's purchase order value.
    poAmount: 70000,
    issuedAt: isoAgo(DAY_MS),
  }),
  invoice({
    id: 'INV-2026-0124',
    customerName: 'Sri Metal Works',
    jobId: 'WO-00118',
    routeCard: 'RC-2218',
    partName: 'Bracket',
    quantity: 35,
    status: 'paid',
    lineItems: BRACKET_OPERATIONS,
    // The customer's purchase order value.
    poAmount: 10000,
    issuedAt: isoAgo(3 * DAY_MS),
  }),
  invoice({
    id: 'INV-2026-0123',
    customerName: 'Acme Metalworks',
    jobId: 'WO-00117',
    routeCard: 'RC-2217',
    partName: 'Machined Shaft',
    quantity: 230,
    status: 'paid',
    issuedAt: isoAgo(5 * DAY_MS),
  }),
  invoice({
    id: 'INV-2026-0122',
    customerName: 'Bright Steel Co.',
    jobId: 'WO-00114',
    routeCard: 'RC-2214',
    partName: 'Flange',
    quantity: 132,
    status: 'overdue',
    lineItems: FLANGE_OPERATIONS,
    // The customer's purchase order value.
    poAmount: 30000,
    issuedAt: isoAgo(40 * DAY_MS),
  }),
  invoice({
    id: 'INV-2026-0121',
    customerName: 'Nova Fabrication',
    jobId: 'WO-00110',
    routeCard: 'RC-2210',
    partName: 'Bracket',
    quantity: 68,
    status: 'paid',
    lineItems: BRACKET_OPERATIONS,
    issuedAt: isoAgo(8 * DAY_MS),
  }),
  invoice({
    id: 'INV-2026-0120',
    customerName: 'Silverline Industries',
    jobId: 'WO-00107',
    routeCard: 'RC-2207',
    partName: 'Housing',
    quantity: 78,
    status: 'new',
    issuedAt: isoAgo(10 * DAY_MS),
  }),
  invoice({
    id: 'INV-2026-0119',
    customerName: 'Meridian Components',
    jobId: 'WO-00103',
    routeCard: 'RC-2203',
    partName: 'Machined Shaft',
    quantity: 208,
    status: 'paid',
    discount: 2000,
    issuedAt: isoAgo(12 * DAY_MS),
  }),
  invoice({
    id: 'INV-2026-0118',
    customerName: 'Acme Metalworks',
    jobId: 'WO-00101',
    routeCard: 'RC-2201',
    partName: 'Bracket',
    quantity: 120,
    status: 'new',
    lineItems: BRACKET_OPERATIONS,
    issuedAt: isoAgo(15 * DAY_MS),
  }),
  invoice({
    id: 'INV-2026-0117',
    customerName: 'Bright Steel Co.',
    jobId: 'WO-00098',
    routeCard: 'RC-2198',
    partName: 'Flange',
    quantity: 90,
    status: 'paid',
    lineItems: FLANGE_OPERATIONS,
    issuedAt: isoAgo(33 * DAY_MS),
  }),
  invoice({
    id: 'INV-2026-0116',
    customerName: 'Nova Fabrication',
    jobId: 'WO-00095',
    routeCard: 'RC-2195',
    partName: 'Machined Shaft',
    quantity: 60,
    status: 'paid',
    issuedAt: isoAgo(36 * DAY_MS),
  }),
  invoice({
    id: 'INV-2026-0115',
    customerName: 'Silverline Industries',
    jobId: 'WO-00092',
    routeCard: 'RC-2192',
    partName: 'Housing',
    quantity: 45,
    status: 'overdue',
    issuedAt: isoAgo(48 * DAY_MS),
  }),
  invoice({
    id: 'INV-2026-0114',
    customerName: 'Meridian Components',
    jobId: 'WO-00090',
    routeCard: 'RC-2190',
    partName: 'Bracket',
    quantity: 50,
    status: 'paid',
    lineItems: BRACKET_OPERATIONS,
    issuedAt: isoAgo(52 * DAY_MS),
  }),
  invoice({
    id: 'INV-2026-0113',
    customerName: 'Nova Fabrication',
    // Paid: work order WO #1035 is complete.
    jobId: 'WO-01035',
    routeCard: 'RC-2203',
    partName: 'Flange',
    quantity: 90,
    status: 'paid',
    lineItems: FLANGE_OPERATIONS,
    issuedAt: isoAgo(60 * DAY_MS),
  }),
];

type QuoteSeed = Omit<
  Quote,
  | 'lineItems'
  | 'material'
  | 'partName'
  | 'quantity'
  | 'gstRate'
  | 'orderId'
  | 'number'
  | 'customerId'
  | 'totals'
> &
  Partial<
    Pick<
      Quote,
      'lineItems' | 'material' | 'partName' | 'quantity' | 'gstRate' | 'orderId'
    >
  >;

const quote = (seed: QuoteSeed): Quote => {
  const base = {
    gstRate: SEED_GST_RATE,
    orderId: null,
    lineItems: SHAFT_OPERATIONS,
    material: 'EN8',
    partName: 'Machined Shaft',
    quantity: 150,
    ...seed,
  };
  return {
    ...base,
    number: base.id,
    customerId: '',
    totals: mockQuoteTotals(base),
  };
};

export const MOCK_QUOTES: Quote[] = [
  quote({
    id: 'QT-2026-0042',
    customerName: 'ABC Engineering',
    status: 'sent',
    createdAt: isoAgo(DAY_MS),
  }),
  quote({
    id: 'QT-2026-0041',
    customerName: 'Sri Metal Works',
    status: 'sent',
    partName: 'Bracket',
    quantity: 80,
    material: 'MS',
    lineItems: BRACKET_OPERATIONS,
    createdAt: isoAgo(2 * DAY_MS),
  }),
  quote({
    id: 'QT-2026-0040',
    customerName: 'Acme Metalworks',
    status: 'sent',
    quantity: 220,
    createdAt: isoAgo(4 * DAY_MS),
  }),
  quote({
    id: 'QT-2026-0039',
    customerName: 'Bright Steel Co.',
    status: 'sent',
    partName: 'Flange',
    quantity: 100,
    material: 'SS304',
    lineItems: FLANGE_OPERATIONS,
    createdAt: isoAgo(6 * DAY_MS),
  }),
  quote({
    id: 'QT-2026-0038',
    customerName: 'Nova Fabrication',
    status: 'draft',
    partName: 'Bracket',
    quantity: 60,
    material: 'MS',
    lineItems: BRACKET_OPERATIONS,
    createdAt: isoAgo(7 * DAY_MS),
  }),
  quote({
    id: 'QT-2026-0037',
    customerName: 'Silverline Industries',
    status: 'sent',
    partName: 'Housing',
    quantity: 55,
    material: 'AL6061',
    createdAt: isoAgo(9 * DAY_MS),
  }),
  quote({
    id: 'QT-2026-0036',
    customerName: 'Meridian Components',
    status: 'sent',
    quantity: 40,
    createdAt: isoAgo(11 * DAY_MS),
  }),
  quote({
    id: 'QT-2026-0035',
    customerName: 'Bright Steel Co.',
    status: 'sent',
    partName: 'Flange',
    quantity: 75,
    material: 'SS304',
    lineItems: FLANGE_OPERATIONS,
    createdAt: isoAgo(14 * DAY_MS),
  }),
];
