import type { PayloadAction } from '@reduxjs/toolkit';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { errorMessage } from '../../../shared/store';
import { jobCardsApi } from '../../jobCards/api/jobCardsApi';
import { jobCardActions } from '../../jobCards/store/jobCardsSlice';
import type { JobCard } from '../../jobCards/types';
import { ordersApi } from '../../orders/api/ordersApi';
import { orderActions } from '../../orders/store/ordersSlice';
import type { WorkOrder } from '../../orders/types';
import { invoicesApi, quotesApi } from '../api/billingApi';
import type {
  BillingPermissions,
  Invoice,
  InvoiceSummary,
  Quote,
} from '../types';
import { isEmailMissing } from '../utils';
import { invoiceForDispatch, jobCardOrderId } from '../workflow';
import { invoiceActions, quoteActions } from './billingSlices';
import { selectAllInvoices, selectAllQuotes } from './selectors';
import {
  workflowActions,
  type ConvertQuotePayload,
  type GenerateInvoicePayload,
  type MarkPaidPayload,
  type SendPayload,
} from './workflowSlice';

/** Quote → new work order (convertQuoteToOrder); the quote is linked to it. */
export function* convertQuote(action: PayloadAction<ConvertQuotePayload>) {
  try {
    const { quoteId, ...input } = action.payload;
    const converted: Quote = yield call(quotesApi.convert, quoteId, input);
    yield put(quoteActions.saveSuccess(converted));
    // The new order shows in Orders next time it's opened.
    yield put(orderActions.fetchRequest());
    yield put(workflowActions.convertQuoteSuccess(converted.orderId ?? ''));
  } catch (error) {
    yield put(
      workflowActions.failure(
        errorMessage(error, 'Failed to convert the quote'),
      ),
    );
  }
}

/**
 * Generate Dispatch → createInvoice for the job card (against the chosen
 * quote, or none). A job that was already billed opens its existing invoice
 * instead of a second one.
 */
export function* generateInvoice(
  action: PayloadAction<GenerateInvoicePayload>,
) {
  try {
    const { jobCardId, quoteId, gstRate } = action.payload;
    const invoices: Invoice[] = yield select(selectAllInvoices);
    const existing = invoices.find(i => i.jobCardId === jobCardId);
    if (existing) {
      yield put(workflowActions.generateInvoiceSuccess(existing.id));
      return;
    }
    const jobCard: JobCard = yield call(jobCardsApi.get, jobCardId);
    // The order's PO amount goes on the invoice.
    const orders: WorkOrder[] = yield call(ordersApi.list);
    const quotes: Quote[] = yield select(selectAllQuotes);
    const created: Invoice = yield call(
      invoicesApi.create,
      invoiceForDispatch(
        jobCard,
        orders.find(o => o.id === jobCardOrderId(jobCard)),
        quotes.find(q => q.id === quoteId),
        gstRate,
      ),
    );
    yield put(invoiceActions.saveSuccess(created));
    yield put(workflowActions.generateInvoiceSuccess(created.id));
    // Billed: the server marks the job card invoiced.
    const billed: JobCard = yield call(jobCardsApi.get, jobCardId);
    yield put(jobCardActions.saveSuccess(billed));
  } catch (error) {
    yield put(
      workflowActions.failure(
        errorMessage(error, 'Failed to create the invoice'),
      ),
    );
  }
}

/** markInvoicePaid: the invoice comes back Paid, with its payment. */
export function* markPaid(action: PayloadAction<MarkPaidPayload>) {
  try {
    const { invoiceId, payment } = action.payload;
    const paid: Invoice = yield call(invoicesApi.markPaid, invoiceId, payment);
    yield put(invoiceActions.saveSuccess(paid));
    yield put(workflowActions.done());
  } catch (error) {
    yield put(
      workflowActions.failure(errorMessage(error, 'Failed to mark it paid')),
    );
  }
}

/** sendInvoice / sendQuote. A sent quote comes back Sent. */
export function* send(action: PayloadAction<SendPayload>) {
  try {
    const { kind, id, to, cc } = action.payload;
    if (kind === 'quote') {
      const sent: Quote = yield call(quotesApi.send, id, { to, cc });
      yield put(quoteActions.saveSuccess(sent));
    } else {
      yield call(invoicesApi.send, id, { to, cc });
    }
    yield put(workflowActions.done());
  } catch (error) {
    const message = errorMessage(error, 'Failed to send it');
    yield put(
      isEmailMissing(error)
        ? workflowActions.emailMissing(message)
        : workflowActions.failure(message),
    );
  }
}

function* fetchSummary() {
  try {
    const summary: InvoiceSummary = yield call(invoicesApi.summary);
    yield put(workflowActions.fetchSummarySuccess(summary));
  } catch {
    // The list's own figures stand in until it loads.
  }
}

function* fetchPermissions() {
  try {
    const permissions: BillingPermissions = yield call(invoicesApi.permissions);
    yield put(workflowActions.fetchPermissionsSuccess(permissions));
  } catch {
    // Unknown: Mark as Paid stays hidden; the server checks anyway.
  }
}

export default function* workflowSaga() {
  yield takeLatest(workflowActions.convertQuoteRequest.type, convertQuote);
  yield takeLatest(
    workflowActions.generateInvoiceRequest.type,
    generateInvoice,
  );
  yield takeLatest(workflowActions.markPaidRequest.type, markPaid);
  yield takeLatest(workflowActions.sendRequest.type, send);
  // Loading, saving or paying invoices changes the counts and amounts.
  yield takeLatest(
    [
      workflowActions.fetchSummaryRequest.type,
      invoiceActions.fetchSuccess.type,
      invoiceActions.saveSuccess.type,
    ],
    fetchSummary,
  );
  yield takeLatest(
    workflowActions.fetchPermissionsRequest.type,
    fetchPermissions,
  );
}
