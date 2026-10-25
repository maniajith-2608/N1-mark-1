import type { Invoice } from '../billing';
import { invoiceTotal } from '../billing';
import type { WorkOrder } from '../orders';
import type { JobCard } from '../jobCards';
import { ALL, DUE_SOON_DAYS } from './constants';
import type { CustomerShare } from '../customers';
import { JOB_CARD_STRINGS } from '../jobCards';
import type {
  CustomerRow,
  PriorityJob,
  DashboardPeriod,
  MenuItem,
  OrgUser,
  PeriodSummary,
} from './types';

/** Menu items for the current layout, narrowed by the sidebar search. */
export function visibleMenuItems(
  items: MenuItem[],
  { compact, query }: { compact: boolean; query: string },
): MenuItem[] {
  const q = query.trim().toLowerCase();
  return items.filter(
    item =>
      (!compact || item.onCompact) &&
      (!q || item.label.toLowerCase().includes(q)),
  );
}

export type UserFilters = { query: string; role: string; status: string };

export function filterUsers(users: OrgUser[], filters: UserFilters): OrgUser[] {
  const q = filters.query.trim().toLowerCase();
  return users.filter(
    user =>
      (!q ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)) &&
      (filters.role === ALL || user.role === filters.role) &&
      (filters.status === ALL || user.status === filters.status),
  );
}

/** Start of the current calendar week (Monday), month or year. */
export function periodStart(period: DashboardPeriod, now = new Date()): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') {
    // getDay(): Sunday = 0, so Sunday belongs to the week that began 6 days ago.
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else if (period === 'month') {
    start.setDate(1);
  } else {
    start.setMonth(0, 1);
  }
  return start;
}

/**
 * Summary card figures for one period: invoices issued and orders created
 * since its start. Every invoice is billed; outstanding is what's unpaid.
 */
export function summarizePeriod(
  invoices: readonly Invoice[],
  orders: readonly WorkOrder[],
  period: DashboardPeriod,
  now = new Date(),
): PeriodSummary {
  const since = periodStart(period, now).getTime();
  const inPeriod = (iso: string) => new Date(iso).getTime() >= since;
  const billed = invoices.filter(i => inPeriod(i.issuedAt));
  const sum = (list: Invoice[]) =>
    list.reduce((total, i) => total + invoiceTotal(i), 0);
  return {
    billed: sum(billed),
    outstanding: sum(billed.filter(i => i.status !== 'paid')),
    orders: orders.filter(o => inPeriod(o.createdAt)).length,
  };
}

/** Job cards, earliest due first; cards without a due date go last. */
export const byDueDate = (cards: readonly JobCard[]): JobCard[] =>
  [...cards].sort((a, b) =>
    (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
  );

/** Overdue, or due within DUE_SOON_DAYS calendar days of today. */
export function isDueSoon(dueIso: string, now = new Date()): boolean {
  if (!dueIso) {
    return false;
  }
  const due = new Date(dueIso);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const limit = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  limit.setDate(limit.getDate() + DUE_SOON_DAYS);
  return dueDay.getTime() <= limit.getTime();
}

/**
 * Customers for the dashboard table, biggest share of orders first, each with
 * how many of their work orders aren't completed yet.
 */
export function customerRows<S extends Omit<CustomerShare, 'color'>>(
  shares: readonly S[],
  orders: readonly WorkOrder[],
): (S & Pick<CustomerRow, 'pendingDelivery'>)[] {
  const pending = new Map<string, number>();
  for (const o of orders) {
    if (o.status !== 'completed') {
      pending.set(o.customerId, (pending.get(o.customerId) ?? 0) + 1);
    }
  }
  return [...shares]
    .sort((a, b) => b.percent - a.percent)
    .map(s => ({ ...s, pendingDelivery: pending.get(s.id) ?? 0 }));
}

/**
 * Adds each job card's route card number from its work order, falling back
 * to the WO number when the order has none.
 */
export function withRouteCards(
  cards: readonly JobCard[],
  orders: readonly WorkOrder[],
): PriorityJob[] {
  const routeCards = new Map(orders.map(o => [o.id, o.routeCardNo]));
  return cards.map(c => ({
    ...c,
    routeCardNo:
      routeCards.get(c.orderId) || JOB_CARD_STRINGS.workOrder(c.number),
    workOrderNumber: c.number,
  }));
}
