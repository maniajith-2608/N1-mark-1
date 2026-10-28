import type { JobCardsStackParamList } from '../jobCards/types';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { CompositeScreenProps } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type {
  ActivityEntry,
  Attachment,
  ISODateString,
} from '../../shared/types';

import type { UserRole } from '../auth/constants';
import type { AdminDrawerParamList } from '../dashboard/types';

/** Admin uses the dashboard; Supervisor, Operator and QC use the shop-floor app. */
export type { UserRole };
export type UserStatus = 'active' | 'inactive';

export type UserPermissionKey = 'viewOrders' | 'manageUsers' | 'exportReports';
export type UserPermissions = Record<UserPermissionKey, boolean>;

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  designation: string;
  phone: string;
  department: string;
  /** Building, street, area. */
  address: string;
  city: string;
  /** One of STATE_OPTIONS, e.g. "Tamil Nadu". */
  state: string;
  pinCode: string;
  country: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: ISODateString;
  permissions: UserPermissions;
  attachments: Attachment[];
  activity: ActivityEntry[];
};

/** What the Create / Edit user form sends. Password is write-only. */
export type UserInput = {
  name: string;
  designation: string;
  /** Optional; the phone number is required instead. */
  email: string;
  role: UserRole;
  status: UserStatus;
  /** Blank on edit keeps the current password. */
  password?: string;
  phone?: string;
  department?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  attachments?: Attachment[];
  permissions?: UserPermissions;
};

/** Multi-select filters; an empty list shows everyone. */
export type UserFilters = {
  role: UserRole[];
  status: UserStatus[];
};

// Stack nested inside the admin drawer's "Users" item.
export type UserManagementStackParamList = {
  UsersList: undefined;
  UserDetails: {
    userId: string;
    /** Section to open on; defaults to the profile. */
    section?: UserDetailsSection;
  };
  /** A job card from someone's work history; Back returns to it. */
  JobCardDetails: JobCardsStackParamList['JobCardDetails'];
};

export type UserDetailsSection =
  | 'profile'
  | 'address'
  | 'work'
  | 'security'
  | 'documents';

export type UserManagementNavigation =
  NativeStackNavigationProp<UserManagementStackParamList>;

/** Screen props that can also reach the other admin drawer items (Job Cards). */
export type UserManagementScreenProps<
  R extends keyof UserManagementStackParamList,
> = CompositeScreenProps<
  NativeStackScreenProps<UserManagementStackParamList, R>,
  DrawerScreenProps<AdminDrawerParamList>
>;
