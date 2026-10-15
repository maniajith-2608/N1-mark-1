import type { StatusMeta } from '../../shared/types';
import type { OperationStatus, RejectedMaterial } from '../jobCards/types';
import type { EmployeeRole } from '../profile/types';
import type { RawMaterialInput } from './types';

/**
 * How each role works its jobs. Supervisor imports to the order (then raw
 * material and job card) and sees progress cards; the shop floor imports
 * straight to the job and sees simple rows.
 */
export const ROLE_JOBS: Record<
  EmployeeRole,
  { importTo: 'order' | 'job' | 'qc'; list: 'cards' | 'rows' }
> = {
  supervisor: { importTo: 'order', list: 'cards' },
  operator: { importTo: 'job', list: 'rows' },
  qc: { importTo: 'qc', list: 'rows' },
};

export const QC_STRINGS = {
  title: 'QC',
  subtitle: (pending: number, total: number) =>
    `${pending} pending · ${total} total`,
  tabs: { rm: 'Raw Material QC', machine: 'Machine QC' },
  statusFilter: 'QC status',
  kind: { rm: 'RM QC', machine: 'Machine QC' },
  stages: {
    incoming: 'Incoming inspection',
    inProcess: 'In-process QC',
    final: 'Final QC',
    nothingDone: 'No operation finished yet',
    materialStage: 'Material QC',
    operationStage: (operation: string) => `${operation} - QC`,
  },
  station: {
    assignedQc: 'Assigned QC',
    /** "Turning (Lathe) QC"; a step already named "… QC" stays as is. */
    operationQc: (operation: string) =>
      /\bQC$/.test(operation) ? operation : `${operation} QC`,
  },
  check: {
    title: 'QC Check',
    remark: 'Remarks',
    pass: 'Pass',
    fail: 'Fail',
    running:
      'This operation is still running. Check it once the operator completes it.',
    waiting: 'No operation has been completed on this job yet.',
  },
  fail: {
    title: 'Fail Remarks',
    remarks: 'Remarks',
    placeholder:
      'Describe the reason for failure — e.g. dimension out of tolerance, surface defect, missing certificate…',
    voiceNote: 'Voice note',
    voiceNotes: 'Voice notes',
    submit: 'Submit Fail',
    /** RM QC: what was received, all required. */
    rejectedMaterial: 'Rejected material',
    rejectedHelp:
      'Record the grade, heat number and size of the material received.',
    /** Optional: photos or a report backing up the failure. */
    document: 'Supporting document',
    documentHint: 'Upload a photo, PDF or report',
    documentKind: 'QC report',
    documentSample: 'qc-fail-report.pdf',
    documentAccept: '.pdf,.doc,.docx,.xls,.xlsx,image/*',
  },
} as const;

export const QC_STATUS_META: Record<
  'pending' | 'in_progress' | 'passed' | 'failed' | 'waiting',
  StatusMeta
