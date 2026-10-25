import {
  ApiError,
  definedOnly,
  fetchAllNodes,
  fromWireEnum,
  graphqlRequest,
  textOrEmpty,
  textOrNull,
  toWireEnum,
} from '../../../services/api';
import {
  fromFileReference,
  uploadAttachment,
  type FileReference,
} from '../../../services/files/fileStorage';
import type {
  BillingState,
  DesignApproval,
  JobCard,
  JobCardCommand,
  JobCardStatus,
  JobOperation,
  MaterialQc,
  OperationStatus,
  QcEntry,
  QcRecordInput,
  QcResult,
  QuotationStatus,
  RejectedMaterial,
} from '../types';
import { normaliseJobCode } from '../utils';
import type { MaterialSource, OrderPriority } from '../../orders/types';

// N1 Core API: jobCards / jobCard / jobCardByQr, and each production move as
// its own mutation (updateJobCardRoute, assignJobOperation, startJobStep,
// pauseJobStep, resumeJobStep, completeJobStep, setJobCardDesignApproval,
// saveJobCardRawMaterial, recordQc, attachQcReport, watchJob, unwatchJob,
// cancelJobCard). Every one answers with the job card, so the store always
// holds the server's statuses.

export const JOB_CARD_FIELDS = `
  fragment JobCardFields on JobCard {
    id orderId number code customerId customerName
    partName jobName material quantity priority dueDate status
    partNumber drawingNumber poNumber routeCardNo
    designFile { id name kind sizeBytes }
    designApproval materialSource materialQc quotation billing
    operations {
      id seq name status isRework operatorId operatorName
      machineId machineCode machineName quantityStarted startedAt completedAt
    }
    qcHistory {
      id kind stage result remark inspector recordedByName recordedAt
      jobOperationId
      rejectedMaterial { grade heatNumber size }
      report { id name kind sizeBytes }
    }
  }
`;

type Wire<T extends string> = Uppercase<T>;

type OperationNode = {
  id: string;
  seq: number;
  name: string;
  status: Wire<OperationStatus>;
  isRework: boolean;
  operatorId: string | null;
  operatorName: string | null;
  machineId: string | null;
  machineCode: string | null;
  machineName: string | null;
  quantityStarted: number | null;
  startedAt: string | null;
  completedAt: string | null;
};

type QcRecordNode = {
  id: string;
  kind: 'RM' | 'MACHINE';
  stage: string;
  result: Wire<QcResult>;
  remark: string | null;
  inspector: string | null;
  recordedByName: string;
  recordedAt: string;
  jobOperationId: string | null;
  rejectedMaterial: RejectedMaterial | null;
  report: FileReference | null;
};

export type JobCardNode = {
  id: string;
  orderId: string;
  number: string | null;
  code: string;
  customerId: string;
  customerName: string;
  partName: string;
  jobName: string | null;
  material: string | null;
  quantity: number;
  priority: Wire<OrderPriority>;
  dueDate: string;
  status: Wire<JobCardStatus>;
  partNumber: string | null;
  drawingNumber: string | null;
  poNumber: string;
  routeCardNo: string | null;
  designFile: FileReference | null;
  designApproval: Wire<DesignApproval>;
  materialSource: Wire<MaterialSource> | null;
  materialQc: Wire<MaterialQc>;
  quotation: Wire<QuotationStatus>;
  billing: Wire<BillingState>;
  operations: OperationNode[];
  qcHistory: QcRecordNode[];
};

function toOperation(node: OperationNode): JobOperation {
  return {
    id: node.id,
    name: node.name,
    machine: node.machineCode ?? node.machineName ?? '',
    machineId: node.machineId ?? '',
    operator: textOrEmpty(node.operatorName),
    operatorId: node.operatorId ?? '',
    status: fromWireEnum<OperationStatus>(node.status),
    isRework: node.isRework,
    quantityStarted: node.quantityStarted,
    startedAt: node.startedAt,
    completedAt: node.completedAt,
  };
}

function toQcEntry(node: QcRecordNode): QcEntry {
  return {
    id: node.id,
    kind: node.kind === 'RM' ? 'rm' : 'machine',
    stage: node.stage,
    result: fromWireEnum<QcResult>(node.result),
    remark: textOrEmpty(node.remark),
    at: node.recordedAt,
    ...(node.jobOperationId && { operationId: node.jobOperationId }),
    ...(node.rejectedMaterial && { rejectedMaterial: node.rejectedMaterial }),
    inspector: node.inspector ?? node.recordedByName,
    ...(node.report && { report: fromFileReference(node.report) }),
  };
}

