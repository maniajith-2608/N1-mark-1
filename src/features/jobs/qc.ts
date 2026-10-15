import type {
  JobCard,
  JobOperation,
  QcEntry,
  RejectedMaterial,
} from '../jobCards/types';
import type { Attachment } from '../../shared/types';
import { operationQc } from '../jobCards/utils';
import { QC_STRINGS } from './constants';

/** Raw Material QC (incoming inspection) or Machine QC (after an operation). */
export type QcKind = 'rm' | 'machine';

export type QcStatus =
  | 'pending'
  | 'in_progress'
  | 'passed'
  | 'failed'
  | 'waiting';

export type QcItem = {
  status: QcStatus;
  /** "Incoming inspection", "In-process QC" or "Final QC". */
  stage: string;
  /** What is inspected: the material, or "Turning (CNC-02)". */
  subject: string;
  /** Machine QC: the operation being inspected (or still running). */
  operation?: JobOperation;
};

const S = QC_STRINGS.stages;

const describe = (op: JobOperation) =>
  op.machine ? `${op.name} (${op.machine})` : op.name;

const RM_STATUS: Record<JobCard['materialQc'], QcStatus> = {
  pending: 'pending',
  accepted: 'passed',
  rejected: 'failed',
};

export const rawMaterialQc = (c: JobCard): QcItem => ({
  status: RM_STATUS[c.materialQc],
  stage: S.incoming,
  subject: c.material,
});

/**
 * Inspects the operation the operator finished last. Until one is finished
 * there is nothing to check: "In progress" while one runs, else "Waiting".
 */
export function machineQc(c: JobCard): QcItem {
  const done = c.operations.filter(op => op.status === 'completed');
  const last = done[done.length - 1];
  if (!last) {
    const running = c.operations.find(op => op.status === 'running');
    return {
      status: running ? 'in_progress' : 'waiting',
      stage: S.inProcess,
      subject: running ? describe(running) : S.nothingDone,
      operation: running,
    };
  }
  const entry = operationQc(c, last);
  const final = done.length === c.operations.length;
  return {
    status: entry
      ? entry.result === 'passed' || entry.result === 'accepted'
        ? 'passed'
        : 'failed'
      : 'pending',
    stage: final ? S.final : S.inProcess,
    subject: final ? last.machine || last.name : describe(last),
    operation: last,
  };
}

export const qcItem = (c: JobCard, kind: QcKind) =>
  kind === 'rm' ? rawMaterialQc(c) : machineQc(c);

/** The latest check logged for this item, for its remark. */
export function qcEntry(c: JobCard, kind: QcKind): QcEntry | undefined {
  const opId = kind === 'machine' ? machineQc(c).operation?.id : undefined;
  return [...c.qcHistory]
    .reverse()
    .find(e =>
      kind === 'machine' ? e.operationId === opId : e.stage === S.materialStage,
    );
}

/**
 * Job card changes for a pass or fail: the QC history, and RM status. An RM
 * rejection also records the material that was received.
 */
export function qcResult(
  c: JobCard,
  kind: QcKind,
  passed: boolean,
  remark: string,
  now: string,
  /** The QC user doing the check. */
  inspector = '',
  rejectedMaterial?: RejectedMaterial,
  /** A supporting document, e.g. photos or a report of the failure. */
  report?: Attachment,
): Partial<JobCard> {
  const op = machineQc(c).operation;
  const entry: QcEntry = {
    id: `qc-${Date.now()}`,
    stage: kind === 'rm' ? S.materialStage : S.operationStage(op?.name ?? ''),
    result:
      kind === 'rm'
        ? passed
          ? 'accepted'
          : 'rejected'
        : passed
        ? 'passed'
        : 'failed',
    remark,
    at: now,
    ...(inspector && { inspector }),
    operationId: kind === 'machine' ? op?.id : undefined,
    ...(kind === 'rm' && !passed && rejectedMaterial && { rejectedMaterial }),
    ...(report && { report }),
  };
  return {
    ...(kind === 'rm' && { materialQc: passed ? 'accepted' : 'rejected' }),
    qcHistory: [...c.qcHistory, entry],
  };
}
