import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { CompositeScreenProps } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { AdminDrawerParamList } from '../dashboard/types';
import type { BillingStackParamList } from '../billing/types';
import type { CustomersStackParamList } from '../customers/types';
import type {
  MaterialSource,
  OrderPriority,
  OrdersStackParamList,
} from '../orders/types';
import type { Attachment, ISODateString } from '../../shared/types';

export type JobCardStatus =
  | 'not_started'
  | 'in_progress'
  | 'paused'
  | 'completed';
export type OperationStatus = 'pending' | 'running' | 'paused' | 'completed';
export type DesignApproval = 'approved' | 'pending' | 'rejected';
export type MaterialQc = 'accepted' | 'pending' | 'rejected';
export type QcResult = 'accepted' | 'passed' | 'failed' | 'rejected';
export type QuotationStatus = 'accepted' | 'pending' | 'rejected';
export type BillingState = 'invoiced' | 'not_invoiced';

/** One step of the route card, e.g. "Turning (Lathe)" on CNC-02. */
export type JobOperation = {
  id: string;
  /** Operation name, one of JOB_OPERATIONS. */
  name: string;
  /** Machine or station code; blank until the step starts. */
  machine: string;
  /** The machine's id (startJobStep); blank until the step starts. */
  machineId?: string;
  /** The assigned operator's name; blank until one is assigned. */
  operator: string;
  /** The assigned operator's user id (assignJobOperation). */
  operatorId?: string;
  status: OperationStatus;
  /** Reopened by a failed QC check, to be done again. */
  isRework?: boolean;
  /** Pieces the step started with; Complete accounts for every one. */
  quantityStarted?: number | null;
  startedAt: ISODateString | null;
  completedAt: ISODateString | null;
};

/** Why a running step was paused (pauseJobStep). */
export type PauseReason =
  | 'tool_change'
  | 'material'
  | 'breakdown'
  | 'break'
  | 'other';

/** What a finished step produced; the counts add up to quantityStarted. */
export type StepCounts = {
  good: number;
  reject: number;
  rework: number;
  scrap: number;
};

/** What RM QC recorded about material it rejected. */
export type RejectedMaterial = {
  grade: string;
  heatNumber: string;
  size: string;
};

export type QcEntry = {
  id: string;
  /** Raw material (incoming) or machine (after a step) check. */
  kind?: 'rm' | 'machine';
  stage: string;
  result: QcResult;
  remark: string;
  at: ISODateString;
  /** The route card step a machine QC check inspected. */
  operationId?: string;
  /** RM QC rejection: the grade, heat number and size received. */
  rejectedMaterial?: RejectedMaterial;
  /** Who did the check, e.g. "Suresh Babu". */
  inspector?: string;
  /** The inspection report uploaded for this check. */
  report?: Attachment;
};

/**
 * Shop-floor view of a work order: one job card per order, opened with it.
 * The job's order details are copied in, as the API returns them (the "job
 * view": no prices or client data).
 */
export type JobCard = {
  /** The job card's own id; not the order's. */
  id: string;
  /** The order it was opened with. */
  orderId: string;
  /** The order's work order number as the server gives it, e.g. "WO-12". */
  number: string;
  /** Job card number, e.g. "JOB1". Given when the card is created. */
  code: string;
  customerId: string;
  customerName: string;
  partName: string;
  jobName: string;
  material: string;
  quantity: number;
  priority: OrderPriority;
  dueDate: ISODateString;
  status: JobCardStatus;
  designFile: Attachment | null;
  designApproval: DesignApproval;
  /** From the work order: bought out or in-house; blank if not given. */
  materialSource: MaterialSource | '';
  materialQc: MaterialQc;
  /** The route card, in order. Empty until a flow is created. */
  operations: JobOperation[];
  qcHistory: QcEntry[];
  quotation: QuotationStatus;
  billing: BillingState;
  // From the order, for the shop floor's job view.
  partNumber?: string;
  drawingNumber?: string;
  poNumber?: string;
  routeCardNo?: string;
};

/** What the screens change: the flow and the operation progress. */
export type JobCardInput = Pick<JobCard, 'operations' | 'status'>;

/** One step of a flow being saved: a saved step keeps its id. */
export type RouteStep = { id?: string; name: string };

/** QC's verdict on a check (recordQc). */
export type QcRecordInput = {
  jobCardId: string;
  kind: 'rm' | 'machine';
  /** Machine QC: the step inspected. */
  operationId?: string;
  passed: boolean;
  remark: string;
  inspector: string;
  rejectedMaterial?: RejectedMaterial;
  report?: Attachment;
};

/**
 * Production moves on a job card, each its own mutation. The server answers
 * with the job card, statuses and all.
 */
export type JobCardCommand =
  | { type: 'route'; steps: RouteStep[] }
  | { type: 'assign'; operationId: string; operatorId: string }
  | {
      type: 'start';
      operationId: string;
      machineId: string;
      /** Assigns this operator first when the step has another (or none). */
      operatorId?: string;
    }
  | { type: 'pause'; operationId: string; reason: PauseReason; note: string }
  | { type: 'resume'; operationId: string }
  | ({ type: 'complete'; operationId: string } & StepCounts)
  | { type: 'designApproval'; approval: DesignApproval }
  | { type: 'rawMaterial'; rawMaterial: RawMaterialDetails }
  | ({ type: 'recordQc' } & Omit<QcRecordInput, 'jobCardId'>)
  | { type: 'attachQcReport'; qcId: string; report: Attachment }
  | { type: 'watch' }
  | { type: 'unwatch' };

/** Raw material details saved on the job card (saveJobCardRawMaterial). */
export type RawMaterialDetails = {
  rawMaterialGrade: string;
  rawMaterialSize: string;
  heatNumber: string;
  rmPartNumber: string;
  materialSource: MaterialSource | '';
};

/** Multi-select filters; an empty list shows every card. */
export type JobCardFilters = {
  operation: string[];
  operator: string[];
  machine: string[];
};

/**
 * Admin screens outside Job Cards that open a job card; Back returns there.
 * "order" is the work order with the card's id.
 */
export type JobCardOrigin = 'dashboard' | 'order' | 'employee';

/** Where a job card screen was opened from. Default: the screen below it. */
export type JobCardOriginParams = {
  from?: JobCardOrigin;
  /** With from "employee": whose work history it was opened from. */
  fromUserId?: string;
};

// Stack nested inside the admin drawer's "Job Cards" item.
export type JobCardsStackParamList = {
  JobCardsList: undefined;
  JobCardDetails: {
    jobCardId: string;
    /** Opens with Create / Edit flow already open on the Machining tab. */
    editFlow?: boolean;
  } & JobCardOriginParams;
  /**
   * A job card's work order, pushed here so Back returns to the job card;
   * with its Edit, customer and that customer's quotes. Same screens as in
   * Orders.
   */
  OrderDetails: OrdersStackParamList['OrderDetails'];
  OrderForm: OrdersStackParamList['OrderForm'];
  CustomerDetails: CustomersStackParamList['CustomerDetails'];
  QuoteDetails: BillingStackParamList['QuoteDetails'];
  QuoteEdit: BillingStackParamList['QuoteEdit'];
  QuoteOperations: BillingStackParamList['QuoteOperations'];
};

export type JobCardsNavigation =
  NativeStackNavigationProp<JobCardsStackParamList>;

/** Screen props that can also reach the other admin drawer items. */
export type JobCardsScreenProps<R extends keyof JobCardsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<JobCardsStackParamList, R>,
    DrawerScreenProps<AdminDrawerParamList>
  >;
