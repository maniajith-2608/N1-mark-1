import { isBlank } from '../../shared/utils';
import type { WorkOrder } from '../orders/types';
import type { JobCard } from '../jobCards/types';
import type { OrderView, RawMaterialInput } from './types';

/** The job view of a work order, from its job card (operator, QC). */
export const jobViewOf = (c: JobCard): OrderView => ({
  id: c.orderId,
  number: c.number,
  customerName: c.customerName,
  partName: c.partName,
  jobName: c.jobName,
  description: '',
  priority: c.priority,
  dueDate: c.dueDate,
  quantity: c.quantity,
  partNumber: c.partNumber ?? '',
  drawingNumber: c.drawingNumber ?? '',
  poNumber: c.poNumber ?? '',
  routeCardNo: c.routeCardNo ?? '',
  materialSource: c.materialSource,
});

export const rawMaterialOf = (order: WorkOrder): RawMaterialInput => ({
  rawMaterialGrade: order.rawMaterialGrade,
  rawMaterialSize: order.rawMaterialSize,
  heatNumber: order.heatNumber,
  rmPartNumber: order.rmPartNumber,
  materialSource: order.materialSource,
});

/** True when any raw material detail needed for a job card is blank. */
export const isRawMaterialMissing = (order: WorkOrder) =>
  Object.values(rawMaterialOf(order)).some(isBlank);
