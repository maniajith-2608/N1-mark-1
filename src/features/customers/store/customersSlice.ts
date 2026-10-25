import { createAction, type Action } from '@reduxjs/toolkit';
import { createCrudSlice, type CrudState } from '../../../shared/store';
import type { Customer, CustomerInput } from '../types';

// Busiest accounts first.
const byActiveProjects = (a: Customer, b: Customer) =>
  b.currentProjects - a.currentProjects || a.name.localeCompare(b.name);

export const customersCrud = createCrudSlice<Customer, CustomerInput>(
  'customers',
  byActiveProjects,
);

/** Customer details: reload one customer's stats and activity. */
export const customerDetailsRequest = createAction<string>(
  'customers/detailsRequest',
);
/** The reloaded customer, put in place of the listed one. */
export const customerLoaded = createAction<Customer>('customers/loaded');

export const customerActions = customersCrud.actions;

export default function customersReducer(
  state: CrudState<Customer> | undefined,
  action: Action,
): CrudState<Customer> {
  if (state && customerLoaded.match(action)) {
    return customersCrud.adapter.upsertOne(state, action.payload);
  }
  return customersCrud.reducer(state, action);
}
