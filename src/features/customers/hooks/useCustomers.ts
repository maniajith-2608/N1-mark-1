import { useEffect, useMemo } from 'react';
import { useN1Theme } from '../../../shared/components';
import { useCrudResource } from '../../../shared/store';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import {
  customerActions,
  customerDetailsRequest,
} from '../store/customersSlice';
import {
  makeSelectCustomerShares,
  selectActiveOrderTotal,
  selectAllCustomers,
  selectCustomerById,
  selectCustomersState,
} from '../store/selectors';

/** Customers list, load state and create / update / delete. Loads on first use. */
export function useCustomers() {
  return useCrudResource(
    customerActions,
    selectCustomersState,
    selectAllCustomers,
  );
}

/** One customer; reloaded from the API on open so stats are current. */
export function useCustomer(id: string) {
  const dispatch = useAppDispatch();
  const resource = useCustomers();
  const customer = useAppSelector(state => selectCustomerById(state, id));
  useEffect(() => {
    dispatch(customerDetailsRequest(id));
  }, [dispatch, id]);
  return { ...resource, customer };
}

/** Share of active orders per customer, coloured for the donut chart. */
export function useCustomerShares() {
  const { status, error, reload } = useCustomers();
  const palette = useN1Theme().colors.chart;
  const selectShares = useMemo(
    () => makeSelectCustomerShares(palette),
    [palette],
  );
  const shares = useAppSelector(selectShares);
  const totalOrders = useAppSelector(selectActiveOrderTotal);
  return { shares, totalOrders, status, error, reload };
}
