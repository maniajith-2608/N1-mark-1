import type { N1DropDownOption } from '../../shared/components';
import type { StatusMeta } from '../../shared/types';
import { workOrderLabel } from '../orders/constants';
import type {
  BillingState,
  JobCardFilters,
  MaterialQc,
  PauseReason,
  QcResult,
  QuotationStatus,
} from './types';

export const JOB_CARD_STRINGS = {
  /** On a job's card while RM QC has rejected its material. */
  rmQcFailed: 'RM QC failed',
  title: 'Job Cards',
  subtitle:
    'Shop-floor operations in progress, with the machine and operator assigned to each.',
  search: 'Search by job ID, WO #, part or operator',
  noun: 'job cards',
  operationFilter: 'Operation',
  operatorFilter: 'Operator',
  machineFilter: 'Assigned machine',
  columns: {
    order: 'Job ID',
    part: 'Part name',
    status: 'Status',
    machine: 'Assigned machine',
    operator: 'Operator',
    diagram: 'Diagram',
    progress: 'Progress',
    actions: 'Actions',
  },
  /** The work order number ("WO-12") as the app writes it. */
  workOrder: workOrderLabel,
  /** The job card's status (jobCardStage): RM, each operation and its QC, dispatch. */
  stages: {
    rmReceived: 'RM received',
    rmQcFailed: 'RM QC failed',
    rmQcPassed: 'RM QC passed',
    yetToStart: 'Yet to start',
    paused: (operation: string) => `${operation} (paused)`,
    next: (operation: string) => `${operation} (up next)`,
    operationQc: (operation: string) => `${operation} QC`,
    finalQc: 'Final QC',
    failed: (stage: string) => `${stage} failed`,
    readyToDispatch: 'Ready to dispatch',
    done: 'Done',
    waitingForRmQc: 'Waiting for RM QC',
    waitingForQc: (operation: string) => `Waiting for ${operation} QC`,
    redo: (operation: string) => `Redo ${operation}`,
    waitingForDesign: 'Waiting for design approval',
  },
  /** Blank until the card is saved. */
  jobCardNumber: (code: string) => (code ? `#${code}` : ''),
  operator: (name: string) => `Operator: ${name}`,
  quantity: (n: number) => `${n} pcs`,
  view: 'View',
  /** Job cards are cancelled, never deleted, and only before work starts. */
  delete: {
    title: 'Cancel job card?',
    message: (number: string) =>
      `This cancels the job card for ${workOrderLabel(
        number,
      )}. Its order stays; nothing on it has started yet.`,
    confirm: 'Cancel job card',
  },
  /** Each takes the job's work order number. */
  a11y: {
    view: (number: string) => `View job card ${workOrderLabel(number)}`,
    delete: (number: string) => `Cancel job card ${workOrderLabel(number)}`,
    createFlow: (number: string) => `Create flow for ${workOrderLabel(number)}`,
    editFlow: (number: string) => `Edit flow for ${workOrderLabel(number)}`,
    diagram: (number: string) => `Open drawing for ${workOrderLabel(number)}`,
  },
  details: {
    title: 'Job card',
    back: 'Back',
    backTo: {
      dashboard: 'Back to dashboard',
      order: 'Back to order',
      employee: 'Back to employee',
    },
    tabs: { order: 'Order details', machining: 'Machining', qc: 'QC' },
    orderSection: 'Order',
    order: {
      due: (date: string) => `Due ${date}`,
      open: (number: string) => `Open order ${workOrderLabel(number)}`,
    },
    /** The job's details on the Machining tab, above the route card. */
    info: {
      due: 'Due date',
      qty: 'Quantity',
      part: 'Part',
      materialQc: 'Material QC',
      design: 'Design approval',
    },
    start: 'Start Operation',
    /** Phones: the sticky bottom bar shares its width three ways. */
    startShort: 'Start',
    pause: 'Pause',
    complete: 'Complete',
    /** Start (or redo) a step: who runs it, on which idle machine. */
    startStep: {
      title: (operation: string) => `Start ${operation}`,
      help: 'The operator runs this step on an idle machine.',
      operator: 'Operator',
      operatorPlaceholder: 'Select operator',
      machine: 'Machine',
      machinePlaceholder: 'Select an idle machine',
      noMachines: 'No machine is idle right now.',
      confirm: 'Start',
    },
    /** Complete the running step: what it produced. */
    completeStep: {
      title: (operation: string) => `Complete ${operation}`,
      help: (quantity: number) =>
        `Account for all ${quantity} pieces this step started with.`,
      good: 'Good',
      reject: 'Rejected',
      rework: 'Rework',
      scrap: 'Scrap',
      mismatch: (total: number, quantity: number) =>
        `These add up to ${total}; they must add up to ${quantity}.`,
      confirm: 'Complete step',
    },
    /** Pause the running step: why. */
    pauseStep: {
      title: (operation: string) => `Pause ${operation}`,
      reason: 'Reason',
      note: 'Details',
      notePlaceholder: 'What happened?',
      confirm: 'Pause',
    },
    resume: 'Resume',
    /** Supervisor / admin: the drawing must be approved before work starts. */
    approveDesign: 'Approve design',
    rejectDesign: 'Reject design',
    dispatch: 'Generate Dispatch',
    priority: 'Priority:',
    due: 'Due:',
    qty: 'Qty:',
    drawing: 'Drawing / design',
    noDrawing: 'No drawing attached',
    viewDrawing: (no: string) => `View drawing ${no}`,
    designApproval: (label: string) => `Design approval: ${label}`,
    material: 'Material',
    source: 'Source',
    materialQc: 'Material QC',
    rejectedMaterial: 'Rejected material',
    rmGrade: 'RM grade',
    heatNumber: 'Heat no.',
    rmSize: 'RM size',
    reason: 'Reason',
    reinitiate: 'Re-initiate RM QC',
    routeCard: 'Route card & progress',
    editFlow: 'Edit flow',
    editFlowShort: 'Edit',
    createFlow: 'Create flow',
    noFlow:
      'No process flow yet. Create one to plan the operations for this job.',
    overall: 'Overall completion',
    nextOperation: 'Next operation',
    upcoming: 'Upcoming',
    paused: 'Paused',
    completedAt: (time: string) => `Completed at: ${time}`,
    startedAt: (time: string) => `Started at: ${time}`,
    qcHistory: 'QC history',
    noQc: 'No QC checks logged yet.',
    qcColumns: {
      stage: 'Stage',
      result: 'Result',
      remark: 'Remark',
      date: 'Date',
      inspector: 'QC by',
      report: 'Report',
    },
    report: {
      upload: 'Upload',
      kind: 'QC report',
      sample: 'qc-report.pdf',
      accept: '.pdf,.doc,.docx,.xls,.xlsx,image/*',
      open: 'Opening QC reports',
      /** Phones: the report's details sheet. */
      title: 'QC report',
      openFile: 'Open file',
      a11y: {
        upload: (stage: string) => `Upload QC report for ${stage}`,
        open: (name: string) => `Open ${name}`,
      },
    },
    quotation: 'Quotation',
    billing: 'Billing',
    notFound: 'This job card no longer exists.',
  },
  flow: {
    createTitle: 'Create flow',
    editTitle: 'Edit flow',
    createHelp:
      'Add each operation the material will go through, in the order it should happen.',
    editHelp:
      'Steps already started are locked. Reorder, swap or add the steps still to come.',
    stepPlaceholder: 'Select operation',
    stepLabel: (n: number) => `Operation ${n}`,
    addProcess: 'Add process',
    create: 'Create',
    save: 'Save changes',
    noSteps: 'Add at least one operation',
  },
} as const;

