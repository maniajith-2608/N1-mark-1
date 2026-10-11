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
  /** Machine or station code; blank until the step is assigned. */
  machine: string;
  operator: string;
  status: OperationStatus;
  startedAt: ISODateString | null;
  completedAt: ISODateString | null;
};

/** What RM QC recorded about material it rejected. */
export type RejectedMaterial = {
  grade: string;
  heatNumber: string;
  size: string;
};

export type QcEntry = {
  id: string;
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
 * Shop-floor view of a work order. One job card per order, so the id is the
 * work order number. Order details are copied in, as the API returns them.
 */
export type JobCard = {
  /** Work order number, e.g. "1042". */
  id: string;
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
};

/** What the screens change: the flow and the operation progress. */
export type JobCardInput = Pick<JobCard, 'operations' | 'status'>;

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
