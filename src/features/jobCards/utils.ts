import { workOrderSearchTerms } from '../../shared/utils';
import type { N1DropDownOption, N1StepStatus } from '../../shared/components';
import type { Attachment, StatusMeta } from '../../shared/types';
import type { WorkOrder } from '../orders/types';
import { ALL, matchesAny } from '../../shared/hooks';
import { percentOf } from '../../shared/utils';
import { JOB_CARD_STRINGS, STAGE_META } from './constants';
import type {
  JobCard,
  JobCardFilters,
  JobCardInput,
  JobCardStatus,
  JobOperation,
  QcEntry,
  RejectedMaterial,
  RouteStep,
} from './types';

const isDone = (op: JobOperation) => op.status === 'completed';
const isStarted = (op: JobOperation) =>
  op.status === 'running' || op.status === 'paused';

/** "Bracket — Job A" */
export const jobTitle = (c: Pick<JobCard, 'partName' | 'jobName'>) =>
  [c.partName, c.jobName].filter(Boolean).join(' — ');

/** "WO #1042 · Bracket — Job A" */
export const jobHeading = (c: JobCard) =>
  [JOB_CARD_STRINGS.workOrder(c.number), jobTitle(c)]
    .filter(Boolean)
    .join(' · ');

/** "JOB12" */
export const jobCardCode = (n: number) => `JOB${n}`;

