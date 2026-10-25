import { percentOf } from '../../../shared/utils';
import { invoicesApi } from '../../billing/api/mockBillingApi';
import { customersApi } from '../../customers/api/mockCustomersApi';
import { jobCardsApi } from '../../jobCards/api/mockJobCardsApi';
import { ordersApi } from '../../orders/api/mockOrdersApi';
import { PRIORITY_JOBS_LIMIT } from '../constants';
import type { DashboardData, DashboardPeriod } from '../types';
import {
  byDueDate,
  customerRows,
  summarizePeriod,
  withRouteCards,
} from '../utils';

// In-memory stand-in for dashboardApi (Jest and offline work): the same
// figures, worked out from the other features' mock data.

async function get(period: DashboardPeriod): Promise<DashboardData> {
  const [invoices, orders, cards, customers] = await Promise.all([
    invoicesApi.list(),
    ordersApi.list(),
    jobCardsApi.list(),
    customersApi.list(),
  ]);
  const active = customers.filter(c => c.currentProjects > 0);
  const total = active.reduce((sum, c) => sum + c.currentProjects, 0);
  const shares = active.map(c => ({
    id: c.id,
    name: c.name,
    orders: c.currentProjects,
    percent: percentOf(c.currentProjects, total),
    totalRevenue: c.totalRevenue,
    outstandingBalance: c.outstandingBalance,
  }));
  const sorted = byDueDate(cards);
  return {
    stats: summarizePeriod(invoices, orders, period),
    customers: customerRows(shares, orders),
    jobs: withRouteCards(sorted.slice(0, PRIORITY_JOBS_LIMIT), orders),
    totalJobs: sorted.length,
  };
}

export const dashboardApi = { get };