export function toJobCard(node: JobCardNode): JobCard {
  return {
    id: node.id,
    orderId: node.orderId,
    number: textOrEmpty(node.number),
    code: node.code,
    customerId: node.customerId,
    customerName: node.customerName,
    partName: node.partName,
    jobName: textOrEmpty(node.jobName),
    material: textOrEmpty(node.material),
    quantity: node.quantity,
    priority: fromWireEnum<OrderPriority>(node.priority),
    dueDate: node.dueDate,
    status: fromWireEnum<JobCardStatus>(node.status),
    designFile: node.designFile && fromFileReference(node.designFile),
    designApproval: fromWireEnum<DesignApproval>(node.designApproval),
    materialSource: node.materialSource
      ? fromWireEnum<MaterialSource>(node.materialSource)
      : '',
    materialQc: fromWireEnum<MaterialQc>(node.materialQc),
    operations: [...node.operations]
      .sort((a, b) => a.seq - b.seq)
      .map(toOperation),
    qcHistory: node.qcHistory.map(toQcEntry),
    quotation: fromWireEnum<QuotationStatus>(node.quotation),
    billing: fromWireEnum<BillingState>(node.billing),
    partNumber: textOrEmpty(node.partNumber),
    drawingNumber: textOrEmpty(node.drawingNumber),
    poNumber: node.poNumber,
    routeCardNo: textOrEmpty(node.routeCardNo),
  };
}

// A literal: the cost check counts a page size passed as a variable as 100,
// and 100 cards with their steps and QC history cost more than allowed.
const PAGE_SIZE = 15;

/** Every open job card, soonest due first (cancelled cards drop out). */
async function list(): Promise<JobCard[]> {
  const nodes = await fetchAllNodes<JobCardNode>(
    `query JobCards($after: String) {
      jobCards(
        first: ${PAGE_SIZE}
        after: $after
        sort: { field: DUE_DATE, direction: ASC }
      ) {
        edges { node { ...JobCardFields } }
        pageInfo { hasNextPage endCursor }
      }
    }
    ${JOB_CARD_FIELDS}`,
    'jobCards',
  );
  return nodes.map(toJobCard);
}

async function get(id: string): Promise<JobCard> {
  const data = await graphqlRequest<{ jobCard: JobCardNode }>(
    `query JobCard($id: ID!) { jobCard(id: $id) { ...JobCardFields } }
    ${JOB_CARD_FIELDS}`,
    { id },
  );
  return toJobCard(data.jobCard);
}

/** The job behind a scanned QR or a typed code (jobCardByQr). */
async function getByQr(code: string): Promise<JobCard> {
  const data = await graphqlRequest<{ jobCardByQr: JobCardNode }>(
    `query JobCardByQr($qrValue: String!) {
      jobCardByQr(qrValue: $qrValue) { ...JobCardFields }
    }
    ${JOB_CARD_FIELDS}`,
    { qrValue: normaliseJobCode(code) },
  );
  return toJobCard(data.jobCardByQr);
}

/**
 * The job card of an order. Operators may not list job cards; every card
 * they can open is one of their own jobs (myJobs).
 */
async function getByOrder(orderId: string): Promise<JobCard> {
  try {
    const data = await graphqlRequest<{
      jobCards: { edges: { node: JobCardNode }[] };
    }>(
      `query OrderJobCard($orderId: ID!) {
        jobCards(first: 1, filter: { orderId: $orderId }) {
          edges { node { ...JobCardFields } }
        }
      }
      ${JOB_CARD_FIELDS}`,
      { orderId },
    );
    const node = data.jobCards.edges[0]?.node;
    if (node) {
      return toJobCard(node);
    }
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'FORBIDDEN') {
      throw error;
    }
    const mine = await myJobs();
    const card = mine.find(c => c.orderId === orderId);
    if (card) {
      return card;
    }
  }
  throw new ApiError('That job card does not exist.', 404, undefined, {
    code: 'JOB_CARD_NOT_FOUND',
  });
}

/**
 * The signed-in user's jobs: an operator's assigned work, or the jobs a
 * supervisor or QC added to their list (watchJob).
 */
async function myJobs(): Promise<JobCard[]> {
  const nodes = await fetchAllNodes<JobCardNode>(
    `query MyJobs($after: String) {
      myJobs(first: ${PAGE_SIZE}, after: $after) {
        edges { node { ...JobCardFields } }
        pageInfo { hasNextPage endCursor }
      }
    }
    ${JOB_CARD_FIELDS}`,
    'myJobs',
  );
  return nodes.map(toJobCard);
}

/** One mutation that answers with the job card. */
async function mutate(
  field: string,
  signature: string,
  args: string,
  variables: Record<string, unknown>,
): Promise<JobCard> {
  const data = await graphqlRequest<Record<string, JobCardNode>>(
    `mutation ${field[0].toUpperCase()}${field.slice(1)}(${signature}) {
      ${field}(${args}) { ...JobCardFields }
    }
    ${JOB_CARD_FIELDS}`,
    variables,
  );
  return toJobCard(data[field]);
}

