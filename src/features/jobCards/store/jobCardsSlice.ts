import { createAction, type UnknownAction } from '@reduxjs/toolkit';
import { createCrudSlice, type CrudState } from '../../../shared/store';
import type { JobCard, JobCardCommand } from '../types';

// Unfinished work first, then by due date.
const byStatusThenDue = (a: JobCard, b: JobCard) =>
  Number(a.status === 'completed') - Number(b.status === 'completed') ||
  a.dueDate.localeCompare(b.dueDate);

// The server opens job cards with their orders and moves them on with one
// mutation per production step (commandRequest), so nothing here creates or
// patches a card; deleteRequest cancels one.
export const jobCardsCrud = createCrudSlice<JobCard, JobCard>(
  'jobCards',
  byStatusThenDue,
);

export type JobCardCommandPayload = { id: string; command: JobCardCommand };
/** Where a single card is loaded from: its id, or its order's. */
export type FetchOnePayload = { id: string } | { orderId: string };

const extraActions = {
  /** Runs one production move; saveSuccess / saveFailure report back. */
  commandRequest: createAction<JobCardCommandPayload>(
    'jobCards/commandRequest',
  ),
  /** Loads (or refreshes) one card without loading the whole list. */
  fetchOneRequest: createAction<FetchOnePayload>('jobCards/fetchOneRequest'),
  /** missing: the card doesn't exist (or isn't this user's to open). */
  fetchOneFailure: createAction<{ error: string; missing: boolean }>(
    'jobCards/fetchOneFailure',
  ),
  /** Cards read elsewhere (myJobs, a scan) join the store. */
  received: createAction<JobCard[]>('jobCards/received'),
};

export const jobCardActions = { ...jobCardsCrud.actions, ...extraActions };

export type JobCardsState = CrudState<JobCard> & {
  /** A single card is loading (fetchOneRequest). */
  loadingOne: boolean;
  loadOneError: string | null;
  /** The last card asked for doesn't exist. */
  missing: boolean;
};

const crudReducer = jobCardsCrud.reducer;
const { adapter } = jobCardsCrud;

export default function jobCardsReducer(
  state: JobCardsState | undefined,
  action: UnknownAction,
): JobCardsState {
  const next = crudReducer(state, action) as JobCardsState;
  // The crud reducer keeps these once they're in the state.
  const base: JobCardsState = state
    ? next
    : { ...next, loadingOne: false, loadOneError: null, missing: false };
  if (extraActions.commandRequest.match(action)) {
    return { ...base, saving: true, saveError: null };
  }
  if (extraActions.fetchOneRequest.match(action)) {
    return { ...base, loadingOne: true, loadOneError: null, missing: false };
  }
  if (extraActions.fetchOneFailure.match(action)) {
    return {
      ...base,
      loadingOne: false,
      loadOneError: action.payload.missing ? null : action.payload.error,
      missing: action.payload.missing,
    };
  }
  if (extraActions.received.match(action)) {
    return {
      ...adapter.upsertMany(base, action.payload),
      loadingOne: false,
    };
  }
  return base;
}
