import type { N1DropDownOption, N1Tab, N1Tone } from '../../shared/components';
import type {
  DashboardPeriod,
  MenuItem,
  OrgUser,
  UserRole,
  UserStatus,
} from './types';

export const MENU_ITEMS: MenuItem[] = [
  { route: 'Overview', label: 'Dashboard', icon: 'dashboard', onCompact: true },
  { route: 'Users', label: 'Employees', icon: 'users', onCompact: true },
  {
    route: 'Customers',
    label: 'Customers',
    icon: 'building',
    onCompact: true,
  },
  { route: 'Orders', label: 'Orders', icon: 'package', onCompact: true },
  {
    route: 'JobCards',
    label: 'Job Cards',
    icon: 'clipboard',
    onCompact: true,
  },
  { route: 'Machines', label: 'Machines', icon: 'wrench', onCompact: true },
  { route: 'Billing', label: 'Billing', icon: 'receipt', onCompact: true },
];

// Sample data until the API exists.
export const SAMPLE_USERS: OrgUser[] = [
  {
    id: '1',
    name: 'Koushik Dasarathan',
    email: 'kousigaratchagan.pd@foodhub.com',
    role: 'admin',
    status: 'active',
    joined: '2026-09-12',
  },
  {
    id: '2',
    name: 'Priya Sharma',
    email: 'priya.sharma@abcengineering.com',
    role: 'user',
    status: 'active',
    joined: '2026-09-18',
  },
  {
    id: '3',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@abcengineering.com',
    role: 'user',
    status: 'invited',
    joined: '2026-09-20',
  },
  {
    id: '4',
    name: 'Divya Rao',
    email: 'divya.rao@abcengineering.com',
    role: 'user',
    status: 'active',
    joined: '2026-09-22',
  },
  {
    id: '5',
    name: 'Karthik Iyer',
    email: 'karthik.iyer@abcengineering.com',
    role: 'user',
    status: 'suspended',
    joined: '2026-09-24',
  },
];

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  user: 'User',
};
export const ROLE_TONE: Record<UserRole, N1Tone> = {
  admin: 'info',
  user: 'neutral',
};

export const STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Active',
  invited: 'Invited',
  suspended: 'Suspended',
};
export const STATUS_TONE: Record<UserStatus, N1Tone> = {
  active: 'success',
  invited: 'info',
  suspended: 'danger',
};

export const ALL = 'all';

export const ROLE_FILTER_OPTIONS: N1DropDownOption<string>[] = [
  { label: 'All roles', value: ALL },
  { label: 'Admin', value: 'admin' },
  { label: 'User', value: 'user' },
];

export const STATUS_FILTER_OPTIONS: N1DropDownOption<string>[] = [
  { label: 'All statuses', value: ALL },
  { label: 'Active', value: 'active' },
  { label: 'Invited', value: 'invited' },
  { label: 'Suspended', value: 'suspended' },
];

export const DASHBOARD_STRINGS = {
  /** Greets the signed-in user; plain "Welcome back" until the name loads. */
  title: (name?: string) => (name ? `Welcome back, ${name}` : 'Welcome back'),
  subtitle: (org: string) => `Overview for ${org}.`,
  loadFailed: 'Failed to load the dashboard',
  /** Phones: above the user's name. */
  greeting: 'Welcome back,',
  /** This calendar week (from Monday), month or year. */
  periods: [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
  ] as N1Tab<DashboardPeriod>[],
  stats: {
    billed: 'Total billed',
    outstanding: 'Outstanding',
    orders: 'Total orders',
    open: (label: string) => `Open ${label}`,
  },
  customers: {
    title: 'Customers',
    subtitle: 'Orders, billing and deliveries by customer.',
    viewAll: 'View all',
    empty: 'No data',
    columns: {
      customer: 'Customer',
      orders: 'Total orders',
      billed: 'Billed',
      outstanding: 'Outstanding',
      pending: 'Pending delivery',
      share: 'Contribution',
    },
    orders: (n: number) => `${n} orders`,
    pending: (n: number) => `${n} pending`,
    billed: (amount: string) => `Billed ${amount}`,
    outstanding: (amount: string) => `Outstanding ${amount}`,
    open: (name: string) => `Open ${name}`,
  },
  jobs: {
    title: 'Priority jobs (by due date)',
    viewAll: (n: number) => `View all (${n})`,
    empty: 'No jobs',
    open: (title: string) => `Open ${title}`,
    /** "RC-2210 (Acme Metalworks)" */
    heading: (routeCard: string, customer: string) =>
      customer ? `${routeCard} (${customer})` : routeCard,
    progress: 'Progress',
    noProcess: 'No process yet',
    unassigned: 'Unassigned',
    due: (date: string) => `Due ${date}`,
  },
} as const;

/** Rows in the priority jobs panel before "View all". */
export const PRIORITY_JOBS_LIMIT = 10;

/** A job due within this many days (or overdue) shows its date in red. */
export const DUE_SOON_DAYS = 3;
