import type { JobCard } from '../jobCards';
import type { CustomerShare } from '../customers';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { N1IconName } from '../../shared/components';
import type { BillingStackParamList } from '../billing/types';
import type { CustomersStackParamList } from '../customers/types';
import type { JobCardsStackParamList } from '../jobCards/types';
import type { MachinesStackParamList } from '../machines/types';
import type { OrdersStackParamList } from '../orders/types';
import type { ProfileStackParamList } from '../profile/types';
import type { UserManagementStackParamList } from '../userManagement/types';

// Screens in the admin sidebar / drawer.
export type AdminDrawerParamList = {
  Overview: NavigatorScreenParams<DashboardStackParamList> | undefined;
  Users: NavigatorScreenParams<UserManagementStackParamList> | undefined;
  Customers: NavigatorScreenParams<CustomersStackParamList> | undefined;
  Orders: NavigatorScreenParams<OrdersStackParamList> | undefined;
  JobCards: NavigatorScreenParams<JobCardsStackParamList> | undefined;
  Machines: NavigatorScreenParams<MachinesStackParamList> | undefined;
  Billing: NavigatorScreenParams<BillingStackParamList> | undefined;
  /** Not in the menu; opened from the signed-in user in the top bar. */
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
  /** Not in the menu; opened from the organization name in the top bar. */
  Organization: undefined;
};

/**
 * Phones: an action a screen puts in the top bar's right-hand spot, in place
 * of the user's initials (e.g. Create employee).
 */
export type TopBarAction = {
  icon: N1IconName;
  label: string;
  onPress: () => void;
  testID?: string;
};

/** Drawer screen options the top bar reads beyond the standard ones. */
export type AdminDrawerExtraOptions = { topBarAction?: TopBarAction };

// Stack nested inside the drawer's "Overview" item.
export type DashboardStackParamList = {
  DashboardHome: undefined;
  /** A priority job; Back returns to the dashboard. */
  JobCardDetails: JobCardsStackParamList['JobCardDetails'];
};

/** Drawer items listed in the sidebar menu. */
export type AdminRoute = Exclude<
  keyof AdminDrawerParamList,
  'Profile' | 'Organization'
>;

export type MenuItem = {
  route: AdminRoute;
  label: string;
  icon: N1IconName;
  /** Listed in the phone drawer too (the design shows a shorter phone menu). */
  onCompact: boolean;
};

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'invited' | 'suspended';

export type OrgUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  /** ISO date, e.g. "2026-09-12". */
  joined: string;
};

/** Time range picked in the dashboard header. */
export type DashboardPeriod = 'week' | 'month' | 'year';

/** The dashboard summary cards for one period. */
export type PeriodSummary = {
  billed: number;
  outstanding: number;
  orders: number;
};

/** One row of the dashboard's customers table. */
export type CustomerRow = CustomerShare & {
  /** The customer's work orders not yet completed. */
  pendingDelivery: number;
};

/**
 * A priority job: what its tile shows of the job card, plus its route card
 * number and WO number.
 */
export type PriorityJob = Pick<
  JobCard,
  | 'id'
  | 'code'
  | 'customerName'
  | 'partName'
  | 'quantity'
  | 'dueDate'
  | 'status'
  | 'operations'
> & {
  routeCardNo: string;
  /** "1042", shown as "WO #1042". */
  workOrderNumber: string;
};

/** A dashboard customer row before it's given its chart colour. */
export type DashboardCustomer = Omit<CustomerRow, 'color'>;

/** Everything the dashboard shows for one period. */
export type DashboardData = {
  stats: PeriodSummary;
  /** Biggest share of the period's orders first. */
  customers: DashboardCustomer[];
  /** Earliest due first, at most PRIORITY_JOBS_LIMIT. */
  jobs: PriorityJob[];
  /** All priority jobs, for "View all". */
  totalJobs: number;
};