/** Operations a route card can include, in the order they usually run. */
export const JOB_OPERATIONS = [
  'Cutting',
  'Facing (Lathe)',
  'Turning (Lathe)',
  'CNC Turning',
  'CNC Milling',
  'Drilling',
  'Deburring',
  'Welding',
  'Marking',
  'QC Inspection',
  'Final check',
  'Packing',
] as const;

export const OPERATION_OPTIONS: N1DropDownOption<string>[] = JOB_OPERATIONS.map(
  value => ({ value, label: value }),
);

/** Steps a new flow starts with (the Create flow design shows three). */
export const NEW_FLOW_STEPS = 3;

const ST = JOB_CARD_STRINGS.stages;

/** Badges for the stages that don't name an operation. */
export const STAGE_META = {
  rm_received: { label: ST.rmReceived, tone: 'neutral' },
  rm_qc_failed: { label: ST.rmQcFailed, tone: 'danger' },
  rm_qc_passed: { label: ST.rmQcPassed, tone: 'info' },
  yet_to_start: { label: ST.yetToStart, tone: 'neutral' },
  ready_to_dispatch: { label: ST.readyToDispatch, tone: 'success' },
  done: { label: ST.done, tone: 'success' },
} as const satisfies Record<string, StatusMeta>;

/** Pause reasons, in the order the pause dialog lists them. */
export const PAUSE_REASON_OPTIONS: { value: PauseReason; label: string }[] = [
  { value: 'tool_change', label: 'Tool change' },
  { value: 'material', label: 'Material' },
  { value: 'breakdown', label: 'Breakdown' },
  { value: 'break', label: 'Break' },
  { value: 'other', label: 'Other' },
];

export const DESIGN_APPROVAL_META: Record<
  'approved' | 'pending' | 'rejected',
  StatusMeta
> = {
  approved: { label: 'Approved', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export const MATERIAL_QC_META: Record<MaterialQc, StatusMeta> = {
  accepted: { label: 'Accepted', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export const QC_RESULT_META: Record<QcResult, StatusMeta> = {
  accepted: { label: 'Accepted', tone: 'success' },
  passed: { label: 'Passed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export const QUOTATION_META: Record<QuotationStatus, StatusMeta> = {
  accepted: { label: 'Accepted', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export const BILLING_META: Record<BillingState, StatusMeta> = {
  invoiced: { label: 'Invoiced', tone: 'success' },
  not_invoiced: { label: 'Not invoiced', tone: 'warning' },
};

export const INITIAL_JOB_CARD_FILTERS: JobCardFilters = {
  operation: [],
  operator: [],
  machine: [],
};
