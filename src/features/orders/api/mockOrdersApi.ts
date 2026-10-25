import {
  createMockCollection,
  nextSequentialId,
} from '../../../services/mock/mockServer';
import { invoicesApi } from '../../billing/api/mockBillingApi';
import { jobReference } from '../../billing/workflow';
import { jobCardsApi } from '../../jobCards/api/mockJobCardsApi';
import type { JobCard } from '../../jobCards/types';
import { jobCardFromOrder } from '../../jobCards/utils';
import type { OrderInput, WorkOrder } from '../types';
import { orderStatus } from '../utils';
import { MOCK_ORDERS } from './mockData';

// In-memory stand-in for ordersApi (Jest and offline work). Like the server,
// creating an order opens its job card, and an order's status follows its
// job card and invoice.
const orders = createMockCollection<WorkOrder, OrderInput>({
  seed: MOCK_ORDERS,
  nextId: rows => nextSequentialId(rows, ''),
  build: (input, id) => {
    const now = new Date().toISOString();
    return {
      ...input,
      id,
      number: id,
      jobCardId: id,
      status: 'new',
      createdAt: now,
      statusHistory: [
        { id: 'h1', label: 'Order created', at: now, tone: 'neutral' },
      ],
    };
  },
});

/** The orders with the status the server would report. */
async function withStatus(rows: WorkOrder[]): Promise<WorkOrder[]> {
  const [cards, invoices] = await Promise.all([
    jobCardsApi.list(),
    invoicesApi.list(),
  ]);
  const byOrder = new Map<string, JobCard>(cards.map(c => [c.orderId, c]));
  const paid = new Set(
    invoices.filter(i => i.status === 'paid').map(i => i.jobId),
  );
  return rows.map(o => ({
    ...o,
    status: orderStatus(o, byOrder.get(o.id), paid.has(jobReference(o.id))),
  }));
}

const one = async (order: WorkOrder) => (await withStatus([order]))[0];

export const ordersApi = {
  list: async () => withStatus(await orders.list()),
  get: async (id: string) => one(await orders.get(id)),
  create: async (input: OrderInput) => {
    const order = await orders.create(input);
    await jobCardsApi.create(jobCardFromOrder(order));
    return one(order);
  },
  update: async (id: string, changes: Partial<OrderInput>) =>
    one(await orders.update(id, changes)),
  remove: orders.remove,
  reset: orders.reset,
};
