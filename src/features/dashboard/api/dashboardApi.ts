import { fromPaise, fromWireEnum, graphqlRequest } from '../../../services/api';
import type { Connection } from '../../../services/api';
import type { JobCardStatus, JobOperation } from '../../jobCards/types';
import { PRIORITY_JOBS_LIMIT } from '../constants';
import type {
  DashboardCustomer,
  DashboardData,
  DashboardPeriod,
  PriorityJob,
} from '../types';

// N1 Core API: dashboard(period) on POST /graphql. The week runs Monday to
// today (India time); outstanding is everything unpaid now.
//
// Two requests side by side: the cost check prices the priority jobs by the
// customer page size (`first`), whatever `priorityFirst` says, so asking for
// both in one request only fits about nine customers.

type CustomerNode = Omit<DashboardCustomer, 'percent'> & { percent: number };

type PriorityJobNode = {
  routeCardNo: string;
  jobCard: {
    id: string;
    code: string;
    number: string | null;
    customerName: string;
    partName: string;
    quantity: number;
    dueDate: string;
    status: string;
    operations: {
      id: string;
      name: string;
      status: string;
      operatorName: string | null;
      machineName: string | null;
      startedAt: string | null;
      completedAt: string | null;
    }[];
  };
};

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

const PRIORITY_QUERY = `
  query DashboardPriorityJobs($period: DashboardPeriod!) {
    dashboard(period: $period, first: 1, priorityFirst: ${PRIORITY_JOBS_LIMIT}) {
      priorityJobs {
        totalCount
        edges {
          node {
            routeCardNo
            jobCard {
              id code number customerName partName quantity dueDate status
              operations {
                id name status operatorName machineName startedAt completedAt
              }
            }
          }
        }
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

function toPriorityJob({ routeCardNo, jobCard }: PriorityJobNode): PriorityJob {
  return {
    id: jobCard.id,
    code: jobCard.code,
    customerName: jobCard.customerName,
    partName: jobCard.partName,
    quantity: jobCard.quantity,
    dueDate: jobCard.dueDate,
    status: fromWireEnum<JobCardStatus>(jobCard.status),
    operations: jobCard.operations.map(
      (op): JobOperation => ({
        id: op.id,
        name: op.name,
        machine: op.machineName ?? '',
        operator: op.operatorName ?? '',
        status: fromWireEnum<JobOperation['status']>(op.status),
        startedAt: op.startedAt,
        completedAt: op.completedAt,
      }),
    ),
    routeCardNo,
    // "WO-12" → "12": the app writes work orders as "WO #12".
    workOrderNumber: (jobCard.number ?? '').replace(/^WO-?/i, ''),
  };
}

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

async function priorityJobs(period: DashboardPeriod) {
  const data = await graphqlRequest<{
    dashboard: {
      priorityJobs: Connection<PriorityJobNode> & { totalCount: number };
    };
  }>(PRIORITY_QUERY, { period: period.toUpperCase() });
  const { edges, totalCount } = data.dashboard.priorityJobs;
  return {
    jobs: edges.map(edge => toPriorityJob(edge.node)),
    totalJobs: totalCount,
  };
}

async function get(period: DashboardPeriod): Promise<DashboardData> {
  const [figures, priority] = await Promise.all([
    summary(period),
    priorityJobs(period),
  ]);
  return { ...figures, ...priority };
}

export const dashboardApi = { get };
