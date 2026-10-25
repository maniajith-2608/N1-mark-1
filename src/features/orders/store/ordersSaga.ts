import type { PayloadAction } from '@reduxjs/toolkit';
import { call, put, takeEvery, takeLatest } from 'redux-saga/effects';
import { createCrudSaga, errorMessage } from '../../../shared/store';
import { jobCardsApi } from '../../jobCards/api/jobCardsApi';
import { jobCardActions } from '../../jobCards/store/jobCardsSlice';
import type { JobCard } from '../../jobCards/types';
import { ordersApi } from '../api/ordersApi';
import type { OrderInput, WorkOrder } from '../types';
import { orderActions } from './ordersSlice';

export const ordersSaga = createCrudSaga(orderActions, ordersApi, 'orders');

/**
 * createOrder opens the order's job card too; it joins the store so the
 * order's Job card tab and the Job Cards list show it straight away.
 */
export function* createOrder(action: PayloadAction<OrderInput>) {
  try {
    const order: WorkOrder = yield call(ordersApi.create, action.payload);
    if (order.jobCardId) {
      try {
        const card: JobCard = yield call(jobCardsApi.get, order.jobCardId);
        yield put(jobCardActions.received([card]));
      } catch {
        // The card still loads with the list or the order's details.
      }
    }
    yield put(orderActions.saveSuccess(order));
  } catch (error) {
    yield put(
      orderActions.saveFailure(errorMessage(error, 'Failed to save orders')),
    );
  }
}

/** Reads one order again (its status moves on with the shop floor). */
export function* refreshOne(action: PayloadAction<string>) {
  try {
    const order: WorkOrder = yield call(ordersApi.get, action.payload);
    yield put(orderActions.saveSuccess(order));
  } catch {
    // The list's copy stays; the screen shows it.
  }
}

export default function* watchOrders() {
  yield takeLatest(orderActions.fetchRequest.type, ordersSaga.fetchAll);
  yield takeEvery(orderActions.createRequest.type, createOrder);
  yield takeEvery(orderActions.updateRequest.type, ordersSaga.update);
  yield takeEvery(orderActions.deleteRequest.type, ordersSaga.remove);
  yield takeEvery(orderActions.refreshRequest.type, refreshOne);
}
