import type { PayloadAction } from '@reduxjs/toolkit';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import type { RootState } from '../../../app/store';
import { errorMessage } from '../../../shared/store';
import { jobCardsApi } from '../../jobCards/api/jobCardsApi';
import { isNotFound, refreshOrder } from '../../jobCards/store/jobCardsSaga';
import { jobCardActions } from '../../jobCards/store/jobCardsSlice';
import type { JobCard } from '../../jobCards/types';
import { normaliseJobCode } from '../../jobCards/utils';
import { ordersApi } from '../../orders/api/ordersApi';
import { ORDER_STRINGS } from '../../orders/constants';
import { orderActions } from '../../orders/store/ordersSlice';
import type { WorkOrder } from '../../orders/types';
import type { EmployeeRole } from '../../profile/types';
import { myJobsApi } from '../api/myJobsApi';
import { JOBS_STRINGS, ROLE_JOBS } from '../constants';
import type { QcQueueEntry } from '../qc';
import {
  myJobsActions,
  type ImportJobPayload,
  type LookupJobPayload,
} from './myJobsSlice';

export function* fetchMyJobs(action: PayloadAction<EmployeeRole>) {
  try {
    const role = action.payload;
    const cards: JobCard[] = yield call(myJobsApi.list, role);
    // QC's rows show each check as the server's queue has it.
    const qcQueue: QcQueueEntry[] | undefined =
      ROLE_JOBS[role].importTo === 'qc'
        ? yield call(myJobsApi.qcQueue)
        : undefined;
    yield put(jobCardActions.received(cards));
    yield put(
      myJobsActions.fetchSuccess({ ids: cards.map(c => c.id), qcQueue }),
    );
  } catch (error) {
    yield put(
      myJobsActions.fetchFailure(errorMessage(error, 'Failed to load jobs')),
    );
  }
}

/** The list with this job on top (once). */
function* withJob(jobCardId: string) {
  const ids: string[] = yield select((state: RootState) => state.myJobs.ids);
  return [jobCardId, ...ids.filter(id => id !== jobCardId)];
}

/**
 * Supervisor: the order behind a work order number that has no job card yet
 * (FE-007: the card opens once its raw material is in). Rethrows the lookup's
 * not-found for anything else.
 */
function* orderWithoutCard(code: string, notFound: unknown) {
  const value = normaliseJobCode(code);
  if (!value.startsWith('WO-')) {
    throw notFound;
  }
  let order: WorkOrder;
  try {
    order = yield call(ordersApi.findByNumber, value);
  } catch {
    // Best effort: the code lookup already found nothing.
    throw notFound;
  }
  if (order.jobCardId) {
    throw notFound;
  }
  yield put(orderActions.saveSuccess(order));
  return order;
}

/**
 * A typed or scanned code → its job (jobCardByQr). Operators open only jobs
 * assigned to them (others aren't found); QC adds the job to their list. A
 * supervisor also finds an order that has no job card yet, to import it with
 * its raw material.
 */
export function* lookupJob(action: PayloadAction<LookupJobPayload>) {
  const { role, code } = action.payload;
  try {
    let card: JobCard;
    try {
      card = yield call(jobCardsApi.getByQr, code);
    } catch (error) {
      if (!isNotFound(error) || ROLE_JOBS[role].importTo !== 'order') {
        throw error;
      }
      const order: WorkOrder = yield call(orderWithoutCard, code, error);
      yield put(
        myJobsActions.lookupSuccess({
          found: { jobCardId: '', orderId: order.id },
        }),
      );
      return;
    }
    yield put(jobCardActions.received([card]));
    const found = { jobCardId: card.id, orderId: card.orderId };
    if (ROLE_JOBS[role].importTo === 'qc') {
      yield call(myJobsApi.watch, role, card.id);
      const ids: string[] = yield call(withJob, card.id);
      yield put(myJobsActions.lookupSuccess({ found, ids }));
    } else {
      yield put(myJobsActions.lookupSuccess({ found }));
    }
  } catch (error) {
    yield put(
      myJobsActions.importFailure(
        isNotFound(error)
          ? ROLE_JOBS[role].importTo === 'job'
            ? JOBS_STRINGS.code.notAssigned(code.trim())
            : JOBS_STRINGS.code.notFound(code.trim())
          : errorMessage(error, 'Failed to find the job'),
      ),
    );
  }
}

/**
 * Supervisor: saves the raw material on the job card, then lists the job. An
 * order without a card takes the material itself, which opens its card.
 */
export function* importJob(action: PayloadAction<ImportJobPayload>) {
  try {
    const { role, orderId, rawMaterial } = action.payload;
    let { jobCardId } = action.payload;
    if (!jobCardId) {
      const order: WorkOrder = yield call(
        ordersApi.update,
        orderId,
        rawMaterial ?? {},
      );
      yield put(orderActions.saveSuccess(order));
      if (!order.jobCardId) {
        throw new Error(
          JOBS_STRINGS.rawMaterial.noJobCard(
            ORDER_STRINGS.workOrder(order.number),
          ),
        );
      }
      jobCardId = order.jobCardId;
    } else if (rawMaterial) {
      const card: JobCard = yield call(jobCardsApi.run, jobCardId, {
        type: 'rawMaterial',
        rawMaterial,
      });
      yield put(jobCardActions.saveSuccess(card));
      // The material is saved on the order too.
      yield call(refreshOrder, card.orderId);
    }
    const watched: JobCard = yield call(myJobsApi.watch, role, jobCardId);
    yield put(jobCardActions.received([watched]));
    const ids: string[] = yield call(withJob, jobCardId);
    yield put(myJobsActions.importSuccess(ids));
  } catch (error) {
    yield put(
      myJobsActions.importFailure(
        errorMessage(error, 'Failed to import the job'),
      ),
    );
  }
}

export default function* myJobsSaga() {
  yield takeLatest(myJobsActions.fetchRequest.type, fetchMyJobs);
  yield takeLatest(myJobsActions.lookupRequest.type, lookupJob);
  yield takeLatest(myJobsActions.importRequest.type, importJob);
}
