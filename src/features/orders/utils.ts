import { formatDate, workOrderSearchTerms } from '../../shared/utils';
import { matchesAny } from '../../shared/hooks';
import { ORDER_STRINGS, PRIORITY_META } from './constants';
import type { JobCard } from '../jobCards/types';
import { jobCardStage } from '../jobCards/utils';
import { RAW_MATERIAL_FIELDS } from './components/orderForm';
import type {
  OrderFilters,
  OrderStatus,
  OrderSummary,
  WorkOrder,
} from './types';

/** "Bracket — Job A"; falls back to the description for new orders. */
export function orderTitle(
  o: Pick<WorkOrder, 'partName' | 'jobName' | 'description'>,
): string {
  const title = [o.partName, o.jobName].filter(Boolean).join(' — ');
  return title || o.description.split('\n')[0] || '';
}

/**
 * Whether an order is work order `code` ("WO-12", as normaliseJobCode writes
 * a typed or scanned one). The server numbers orders "WO-12"; mock seeds
 * use a bare "12".
 */
export const isWorkOrder = (o: Pick<WorkOrder, 'number'>, code: string) =>
  `WO-${o.number.replace(/^WO-?/i, '')}` === code;

/** "WO #1042 · Bracket — Job A" */
export const orderHeading = (
  o: Pick<WorkOrder, 'number' | 'partName' | 'jobName' | 'description'>,
) =>
  [ORDER_STRINGS.workOrder(o.number), orderTitle(o)]
    .filter(Boolean)
    .join(' · ');

/**
 * What an order's QR code holds: the WO number on the first line, which is all
 * the Scan QR screen reads, then the entered details for anyone scanning it
 * with a phone camera. Blank details are left out.
 */
export function orderQrValue(o: OrderSummary): string {
  const Q = ORDER_STRINGS.qr;
  const details: [string, string][] = [
    [Q.customer, o.customerName],
    [Q.part, orderTitle(o)],
    [Q.partNumber, o.partNumber],
    [Q.drawingNumber, o.drawingNumber],
    [Q.poNumber, o.poNumber],
    [Q.quantity, o.quantity ? String(o.quantity) : ''],
    [Q.dueDate, formatDate(o.dueDate)],
  ];
  return [
    ORDER_STRINGS.workOrder(o.number),
    ...details
      .filter(([, value]) => value.trim())
      .map(([label, value]) => `${label}: ${value.trim()}`),
  ].join('\n');
}

/** High before medium before low; then earliest due date; undated last. */
export function compareOrders(a: WorkOrder, b: WorkOrder): number {
  const byPriority =
    PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
  if (byPriority !== 0) {
    return byPriority;
  }
  if (a.dueDate && b.dueDate) {
    return a.dueDate.localeCompare(b.dueDate);
  }
  return a.dueDate
    ? -1
    : b.dueDate
    ? 1
    : b.createdAt.localeCompare(a.createdAt);
}

export const orderSearchText = (o: WorkOrder) =>
  `${workOrderSearchTerms(o.number.replace(/^WO-?/i, ''))} ${o.partName} ${
    o.jobName
  } ${o.customerName} ${o.poNumber} ${o.routeCardNo} ${o.description}`;

export const matchesOrderFilters = (o: WorkOrder, f: OrderFilters) =>
  matchesAny(f.priority, o.priority) && matchesAny(f.status, o.status);

export const INITIAL_ORDER_FILTERS: OrderFilters = {
  priority: [],
  status: [],
};

export const isOpen = (o: WorkOrder) => o.status !== 'completed';

/** Every raw material detail is filled in: the material is in. */
export const rawMaterialArrived = (o: WorkOrder) =>
  RAW_MATERIAL_FIELDS.every(key => o[key] !== '');

/**
 * The status the server gives an order, from its job card's stage and its
 * invoice (the in-memory API uses this to play the server's part):
 * - Completed: the invoice is paid.
 * - Payment due: ready to dispatch or dispatched; not paid yet.
 * - Paused: an operation is paused, or RM QC rejected the material.
 * - In progress: RM QC passed, or machining / QC is under way.
 * - Yet to start: job card made and raw material in, RM QC still to do.
 * - New: no job card yet, or its raw material isn't in.
 */
export function orderStatus(
  o: WorkOrder,
  jobCard: JobCard | undefined,
  paid: boolean,
): OrderStatus {
  if (paid) {
    return 'completed';
  }
  if (!jobCard) {
    return 'new';
  }
  const stage = jobCardStage(jobCard);
  switch (stage.key) {
    case 'ready_to_dispatch':
    case 'done':
      return 'payment_due';
    case 'rm_qc_failed':
      return 'paused';
    case 'operation':
      return stage.state === 'paused' ? 'paused' : 'in_progress';
    case 'rm_received':
      return rawMaterialArrived(o) ? 'yet_to_start' : 'new';
    default:
      return 'in_progress';
  }
}
