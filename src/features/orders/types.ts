import type { BillingStackParamList } from '../billing/types';
import type { CustomersStackParamList } from '../customers/types';
import type { JobCardsStackParamList } from '../jobCards/types';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { CompositeScreenProps } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { AdminDrawerParamList } from '../dashboard/types';
import type {
  ActivityEntry,
  Attachment,
  ISODateString,
} from '../../shared/types';

/** Where the raw material comes from. */
export type MaterialSource = 'bought_out' | 'in_house';
export type OrderPriority = 'high' | 'medium' | 'low';
/**
 * Where an order is, worked out from its job card and invoice (orderStatus):
 * new → yet to start → in progress / paused → payment due → completed.
 */
export type OrderStatus =
  | 'new'
  | 'yet_to_start'
  | 'in_progress'
  | 'paused'
  | 'payment_due'
  | 'completed';

export type WorkOrder = {
  /** Work order number, e.g. "1042" (shown as "WO #1042"). */
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  partName: string;
  /** e.g. "Job A". */
  jobName: string;
  description: string;
  material: string;
  quantity: number;
  priority: OrderPriority;
  /** Set by the selectors from the job card and invoice; see orderStatus. */
  status: OrderStatus;
  dueDate: ISODateString;
  poNumber: string;
  /** The customer's PO value; null until entered. Invoices bill against it. */
  poAmount: number | null;
  routeCardNo: string;
  dcNo: string;
  dcDate: ISODateString;
  partNumber: string;
  drawingNumber: string;
  rmPartNumber: string;
  shopOrderNumber: string;
  rawMaterialSize: string;
  heatNumber: string;
  projectId: string;
  rawMaterialGrade: string;
  /** Bought out or made in-house; set when the job card is created. */
  materialSource: MaterialSource | '';
  /** The quote this order was converted from; blank when created directly. */
  quoteId: string;
  notes: string;
  designFile: Attachment | null;
  documents: Attachment[];
  statusHistory: ActivityEntry[];
  createdAt: ISODateString;
};

/** Everything the Create / Edit order form can set. All optional in the UI. */
export type OrderInput = Omit<
  WorkOrder,
  'id' | 'status' | 'statusHistory' | 'createdAt'
>;

/** Multi-select filters; an empty list shows every order. */
export type OrderFilters = {
  priority: OrderPriority[];
  status: OrderStatus[];
};

// Stack nested inside the admin drawer's "Orders" item.
export type OrdersStackParamList = {
  OrdersList: undefined;
  /** An order's job card; Back returns to the order or the list. */
  JobCardDetails: JobCardsStackParamList['JobCardDetails'];
  /**
   * An order's customer ("View customer"), pushed here so Back returns to
   * the order. Same screen as in Customers.
   */
  CustomerDetails: CustomersStackParamList['CustomerDetails'];
  /** A quote opened from that customer. Same screen as in Billing. */
  QuoteDetails: BillingStackParamList['QuoteDetails'];
  QuoteEdit: BillingStackParamList['QuoteEdit'];
  QuoteOperations: BillingStackParamList['QuoteOperations'];
  OrderDetails: {
    orderId: string;
    /** Opened from this customer's details: Back returns there. */
    fromCustomerId?: string;
    /** Opened from this job card: Back returns there. */
    fromJobCardId?: string;
    /** Opened from this invoice's job link: Back returns there. */
    fromInvoiceId?: string;
  };
  /** Without an id the form creates a new order. */
  OrderForm:
    | {
        orderId?: string;
        /** Edit opened from the order's details: Back and Save return there. */
        from?: 'details';
      }
    | undefined;
};

export type OrdersNavigation = NativeStackNavigationProp<OrdersStackParamList>;

/** Screen props that can also reach the other admin drawer items. */
export type OrdersScreenProps<R extends keyof OrdersStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<OrdersStackParamList, R>,
    DrawerScreenProps<AdminDrawerParamList>
  >;