/** recordQc: the verdict on a raw material (RM) or machine check. */
async function recordQc(input: QcRecordInput): Promise<JobCard> {
  const rm = input.kind === 'rm';
  // The check has no id until it's recorded, so its report is filed
  // against the job card.
  const report =
    input.report &&
    (await uploadAttachment('job_card', input.jobCardId, input.report));
  await graphqlRequest(
    `mutation RecordQc($input: QcRecordInput!) { recordQc(input: $input) { id } }`,
    {
      input: definedOnly({
        jobCardId: input.jobCardId,
        // Raw material QC must say so: kind RM.
        kind: rm ? 'RM' : 'MACHINE',
        jobOperationId: rm ? undefined : input.operationId,
        result: rm
          ? input.passed
            ? 'ACCEPTED'
            : 'REJECTED'
          : input.passed
          ? 'PASSED'
          : 'FAILED',
        remark: textOrNull(input.remark),
        inspector: textOrNull(input.inspector),
        rejectedMaterial:
          rm && !input.passed ? input.rejectedMaterial : undefined,
        report: report || undefined,
      }),
    },
  );
  return get(input.jobCardId);
}

/** Runs one production move on a job card; resolves with the card. */
async function run(id: string, command: JobCardCommand): Promise<JobCard> {
  switch (command.type) {
    case 'route':
      return mutate(
        'updateJobCardRoute',
        '$id: ID!, $steps: [JobRouteStepInput!]!',
        'id: $id, steps: $steps',
        { id, steps: command.steps.map(step => definedOnly(step)) },
      );
    case 'assign':
      return mutate(
        'assignJobOperation',
        '$operationId: ID!, $operatorId: ID!',
        'operationId: $operationId, operatorId: $operatorId',
        { operationId: command.operationId, operatorId: command.operatorId },
      );
    case 'start':
      // Each step needs its operator before it starts.
      if (command.operatorId) {
        await run(id, {
          type: 'assign',
          operationId: command.operationId,
          operatorId: command.operatorId,
        });
      }
      return mutate(
        'startJobStep',
        '$input: StartJobStepInput!',
        'input: $input',
        {
          input: {
            operationId: command.operationId,
            machineId: command.machineId,
          },
        },
      );
    case 'pause':
      return mutate(
        'pauseJobStep',
        '$input: PauseJobStepInput!',
        'input: $input',
        {
          input: definedOnly({
            operationId: command.operationId,
            reason: toWireEnum(command.reason),
            note: textOrNull(command.note) ?? undefined,
          }),
        },
      );
    case 'resume':
      return mutate(
        'resumeJobStep',
        '$operationId: ID!',
        'operationId: $operationId',
        { operationId: command.operationId },
      );
    case 'complete': {
      const { operationId, good, reject, rework, scrap } = command;
      return mutate(
        'completeJobStep',
        '$input: CompleteJobStepInput!',
        'input: $input',
        { input: { operationId, good, reject, rework, scrap } },
      );
    }
    case 'designApproval':
      return mutate(
        'setJobCardDesignApproval',
        '$id: ID!, $approval: DesignApproval!',
        'id: $id, approval: $approval',
        { id, approval: toWireEnum(command.approval) },
      );
    case 'rawMaterial': {
      const m = command.rawMaterial;
      return mutate(
        'saveJobCardRawMaterial',
        '$id: ID!, $input: RawMaterialInput!',
        'id: $id, input: $input',
        {
          id,
          input: {
            rawMaterialGrade: textOrNull(m.rawMaterialGrade),
            rawMaterialSize: textOrNull(m.rawMaterialSize),
            heatNumber: textOrNull(m.heatNumber),
            rmPartNumber: textOrNull(m.rmPartNumber),
            materialSource: m.materialSource
              ? toWireEnum(m.materialSource)
              : null,
          },
        },
      );
    }
    case 'recordQc': {
      const { kind, operationId, passed, remark, inspector } = command;
      return recordQc({
        jobCardId: id,
        kind,
        operationId,
        passed,
        remark,
        inspector,
        rejectedMaterial: command.rejectedMaterial,
        report: command.report,
      });
    }
    case 'attachQcReport': {
      const report = await uploadAttachment(
        'qc_check',
        command.qcId,
        command.report,
      );
      await graphqlRequest(
        `mutation AttachQcReport($id: ID!, $report: AppFileReferenceInput!) {
          attachQcReport(id: $id, report: $report) { id }
        }`,
        { id: command.qcId, report },
      );
      return get(id);
    }
    case 'watch':
      return mutate('watchJob', '$id: ID!', 'id: $id', { id });
    case 'unwatch':
      return mutate('unwatchJob', '$id: ID!', 'id: $id', { id });
  }
}

/**
 * Job cards are cancelled, never deleted, and only before any step starts.
 * The card then leaves the list.
 */
async function remove(id: string): Promise<string> {
  await graphqlRequest(
    `mutation CancelJobCard($id: ID!) { cancelJobCard(id: $id) { id } }`,
    { id },
  );
  return id;
}

/**
 * Re-reads the card. The billing workflow calls this after creating the
 * invoice: the server marks the card invoiced itself, and nothing else on a
 * card is changed by patching it (production moves go through `run`).
 */
const update = (id: string, _changes?: Partial<JobCard>) => get(id);

export const jobCardsApi = {
  list,
  get,
  getByQr,
  getByOrder,
  myJobs,
  run,
  update,
  remove,
};