/** One past the highest job card number in use. */
export const nextJobCardNumber = (cards: readonly Pick<JobCard, 'code'>[]) =>
  cards.reduce((max, c) => {
    const n = Number(c.code.replace(/^JOB/, ''));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0) + 1;

/** "#JOB1 · Bracket — Job A" */
export const jobCardTitle = (c: JobCard) =>
  [JOB_CARD_STRINGS.jobCardNumber(c.code), jobTitle(c)]
    .filter(Boolean)
    .join(' · ');

/** "#JOB1 · Acme Metalworks" */
export const jobCardHeading = (c: JobCard) =>
  [JOB_CARD_STRINGS.jobCardNumber(c.code), c.customerName]
    .filter(Boolean)
    .join(' · ');

/** "WO #1042 · Acme Metalworks" */
export const jobCustomerHeading = (c: JobCard) =>
  [JOB_CARD_STRINGS.workOrder(c.number), c.customerName]
    .filter(Boolean)
    .join(' · ');

/** The step on the machine now, else the next to run; the last once all are done. */
export function currentOperation(c: JobCard): JobOperation | undefined {
  return (
    c.operations.find(isStarted) ??
    c.operations.find(op => !isDone(op)) ??
    c.operations[c.operations.length - 1]
  );
}

/** Completed steps count fully, a started step counts half. */
export function jobProgress(c: JobCard): number {
  const done = c.operations.filter(isDone).length;
  const started = c.operations.filter(isStarted).length;
  return percentOf(done * 2 + started, c.operations.length * 2);
}

/** Bar colour: amber while under half done, green when finished. */
export const progressTone = (value: number) =>
  value >= 100 ? 'success' : value < 50 ? 'warning' : 'info';

/** Card status that follows from its operations. */
export function statusFor(operations: JobOperation[]): JobCardStatus {
  if (operations.length > 0 && operations.every(isDone)) {
    return 'completed';
  }
  if (operations.some(op => op.status === 'running')) {
    return 'in_progress';
  }
  if (operations.some(op => op.status === 'paused')) {
    return 'paused';
  }
  return operations.some(isDone) ? 'in_progress' : 'not_started';
}

const withOperations = (operations: JobOperation[]): JobCardInput => ({
  operations,
  status: statusFor(operations),
});

/**
 * A typed or scanned code as the server knows it: "WO-12", the card code
 * ("JOB12") or its QR value ("JC-00012"). People type "wo 12", "WO #12" or
 * just "12" for the work order; those read as "WO-12". The card code may be
 * typed as shown on screen ("#JOB12") or "JOB#12"; the "#" is dropped. Only
 * the first line counts: the order's QR lists its details under the number.
 */
export function normaliseJobCode(code: string): string {
  const [first = ''] = code.trim().split('\n');
  const value = first.trim().toUpperCase();
  const workOrder = /^(?:WO\s*[#-]?\s*)?0*(\d+)$/.exec(value);
  return workOrder
    ? `WO-${workOrder[1]}`
    : value.replace(/\s+/g, '').replace(/^#|#(?=\d)/g, '');
}

// ---- Stage: where the job is ----

/** The latest QC check logged against an operation. */
export const operationQc = (c: JobCard, op: JobOperation) =>
  [...c.qcHistory].reverse().find(e => e.operationId === op.id);

const qcPassed = (e: QcEntry | undefined) =>
  e?.result === 'passed' || e?.result === 'accepted';

/** The job card's status, worked out by jobCardStage. */
export type JobCardStage =
  | {
      key:
        | 'rm_received'
        | 'rm_qc_failed'
        | 'rm_qc_passed'
        | 'yet_to_start'
        | 'ready_to_dispatch'
        | 'done';
    }
  /** On an operation: running, paused, or next once the last QC passed. */
  | {
      key: 'operation';
      operation: JobOperation;
      /** rework: a failed QC check reopened the step to be done again. */
      state: 'running' | 'paused' | 'next' | 'rework';
    }
  /** An operation is finished and waiting for (or failed) its QC check. */
  | {
      key: 'operation_qc';
      operation: JobOperation;
      final: boolean;
      failed: boolean;
    };

/**
 * Where the job is, first match wins: dispatched (Done), RM QC failed, an
 * operation running or paused, a step reopened by a failed QC check (redo),
 * the last finished operation's QC (Final QC for the last step), Ready to
 * dispatch, the next operation, then before any work: RM received (RM QC
 * pending), RM QC passed (no flow yet), Yet to start.
 */
export function jobCardStage(c: JobCard): JobCardStage {
  if (c.billing === 'invoiced') {
    return { key: 'done' };
  }
  if (c.materialQc === 'rejected') {
    return { key: 'rm_qc_failed' };
  }
  const started = c.operations.find(isStarted);
  if (started) {
    return {
      key: 'operation',
      operation: started,
      state: started.status === 'paused' ? 'paused' : 'running',
    };
  }
  const rework = c.operations.find(op => op.isRework && !isDone(op));
  if (rework) {
    return { key: 'operation', operation: rework, state: 'rework' };
  }
  const done = c.operations.filter(isDone);
  const last = done[done.length - 1];
  if (last) {
    const qc = operationQc(c, last);
    const final = done.length === c.operations.length;
    if (!qcPassed(qc)) {
      return { key: 'operation_qc', operation: last, final, failed: !!qc };
    }
    const next = c.operations.find(op => !isDone(op));
    return next
      ? { key: 'operation', operation: next, state: 'next' }
      : { key: 'ready_to_dispatch' };
  }
  if (c.materialQc === 'pending') {
    return { key: 'rm_received' };
  }
  return { key: c.operations.length ? 'yet_to_start' : 'rm_qc_passed' };
}

const ST = JOB_CARD_STRINGS.stages;

/** Label and tone for a stage's badge, e.g. "Turning QC". */
export function stageMeta(stage: JobCardStage): StatusMeta {
  switch (stage.key) {
    case 'operation': {
      const name = stage.operation.name;
      return stage.state === 'running'
        ? { label: name, tone: 'info' }
        : stage.state === 'paused'
        ? { label: ST.paused(name), tone: 'warning' }
        : stage.state === 'rework'
        ? { label: ST.redo(name), tone: 'danger' }
        : { label: ST.next(name), tone: 'neutral' };
    }
    case 'operation_qc': {
      const label = stage.final
        ? ST.finalQc
        : ST.operationQc(stage.operation.name);
      return stage.failed
        ? { label: ST.failed(label), tone: 'danger' }
        : { label, tone: 'warning' };
    }
    default:
      return STAGE_META[stage.key];
  }
}

/**
 * Why the next operation can't start yet: RM QC hasn't passed, the design
 * isn't approved, or the last finished operation is still waiting for (or
 * failed) its QC check. The server checks the same before startJobStep.
 */
export function startBlockedReason(c: JobCard): string | undefined {
  if (c.materialQc !== 'accepted') {
    return ST.waitingForRmQc;
  }
  if (c.designApproval !== 'approved') {
    return ST.waitingForDesign;
  }
  const next = c.operations.findIndex(op => !isDone(op));
  const previous = next > 0 ? c.operations[next - 1] : undefined;
  if (
    previous &&
    c.operations[next].status === 'pending' &&
    !qcPassed(operationQc(c, previous))
  ) {
    return ST.waitingForQc(previous.name);
  }
  return undefined;
}

/**
 * Start (or resume) is allowed when nothing is running, a step is left, RM
 * QC passed, the design is approved and the last finished step passed its QC.
 */
export const canStart = (c: JobCard) =>
  !c.operations.some(op => op.status === 'running') &&
  c.operations.some(op => !isDone(op)) &&
  !startBlockedReason(c);

/** Work has begun on a step; the card can no longer be cancelled. */
export const hasStarted = (c: JobCard) =>
  c.operations.some(op => op.status !== 'pending' || op.isRework);

/** The step Start / Resume acts on: the first one not done yet. */
export const nextOperation = (c: JobCard) =>
  c.operations.find(op => !isDone(op));

/** The step that is running now, which Pause and Complete act on. */
export const runningOperation = (c: JobCard) =>
  c.operations.find(op => op.status === 'running');

/**
 * A failed QC check reopens its step as rework (the server does this): the
 * same step, pending again, keeping its history.
 */
export function reopenOperation(c: JobCard, operationId: string): JobCardInput {
  return withOperations(
    c.operations.map(op =>
      op.id === operationId
        ? {
            ...op,
            status: 'pending',
            isRework: true,
            startedAt: null,
            completedAt: null,
          }
        : op,
    ),
  );
}

export const canPauseOrComplete = (c: JobCard) =>
  c.operations.some(op => op.status === 'running');

/**
 * Starts (or resumes) the first step that isn't done, optionally on a chosen
 * machine by a named operator (Assign Machine).
 */
export function startOperation(
  c: JobCard,
  now: string,
  assignment?: Partial<
    Pick<
      JobOperation,
      'machine' | 'machineId' | 'operator' | 'operatorId' | 'quantityStarted'
    >
  >,
): JobCardInput {
  const next = c.operations.findIndex(op => !isDone(op));
  return withOperations(
    c.operations.map((op, i) =>
      i === next
        ? {
            ...op,
            ...assignment,
            status: 'running',
            startedAt: op.startedAt ?? now,
          }
        : op,
    ),
  );
}

export function pauseOperation(c: JobCard): JobCardInput {
  return withOperations(
    c.operations.map(op =>
      op.status === 'running' ? { ...op, status: 'paused' } : op,
    ),
  );
}

export function completeOperation(c: JobCard, now: string): JobCardInput {
  return withOperations(
    c.operations.map(op =>
      op.status === 'running'
        ? { ...op, status: 'completed', completedAt: now }
        : op,
    ),
  );
}

// ---- Create / Edit flow ----

/** One row of the flow editor. `operation` is set for saved steps. */
export type FlowStep = { key: string; name: string; operation?: JobOperation };

export function initialFlowSteps(c: JobCard, blankCount: number): FlowStep[] {
  if (c.operations.length) {
    return c.operations.map(op => ({
      key: op.id,
      name: op.name,
      operation: op,
    }));
  }
  return Array.from({ length: blankCount }, (_, i) => ({
    key: `new-${i}`,
    name: '',
  }));
}

/** Badge state of a flow step. New and unsaved steps are drafts. */
export function stepStatus(step: FlowStep, editing: boolean): N1StepStatus {
  if (!editing) {
    return 'draft';
  }
  const status = step.operation?.status;
  if (status === 'completed') {
    return 'completed';
  }
  return status === 'running' || status === 'paused' ? 'current' : 'upcoming';
}

/** The flow to save (updateJobCardRoute): saved steps keep their ids. */
export const flowSteps = (steps: FlowStep[]): RouteStep[] =>
  steps.map(step =>
    step.operation
      ? { id: step.operation.id, name: step.name }
      : { name: step.name },
  );

/**
 * The route after a save, as the server builds it: saved steps keep their
 * progress (a renamed step not started yet is just renamed), new steps start
 * pending. Used by the in-memory API.
 */
export function routeInput(c: JobCard, steps: RouteStep[]): JobCardInput {
  return withOperations(
    steps.map((step, i) => {
      const op = step.id ? c.operations.find(o => o.id === step.id) : undefined;
      return op
        ? { ...op, name: step.name }
        : {
            id: `op-${Date.now()}-${i}`,
            name: step.name,
            machine: '',
            operator: '',
            status: 'pending',
            startedAt: null,
            completedAt: null,
          };
    }),
  );
}

// ---- List filters ----

export const jobCardSearchText = (c: JobCard) => {
  const op = currentOperation(c);
  return `${c.code} ${workOrderSearchTerms(
    c.number.replace(/^WO-?/i, ''),
  )} ${jobTitle(c)} ${c.customerName} ${op?.name ?? ''} ${op?.machine ?? ''} ${
    op?.operator ?? ''
  }`;
};

export const matchesJobCardFilters = (c: JobCard, f: JobCardFilters) => {
  const op = currentOperation(c);
  return (
    matchesAny(f.operation, op?.name ?? '') &&
    matchesAny(f.operator, op?.operator ?? '') &&
    matchesAny(f.machine, op?.machine ?? '')
  );
};

/** "All …" first, then each distinct value in the list, A–Z. */
/** Each distinct non-blank value once, sorted, as a filter option. */
export const distinctOptions = (values: string[]) =>
  [...new Set(values.filter(Boolean))]
    .sort()
    .map(value => ({ value, label: value }));

export function optionsFrom(
  values: string[],
  allLabel: string,
): N1DropDownOption<string>[] {
  return [{ value: ALL, label: allLabel }, ...distinctOptions(values)];
}

/**
 * The job card the server opens with a new order: no route card yet,
 * nothing approved. Used by the in-memory API.
 */
export function jobCardFromOrder(order: WorkOrder): JobCard {
  return {
    id: order.jobCardId || order.id,
    orderId: order.id,
    number: order.number,
    // The backend numbers it on create.
    code: '',
    customerId: order.customerId,
    customerName: order.customerName,
    partName: order.partName,
    jobName: order.jobName,
    material: order.rawMaterialGrade,
    quantity: order.quantity,
    priority: order.priority,
    dueDate: order.dueDate,
    status: 'not_started',
    designFile: order.designFile,
    designApproval: 'pending',
    materialSource: order.materialSource,
    materialQc: 'pending',
    operations: [],
    qcHistory: [],
    quotation: 'pending',
    billing: 'not_invoiced',
    partNumber: order.partNumber,
    drawingNumber: order.drawingNumber,
    poNumber: order.poNumber,
    routeCardNo: order.routeCardNo,
  };
}

/** Attaches an uploaded report to one QC check. */
export const attachQcReport = (
  c: JobCard,
  entryId: string,
  report: Attachment,
): Pick<JobCard, 'qcHistory'> => ({
  qcHistory: c.qcHistory.map(e => (e.id === entryId ? { ...e, report } : e)),
});

/** The rejected material's grade, heat number and size, as label / value rows. */
export const rejectedMaterialItems = (m: RejectedMaterial) => [
  { label: JOB_CARD_STRINGS.details.rmGrade, value: m.grade },
  { label: JOB_CARD_STRINGS.details.heatNumber, value: m.heatNumber },
  { label: JOB_CARD_STRINGS.details.rmSize, value: m.size },
];

/** The RM QC rejection behind a rejected material, if it was recorded. */
export const materialRejection = (c: JobCard) =>
  c.materialQc === 'rejected'
    ? [...c.qcHistory].reverse().find(e => e.rejectedMaterial)
    : undefined;

/** A job card someone worked on: their steps, when they started and last worked. */
export type JobCardWork = {
  jobCard: JobCard;
  operations: JobOperation[];
  startedAt: string;
  lastWorkedAt: string;
};

/**
 * Job cards where `operator` ran at least one route card step, the most
 * recently worked first, at most `limit` of them.
 */
export function jobCardsWorkedBy(
  cards: readonly JobCard[],
  operator: string,
  limit: number,
): JobCardWork[] {
  return cards
    .map(jobCard => {
      const operations = jobCard.operations.filter(
        op => op.operator === operator,
      );
      const started = operations
        .map(op => op.startedAt ?? '')
        .filter(Boolean)
        .sort();
      const lastWorkedAt = operations
        .map(op => op.completedAt ?? op.startedAt ?? '')
        .sort()
        .pop();
      return {
        jobCard,
        operations,
        startedAt: started[0] ?? '',
        lastWorkedAt: lastWorkedAt ?? '',
      };
    })
    .filter(work => work.operations.length > 0)
    .sort((a, b) => b.lastWorkedAt.localeCompare(a.lastWorkedAt))
    .slice(0, limit);
}