> = {
  pending: { label: 'Pending', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'info' },
  passed: { label: 'Passed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  waiting: { label: 'Waiting', tone: 'neutral' },
};

export const OPERATION_STATUS_META: Record<OperationStatus, StatusMeta> = {
  pending: { label: 'Not started', tone: 'neutral' },
  running: { label: 'Running', tone: 'success' },
  paused: { label: 'Paused', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
};

export const JOBS_STRINGS = {
  myJobs: {
    title: 'My Jobs',
    subtitle: (active: number, total: number) =>
      `${active} active · ${total} total`,
    inProgressSubtitle: (inProgress: number, total: number) =>
      `${inProgress} in progress · ${total} total`,
    importJob: 'Import Job',
    search: 'Search jobs',
    empty: 'No jobs yet. Import one to get started.',
    stageFilter: 'Stage',
    /** A job on the shop-floor home. */
    card: {
      priority: (label: string) => `${label} priority`,
      quantity: (qty: number) => `${qty} pcs`,
      due: (date: string) => `Due ${date}`,
      operator: 'Operator',
      noOperator: 'Not assigned',
      done: 'done',
    },
    operationFilter: 'Operation',
    machineFilter: 'Machine',
  },
  scan: {
    title: 'Scan QR Code',
    frameTitle: 'Align the QR code within the frame',
    message: 'The job details will import automatically once scanned',
    manual: 'Enter code manually',
    flash: 'Turn on flash',
    flashOff: 'Turn off flash',
  },
  code: {
    title: 'Enter Job Code',
    heading: 'Type in the job code',
    help: "You'll find this printed on the job card or route card if the QR code can't be scanned.",
    label: 'Job code',
    placeholder: 'e.g. WO-1042',
    importJob: 'Import Job',
    scanInstead: 'Scan QR code instead',
    notFound: (code: string) => `No work order found for ${code}`,
    noRoute: (workOrder: string) =>
      `${workOrder} has no route card yet. Ask an admin to create its flow.`,
  },
  order: {
    title: 'Order',
    createJobCard: 'Create Job Card',
    viewJobCard: 'View Job Card',
    openDrawing: (no: string) => `Open drawing ${no}`,
  },
  orderDetails: {
    title: 'Order Details',
    open: 'View Details',
  },
  operatorJob: {
    title: 'Job Detail',
    activeStation: 'Active station',
    nextOperation: 'Next operation',
    machine: 'Machine',
    operator: 'Operator',
    notAssigned: 'Not assigned',
    startedAt: 'Started at',
    elapsed: 'Elapsed time',
    materialQc: (label: string) => `Material QC: ${label}`,
    routeCard: 'Route card & progress',
    step: (n: number, total: number) => `Step ${n} of ${total}`,
    allDone: 'Every operation on this job is complete.',
    start: 'Start',
    resume: 'Resume',
    pause: 'Pause',
    complete: 'Complete',
  },
  assignMachine: {
    title: 'Assign Machine',
    help: "Select the machine you'll run this operation on",
    confirm: 'Confirm & Start',
    available: 'Available',
    inUse: 'In use',
    maintenance: 'Maintenance',
    empty: 'No machines are set up yet.',
  },
  rawMaterial: {
    title: 'Raw Material Details',
    heading: 'A few details are missing',
    help: (workOrder: string) =>
      `Fill in the raw material details for ${workOrder} before the job card is created.`,
    /** When the order already has every detail: confirm instead of fill in. */
    confirmHeading: 'Check the raw material details',
    confirmHelp: (workOrder: string) =>
      `Confirm the raw material details for ${workOrder} before the job card is created.`,
    continue: 'Continue',
    /** Re-initiate RM QC: the replacement for rejected material. */
    retestHeading: 'Replacement material',
    retestHelp: (workOrder: string) =>
      `Enter the new material for ${workOrder}. RM QC will inspect it again.`,
    retestSubmit: 'Re-initiate RM QC',
  },
} as const;

/** Raw Material Details fields, in form order. All are required. */
export const RAW_MATERIAL_FIELDS: {
  key: Exclude<keyof RawMaterialInput, 'materialSource'>;
  label: string;
  placeholder: string;
}[] = [
  {
    key: 'rawMaterialGrade',
    label: 'Raw material grade',
    placeholder: 'e.g. EN8',
  },
  {
    key: 'rawMaterialSize',
    label: 'Raw material size',
    placeholder: 'e.g. 25mm dia x 200mm',
  },
  { key: 'heatNumber', label: 'Heat number', placeholder: 'e.g. HT-99213' },
  { key: 'rmPartNumber', label: 'RM part number', placeholder: 'e.g. RM-4092' },
];

export const MATERIAL_SOURCE_FIELD = { label: 'Material source' } as const;

/** RM QC Fail: the rejected material's details, in form order. */
export const REJECTED_MATERIAL_FIELDS: {
  key: keyof RejectedMaterial;
  label: string;
  placeholder: string;
}[] = [
  { key: 'grade', label: 'RM grade', placeholder: 'e.g. EN8' },
  { key: 'heatNumber', label: 'Heat number', placeholder: 'e.g. HT-99213' },
  { key: 'size', label: 'RM size', placeholder: 'e.g. 25mm dia x 200mm' },
];
