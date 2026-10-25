import { all, call, fork, put, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createCrudSaga } from '../../../shared/store';
import { customersApi } from '../api/customersApi';
import type { Customer } from '../types';
import {
  customerActions,
  customerDetailsRequest,
  customerLoaded,
} from './customersSlice';

export const customersSaga = createCrudSaga(
  customerActions,
  customersApi,
  'customers',
);

function* loadDetails(action: PayloadAction<string>) {
  try {
    const customer: Customer = yield call(customersApi.get, action.payload);
    yield put(customerLoaded(customer));
  } catch {
    // The listed copy stays on screen; the list's own load reports errors.
  }
}

export default function* watchCustomers() {
  yield all([
    fork(customersSaga.watch),
    takeLatest(customerDetailsRequest.type, loadDetails),
  ]);
}
