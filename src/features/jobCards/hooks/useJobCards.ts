import { useCallback, useEffect } from 'react';
import { useCrudResource } from '../../../shared/store';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import type { RootState } from '../../../app/store';
import { jobCardActions } from '../store/jobCardsSlice';
import {
  selectAllJobCards,
  selectJobCardById,
  selectJobCardStats,
  selectJobCardsState,
} from '../store/selectors';
import type { JobCard, JobCardCommand } from '../types';

/**
 * Every job card, load state and cancel. Loads on first use. Operators may
 * not list job cards: their screens use useJobCard and My Jobs.
 */
export function useJobCards() {
  return useCrudResource(
    jobCardActions,
    selectJobCardsState,
    selectAllJobCards,
  );
}

/** Production moves (one mutation each) and their save state. */
export function useJobCardCommands() {
  const dispatch = useAppDispatch();
  const saving = useAppSelector(state => selectJobCardsState(state).saving);
  const saveError = useAppSelector(
    state => selectJobCardsState(state).saveError,
  );
  const run = useCallback(
    (id: string, command: JobCardCommand) =>
      dispatch(jobCardActions.commandRequest({ id, command })),
    [dispatch],
  );
  const clearErrors = useCallback(
    () => dispatch(jobCardActions.clearErrors()),
    [dispatch],
  );
  return { run, saving, saveError, clearErrors };
}

/** One card's load state, read from the store and refreshed on open. */
function useOneCard(
  jobCard: JobCard | undefined,
  load: (() => void) | undefined,
) {
  const loadingOne = useAppSelector(
    state => selectJobCardsState(state).loadingOne,
  );
  const error = useAppSelector(
    state => selectJobCardsState(state).loadOneError,
  );
  const missing = useAppSelector(state => selectJobCardsState(state).missing);
  // Always read it again on open: the shop floor moves it on meanwhile.
  useEffect(() => {
    load?.();
  }, [load]);
  // A card that doesn't exist has loaded: the screen says so.
  const status =
    jobCard || (missing && !loadingOne)
      ? ('succeeded' as const)
      : error && !loadingOne
      ? ('failed' as const)
      : ('loading' as const);
  return { status, error, reload: load ?? noop };
}

const noop = () => undefined;

/**
 * One job card by its id, with its production moves (`run`). Loads just
 * that card, so every role can use it.
 */
export function useJobCard(id: string | undefined) {
  const dispatch = useAppDispatch();
  const jobCard = useAppSelector(state =>
    id ? selectJobCardById(state, id) : undefined,
  );
  const load = useCallback(() => {
    if (id) {
      dispatch(jobCardActions.fetchOneRequest({ id }));
    }
  }, [dispatch, id]);
  const commands = useJobCardCommands();
  const { run } = commands;
  const runOnCard = useCallback(
    (command: JobCardCommand) => {
      if (id) {
        run(id, command);
      }
    },
    [run, id],
  );
  return {
    ...commands,
    ...useOneCard(jobCard, id ? load : undefined),
    jobCard,
    run: runOnCard,
  };
}

const selectByOrder = (state: RootState, orderId: string) =>
  selectAllJobCards(state).find(c => c.orderId === orderId);

/** The job card of an order (the shop floor's job view of it). */
export function useJobCardForOrder(orderId: string | undefined) {
  const dispatch = useAppDispatch();
  const jobCard = useAppSelector(state =>
    orderId ? selectByOrder(state, orderId) : undefined,
  );
  const load = useCallback(() => {
    if (orderId) {
      dispatch(jobCardActions.fetchOneRequest({ orderId }));
    }
  }, [dispatch, orderId]);
  // Opened over its job (already loaded), so it's only read when missing,
  // e.g. after a reload.
  const missing = Boolean(orderId) && !jobCard;
  const { status, error } = useOneCard(jobCard, missing ? load : undefined);
  return { status, error, reload: load, jobCard };
}

export const useJobCardStats = () => useAppSelector(selectJobCardStats);
