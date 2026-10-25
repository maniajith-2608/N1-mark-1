import {
  createMockCollection,
  MockNotFoundError,
} from '../../../services/mock/mockServer';
import { machinesApi } from '../../machines/api/mockMachinesApi';
// Circular with mockOrdersApi, read at call time only.
import { ordersApi } from '../../orders/api/mockOrdersApi';
import { userManagementApi } from '../../userManagement/api/mockUserManagementApi';
import { qcResult } from '../../jobs/qc';
import type { JobCard, JobCardCommand } from '../types';
import {
  attachQcReport,
  completeOperation,
  jobCardCode,
  nextJobCardNumber,
  normaliseJobCode,
  pauseOperation,
  reopenOperation,
  routeInput,
  startOperation,
} from '../utils';
import { MOCK_JOB_CARDS } from './mockData';

// In-memory stand-in for jobCardsApi (Jest and offline work). Job cards are
// opened with their order (mockOrdersApi) and moved on by commands, which
// play the server's part: each answers with the whole card.
const jobCards = createMockCollection<JobCard, JobCard>({
  seed: MOCK_JOB_CARDS,
  nextId: rows => jobCardCode(nextJobCardNumber(rows)),
  build: (jobCard, code) => ({ ...jobCard, code }),
});

/** Matched like the server: "WO-12" by the WO number, else the card code. */
async function getByQr(code: string): Promise<JobCard> {
  const rows = await jobCards.list();
  const value = normaliseJobCode(code);
  const card = rows.find(c =>
    value.startsWith('WO-')
      ? `WO-${c.number}` === value
      : c.code.toUpperCase() === value,
  );
  if (!card) {
    throw new MockNotFoundError(code);
  }
  return card;
}

async function getByOrder(orderId: string): Promise<JobCard> {
  const card = (await jobCards.list()).find(c => c.orderId === orderId);
  if (!card) {
    throw new MockNotFoundError(orderId);
  }
  return card;
}

const nameOf = async (operatorId: string) =>
  (await userManagementApi.list()).find(u => u.id === operatorId)?.name ??
  operatorId;

/** The changes one command makes to the card, as the server would. */
async function changesFor(
  c: JobCard,
  command: JobCardCommand,
): Promise<Partial<JobCard>> {
  const now = new Date().toISOString();
  switch (command.type) {
    case 'route':
      return routeInput(c, command.steps);
    case 'assign': {
      const operator = await nameOf(command.operatorId);
      return {
        operations: c.operations.map(op =>
          op.id === command.operationId
            ? { ...op, operatorId: command.operatorId, operator }
            : op,
        ),
      };
    }
    case 'start': {
      const machine = (await machinesApi.list()).find(
        m => m.id === command.machineId,
      );
      const op = c.operations.find(o => o.id === command.operationId);
      return startOperation(c, now, {
        machineId: command.machineId,
        machine: machine?.code ?? command.machineId,
        quantityStarted: c.quantity,
        ...(command.operatorId && {
          operatorId: command.operatorId,
          operator: await nameOf(command.operatorId),
        }),
        ...(!command.operatorId && op && { operator: op.operator }),
      });
    }
    case 'pause':
      return pauseOperation(c);
    case 'resume':
      return startOperation(c, now);
    case 'complete':
      return completeOperation(c, now);
    case 'designApproval':
      return { designApproval: command.approval };
    case 'rawMaterial':
      // Saved on the order too; new material is inspected again.
      await ordersApi.update(c.orderId, command.rawMaterial);
      return {
        materialQc: 'pending',
        materialSource: command.rawMaterial.materialSource,
      };
    case 'recordQc': {
      const changes = qcResult(
        c,
        command.kind,
        command.passed,
        command.remark,
        now,
        command.inspector,
        command.rejectedMaterial,
        command.report,
      );
      const failed =
        command.kind === 'machine' && !command.passed && command.operationId;
      return failed
        ? {
            ...changes,
            ...reopenOperation(c, command.operationId as string),
          }
        : changes;
    }
    case 'attachQcReport':
      return attachQcReport(c, command.qcId, command.report);
    case 'watch':
    case 'unwatch':
      return {};
  }
}

async function run(id: string, command: JobCardCommand): Promise<JobCard> {
  const card = await jobCards.get(id);
  return jobCards.update(id, await changesFor(card, command));
}

export const jobCardsApi = {
  list: jobCards.list,
  get: jobCards.get,
  getByQr,
  getByOrder,
  run,
  /** Opens an order's job card (mockOrdersApi.create). */
  create: jobCards.create,
  update: jobCards.update,
  remove: jobCards.remove,
  reset: jobCards.reset,
};
