import type { PayloadAction } from '@reduxjs/toolkit';
import { call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import type { RootState } from '../../../app/store';
import { ApiError } from '../../../services/api';
import { MockNotFoundError } from '../../../services/mock/mockServer';
import { errorMessage } from '../../../shared/store';
import { ordersApi } from '../../orders/api/ordersApi';
import { orderActions } from '../../orders/store/ordersSlice';
import type { WorkOrder } from '../../orders/types';
import { jobCardsApi } from '../api/jobCardsApi';
import type { JobCard } from '../types';
import {
  jobCardActions,
  type FetchOnePayload,
  type JobCardCommandPayload,
} from './jobCardsSlice';

export function* fetchAll() {
  try {
    const rows: JobCard[] = yield call(jobCardsApi.list);
    yield put(jobCardActions.fetchSuccess(rows));
  } catch (error) {
    yield put(
      jobCardActions.fetchFailure(
        errorMessage(error, 'Failed to load job cards'),
      ),
    );
  }
}

/** JOB_CARD_NOT_FOUND / ORDER_NOT_FOUND: gone, or another shop's. */
export const isNotFound = (error: unknown) =>
  error instanceof MockNotFoundError ||
  (error instanceof ApiError && /NOT_FOUND$/.test(error.code ?? ''));

export function* fetchOne(action: PayloadAction<FetchOnePayload>) {
  try {
    const card: JobCard =
      'id' in action.payload
        ? yield call(jobCardsApi.get, action.payload.id)
        : yield call(jobCardsApi.getByOrder, action.payload.orderId);
    yield put(jobCardActions.received([card]));
  } catch (error) {
    yield put(
      jobCardActions.fetchOneFailure({
        error: errorMessage(error, 'Failed to load the job card'),
        missing: isNotFound(error),
      }),
    );
  }
}

/**
 * The order's status moves with its job card (set by the server), so an
 * order this user has loaded is read again after a production move.
 */
export function* refreshOrder(orderId: string) {
  const loaded: boolean = yield select(
    (state: RootState) => orderId in state.orders.entities,
  );
  if (!loaded) {
    return;
  }
  try {
    const order: WorkOrder = yield call(ordersApi.get, orderId);
    yield put(orderActions.saveSuccess(order));
  } catch {
    // Best effort: the order screen reloads it anyway.
  }
}

export function* runCommand(action: PayloadAction<JobCardCommandPayload>) {
  try {
    const { id, command } = action.payload;
    const card: JobCard = yield call(jobCardsApi.run, id, command);
    yield put(jobCardActions.saveSuccess(card));
    yield call(refreshOrder, card.orderId);
  } catch (error) {
    yield put(
      jobCardActions.saveFailure(
        errorMessage(error, 'Failed to update the job card'),
      ),
    );
  }
}

/** Cancels the card (job cards are never deleted). */
export function* cancel(action: PayloadAction<string>) {
  try {
    const card: JobCard | undefined = yield select(
      (state: RootState) => state.jobCards.entities[action.payload],
    );
    const id: string = yield call(jobCardsApi.remove, action.payload);
    yield put(jobCardActions.deleteSuccess(id));
    if (card) {
      yield call(refreshOrder, card.orderId);
    }
  } catch (error) {
    yield put(
      jobCardActions.deleteFailure(
        errorMessage(error, 'Failed to cancel the job card'),
      ),
    );
  }
}

export default function* jobCardsSaga() {
  yield takeLatest(jobCardActions.fetchRequest.type, fetchAll);
  yield takeEvery(jobCardActions.fetchOneRequest.type, fetchOne);
  yield takeEvery(jobCardActions.commandRequest.type, runCommand);
  yield takeEvery(jobCardActions.deleteRequest.type, cancel);
}
