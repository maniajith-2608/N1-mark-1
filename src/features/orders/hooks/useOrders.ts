import { useEffect } from 'react';
import { useCrudResource } from '../../../shared/store';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import { orderActions } from '../store/ordersSlice';
import {
  selectAllOrders,
  selectNewOrderCount,
  selectOrderById,
  selectOrderStats,
  selectOrdersByDueDate,
  selectOrdersState,
} from '../store/selectors';

/**
 * Work orders, load state and create / update. Loads on first use. Each
 * order's status is the server's.
 */
export function useOrders() {
  return useCrudResource(orderActions, selectOrdersState, selectAllOrders);
}

/** One order; read again on open, as its status moves with the work. */
export function useOrder(id: string | undefined) {
  const resource = useOrders();
  const dispatch = useAppDispatch();
  const order = useAppSelector(state =>
    id ? selectOrderById(state, id) : undefined,
  );
  useEffect(() => {
    if (id) {
      dispatch(orderActions.refreshRequest(id));
    }
  }, [dispatch, id]);
  return { ...resource, order };
}

export const useOrderStats = () => useAppSelector(selectOrderStats);

/**
 * Orders by due date plus the "new orders" count, for the dashboard. Also
 * returns every order so the dashboard can count any period.
 */
export function usePriorityJobs() {
  const { items: orders, status, error, reload } = useOrders();
  const jobs = useAppSelector(selectOrdersByDueDate);
  const newOrders = useAppSelector(selectNewOrderCount);
  return { jobs, orders, newOrders, status, error, reload };
}
