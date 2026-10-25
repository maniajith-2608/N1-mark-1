import { createAction } from '@reduxjs/toolkit';
import { createCrudSlice } from '../../../shared/store';
import type { OrderInput, WorkOrder } from '../types';
import { compareOrders } from '../utils';

export const ordersCrud = createCrudSlice<WorkOrder, OrderInput>(
  'orders',
  compareOrders,
);

export const orderActions = {
  ...ordersCrud.actions,
  /** Reads one order again, e.g. when its details open. */
  refreshRequest: createAction<string>('orders/refreshRequest'),
};
export default ordersCrud.reducer;
