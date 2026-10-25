import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  BillingPermissions,
  ConvertQuoteInput,
  InvoiceSummary,
  PaymentInput,
  SendInput,
} from '../types';

/**
 * Steps beyond plain saves: quote → order, dispatch → invoice, mark paid,
 * send by email; plus the server's summary and what this user may do.
 */
export type WorkflowState = {
  busy: boolean;
  error: string | null;
  /** Set when a quote has been converted. */
  orderId: string | null;
  /** Set when a dispatch has been billed. */
  invoiceId: string | null;
  /** The last send failed: the customer has no email on file. */
  emailMissing: boolean;
  /** invoiceSummary: the Billing screen's counts and amounts. */
  summary: InvoiceSummary | null;
  /** null until loaded. */
  permissions: BillingPermissions | null;
};

const initialState: WorkflowState = {
  busy: false,
  error: null,
  orderId: null,
  invoiceId: null,
  emailMissing: false,
  summary: null,
  permissions: null,
};

export type GenerateInvoicePayload = {
  jobCardId: string;
  /** The customer's quote to bill against; null for "No quote". */
  quoteId: string | null;
  /** Used without a quote: the organization's default GST rate. */
  gstRate: number;
};

export type ConvertQuotePayload = ConvertQuoteInput & { quoteId: string };
export type MarkPaidPayload = { invoiceId: string; payment: PaymentInput };
export type SendPayload = SendInput & {
  kind: 'invoice' | 'quote';
  id: string;
};

const start = (state: WorkflowState) => {
  state.busy = true;
  state.error = null;
  state.emailMissing = false;
};

const workflowSlice = createSlice({
  name: 'billing/workflow',
  initialState,
  reducers: {
    convertQuoteRequest: (
      state,
      _action: PayloadAction<ConvertQuotePayload>,
    ) => {
      start(state);
      state.orderId = null;
    },
    convertQuoteSuccess: (state, action: PayloadAction<string>) => {
      state.busy = false;
      state.orderId = action.payload;
    },
    generateInvoiceRequest: (
      state,
      _action: PayloadAction<GenerateInvoicePayload>,
    ) => {
      start(state);
      state.invoiceId = null;
    },
    generateInvoiceSuccess: (state, action: PayloadAction<string>) => {
      state.busy = false;
      state.invoiceId = action.payload;
    },
    markPaidRequest: (state, _action: PayloadAction<MarkPaidPayload>) => {
      start(state);
    },
    sendRequest: (state, _action: PayloadAction<SendPayload>) => {
      start(state);
    },
    /** Paid or sent. */
    done: state => {
      state.busy = false;
    },
    emailMissing: (state, action: PayloadAction<string>) => {
      state.busy = false;
      state.error = action.payload;
      state.emailMissing = true;
    },
    failure: (state, action: PayloadAction<string>) => {
      state.busy = false;
      state.error = action.payload;
    },
    clearError: state => {
      state.error = null;
      state.emailMissing = false;
    },
    fetchSummaryRequest: () => undefined,
    fetchSummarySuccess: (state, action: PayloadAction<InvoiceSummary>) => {
      state.summary = action.payload;
    },
    fetchPermissionsRequest: () => undefined,
    fetchPermissionsSuccess: (
      state,
      action: PayloadAction<BillingPermissions>,
    ) => {
      state.permissions = action.payload;
    },
  },
});

export const workflowActions = workflowSlice.actions;
export default workflowSlice.reducer;
