import { fromPaise, graphqlRequest } from '../../../services/api';
import type { Connection } from '../../../services/api';
import { jobCardsApi } from '../../jobCards/api/jobCardsApi';
import { ordersApi } from '../../orders/api/ordersApi';
import { PRIORITY_JOBS_LIMIT } from '../constants';
import type {
  DashboardCustomer,
  DashboardData,
  DashboardPeriod,
} from '../types';
import { priorityJobCards, withRouteCards } from '../utils';

// N1 Core API: dashboard(period) on POST /graphql. The week runs Monday to
// today (India time); outstanding is everything unpaid now.
// Priority jobs come from the job card and order lists instead.

type CustomerNode = Omit<DashboardCustomer, 'percent'> & { percent: number };

type SummaryData = {
  dashboard: {
    billed: number;
    outstanding: number;
    orders: number;
    customerDistribution: Connection<CustomerNode>;
  };
};

// Literals: the cost check counts a page size passed as a variable as 100.
// 40 customers stays under the 1,000 limit.
const SUMMARY_QUERY = `
  query DashboardSummary($period: DashboardPeriod!, $after: String) {
    dashboard(period: $period, first: 40, after: $after) {
      billed outstanding orders
      customerDistribution {
        edges {
          node {
            id name orders percent totalRevenue outstandingBalance
            pendingDelivery
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const toCustomer = (node: CustomerNode): DashboardCustomer => ({
  ...node,
  percent: Math.round(node.percent),
  totalRevenue: fromPaise(node.totalRevenue),
  outstandingBalance: fromPaise(node.outstandingBalance),
});

/** Summary figures and every customer row, page by page. */
async function summary(period: DashboardPeriod) {
  const wirePeriod = period.toUpperCase();
  const customers: DashboardCustomer[] = [];
  let after: string | null = null;
  let first: SummaryData['dashboard'] | undefined;
  do {
    const data: SummaryData = await graphqlRequest(SUMMARY_QUERY, {
      period: wirePeriod,
      after,
    });
    first ??= data.dashboard;
    const page = data.dashboard.customerDistribution;
    customers.push(...page.edges.map(edge => toCustomer(edge.node)));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return {
    stats: {
      billed: fromPaise(first.billed),
      outstanding: fromPaise(first.outstanding),
      orders: first.orders,
    },
    customers: customers.sort((a, b) => b.percent - a.percent),
  };
}

/**
 * Every open job card, soonest delivery first, with its route card number.
 * Worked out here rather than by dashboard.priorityJobs, which leaves out
 * cards the dashboard should list (all periods show the same jobs).
 */
async function priorityJobs() {
  const [cards, orders] = await Promise.all([
    jobCardsApi.list(),
    ordersApi.list(),
  ]);
  const sorted = priorityJobCards(cards);
  return {
    jobs: withRouteCards(sorted.slice(0, PRIORITY_JOBS_LIMIT), orders),
    totalJobs: sorted.length,
  };
}

async function get(period: DashboardPeriod): Promise<DashboardData> {
  const [figures, priority] = await Promise.all([
    summary(period),
    priorityJobs(),
  ]);
  return { ...figures, ...priority };
}

export const dashboardApi = { get };
