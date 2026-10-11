import type { BillingStackParamList } from '../billing/types';
import type { JobCardsStackParamList } from '../jobCards/types';
import type { OrdersStackParamList } from '../orders/types';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { CompositeScreenProps } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { ActivityEntry, ISODateString } from '../../shared/types';
import type { AdminDrawerParamList } from '../dashboard/types';

export type CustomerType = 'business' | 'individual';

export type Customer = {
  id: string;
  type: CustomerType;
  name: string;
  contactPerson: string;
  mobile: string;
  /** Second number to reach them on; optional. */
  alternateMobile: string;
  email: string;
  gstNumber: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  notes: string;
  /** Active work orders. */
  currentProjects: number;
  /** Completed work orders. */
  previousProjects: number;
  totalRevenue: number;
  outstandingBalance: number;
  customerSince: ISODateString;
  activity: ActivityEntry[];
};

/** Fields on the Add / Edit customer form. */
export type CustomerInput = Pick<
  Customer,
  | 'type'
  | 'name'
  | 'contactPerson'
  | 'mobile'
  | 'alternateMobile'
  | 'email'
  | 'gstNumber'
  | 'address'
  | 'city'
  | 'state'
  | 'pinCode'
  | 'country'
  | 'notes'
>;

/** A customer's share of active orders (dashboard + phone customers list). */
export type CustomerShare = {
  id: string;
  name: string;
  orders: number;
  percent: number;
  totalRevenue: number;
  outstandingBalance: number;
  color: string;
};

/** Drawer items that open a customer; Back on the customer returns there. */
/** 'order': pushed over an order (Back returns to it). */
export type CustomerDetailsOrigin = 'dashboard' | 'orders' | 'order';

// Stack nested inside the admin drawer's "Customers" item.
export type CustomersStackParamList = {
  CustomersList: undefined;
  CustomerDetails: {
    customerId: string;
    /** Where it was opened from, so Back returns there. Default: the list. */
    from?: CustomerDetailsOrigin;
    /** Phones: the tab to open on (kept while you're away). */
    tab?: string;
  };
  // Opened from a customer's Orders / Quotes and pushed here, so Back
  // returns to the customer. Same screens as in Orders and Billing.
  OrderDetails: OrdersStackParamList['OrderDetails'];
  OrderForm: OrdersStackParamList['OrderForm'];
  JobCardDetails: JobCardsStackParamList['JobCardDetails'];
  QuoteDetails: BillingStackParamList['QuoteDetails'];
  QuoteEdit: BillingStackParamList['QuoteEdit'];
  QuoteOperations: BillingStackParamList['QuoteOperations'];
};

export type CustomersNavigation =
  NativeStackNavigationProp<CustomersStackParamList>;

/** Screen props that can also reach the other admin drawer items. */
export type CustomersScreenProps<R extends keyof CustomersStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<CustomersStackParamList, R>,
    DrawerScreenProps<AdminDrawerParamList>
  >;
