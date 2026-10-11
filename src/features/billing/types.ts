import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { CompositeScreenProps } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { AdminDrawerParamList } from '../dashboard/types';
import type { ISODateString } from '../../shared/types';
import type { GstSupply } from '../../shared/utils';

/** One process operation, charged per minute per piece. */
export type LineItem = {
  id: string;
  operation: string;
  description: string;
  /** Running time per piece. */
  minutesPerPiece: number;
  /** One-off setup before the batch runs. */
  setupMinutes: number;
  ratePerMinute: number;
};

/** Editable copy of a line item; numbers stay as text while typing. */
export type LineItemDraft = {
  id: string;
  operation: string;
  description: string;
  minutes: string;
  setup: string;
  rate: string;
  /** Unrounded saved rate, kept while the shown (rounded) text is untouched. */
  exactRate?: number;
};

/** A bill is New until it's paid; unpaid past its due date, Overdue. */
export type InvoiceStatus = 'new' | 'overdue' | 'paid';
/** A quote is a Draft until it's sent to the customer. */
export type QuoteStatus = 'draft' | 'sent';

export type Invoice = {
  id: string;
  customerName: string;
  /** e.g. "WO-00125". */
  jobId: string;
  routeCard: string;
  partName: string;
  quantity: number;
  status: InvoiceStatus;
  lineItems: LineItem[];
  discount: number;
  /** GST rate (%) charged; picked from the organization's active rates. */
  gstRate: number;
  /** The quote this was billed against, if any (to compare). */
  quoteId: string | null;
  /** The customer's PO value, from the order at dispatch; null if none. */
  poAmount: number | null;
  notes: string;
  issuedAt: ISODateString;
};

export type InvoiceInput = Omit<Invoice, 'id' | 'issuedAt'>;

export type Quote = {
  id: string;
  customerName: string;
  partName: string;
  quantity: number;
  material: string;
  status: QuoteStatus;
  lineItems: LineItem[];
  /** GST rate (%) charged; picked from the organization's active rates. */
  gstRate: number;
  /** The work order this quote was converted to. */
  orderId: string | null;
  createdAt: ISODateString;
};

export type QuoteInput = Omit<Quote, 'id' | 'createdAt'>;

export type Totals = {
  subtotal: number;
  discount: number;
  /** Subtotal after discount; GST is charged on this. */
  taxable: number;
  gstRate: number;
  /** Same state: CGST + SGST; other state: IGST; 'none': no GST. */
  supply: GstSupply;
  cgst: number;
  sgst: number;
  igst: number;
  /** All GST together. */
  gst: number;
  total: number;
};

export type BillingTab = 'invoices' | 'quotes';

// Stack nested inside the admin drawer's "Billing" item.
export type BillingStackParamList = {
  BillingHome: { tab?: BillingTab } | undefined;
  /**
   * fromJobCardId: opened from that job card, so Back returns to it.
   * edit: open with the invoice already in edit mode.
   */
  InvoiceDetails: { invoiceId: string; fromJobCardId?: string; edit?: boolean };
  /** Phones: Edit invoice, sliding up over the invoice. */
  InvoiceEdit: { invoiceId: string };
  /** Phones: an invoice's process operations, opened from the invoice. */
  InvoiceOperations: { invoiceId: string; edit?: boolean };
  /** Opened from a customer: Back returns there. */
  QuoteDetails: {
    quoteId: string;
    /** Open with the quote already in edit mode (the list's Edit). */
    edit?: boolean;
    fromCustomerId?: string;
  };
  /** Phones: Edit quote, sliding up over the quote. */
  QuoteEdit: { quoteId: string };
  /** Phones: a quote's process operations, opened from the quote. */
  QuoteOperations: { quoteId: string; edit?: boolean };
  /** Without an id the form creates a new quote. */
  QuoteForm: { quoteId?: string } | undefined;
};

export type BillingNavigation =
  NativeStackNavigationProp<BillingStackParamList>;

/** Screen props that can also reach the other admin drawer items. */
export type BillingScreenProps<R extends keyof BillingStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<BillingStackParamList, R>,
    DrawerScreenProps<AdminDrawerParamList>
  >;

/** Multi-select list filters; an empty list shows every row. */
export type InvoiceFilters = { status: InvoiceStatus[] };
export type QuoteFilters = { status: QuoteStatus[] };
