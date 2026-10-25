import { combineReducers } from '@reduxjs/toolkit';
import { createCrudSlice } from '../../../shared/store';
import type { Invoice, InvoiceInput, Quote, QuoteInput } from '../types';
import workflowReducer from './workflowSlice';

// Newest number first ("CBE/26-27/0012" before "…/0011").
const byIdDesc = (a: { number: string }, b: { number: string }) =>
  b.number.localeCompare(a.number, undefined, { numeric: true });

export const invoicesCrud = createCrudSlice<Invoice, InvoiceInput>(
  'billing/invoices',
  byIdDesc,
);
export const quotesCrud = createCrudSlice<Quote, QuoteInput>(
  'billing/quotes',
  byIdDesc,
);

export const invoiceActions = invoicesCrud.actions;
export const quoteActions = quotesCrud.actions;

export default combineReducers({
  invoices: invoicesCrud.reducer,
  quotes: quotesCrud.reducer,
  workflow: workflowReducer,
});
