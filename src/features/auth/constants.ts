import type { N1DropDownOption } from '../../shared/components';
import { INDIAN_STATES } from '../../shared/constants';

/** Shown on the hero panel of every auth screen (login, sign-up, reset). */
export const AUTH_TAGLINE =
  'N1 brings your organization, your team, and your data together in one simple workspace. Stay on top of daily operations, keep your team aligned, and get a clear view of your business from one dashboard.';

export { PASSWORD_MIN_LENGTH } from '../../config/constants';

/**
 * Login screen links, temporarily hidden on web and mobile. Set one back to
 * true to show its link again; the screens and routes are untouched.
 */
export const AUTH_ENTRY_POINTS = {
  createOrganization: false,
  forgotPassword: false,
};

/** Digits in the emailed verification code. */
export const VERIFICATION_CODE_LENGTH = 6;

/** Letters and digits taken from the name for the organization code. */
export const ORGANIZATION_CODE_LENGTH = 6;

/** Digits in the random number after the name part ("ABCENG-4821"). */
export const ORGANIZATION_CODE_SUFFIX_LENGTH = 4;

/** N1 serves manufacturers only, so Manufacturing is the one industry. */
export const INDUSTRY_OPTIONS: N1DropDownOption<string>[] = [
  { label: 'Manufacturing', value: 'manufacturing' },
];

/** The only industry, so Create organization starts with it picked. */
export const DEFAULT_INDUSTRY = INDUSTRY_OPTIONS[0].value;

/** The registered address's state; the backend takes the name. */
export const STATE_OPTIONS: N1DropDownOption<string>[] = INDIAN_STATES.map(
  s => ({ label: s.name, value: s.name }),
);

export const USER_ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  OPERATOR: 'operator',
  QC: 'qc',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** The backend's roles (RoleName); the app shows only the four above. */
export type BackendRole =
  | 'OWNER'
  | 'ADMIN'
  | 'ACCOUNTANT'
  | 'SUPERVISOR'
  | 'OPERATOR'
  | 'QC';

/**
 * Owner and accountant use the admin dashboard (the accountant's billing
 * lives there); the backend still limits what each may do.
 */
export const BACKEND_ROLE_TO_APP: Record<BackendRole, UserRole> = {
  OWNER: USER_ROLES.ADMIN,
  ADMIN: USER_ROLES.ADMIN,
  ACCOUNTANT: USER_ROLES.ADMIN,
  SUPERVISOR: USER_ROLES.SUPERVISOR,
  OPERATOR: USER_ROLES.OPERATOR,
  QC: USER_ROLES.QC,
};

/** The role a new person gets for each app role. */
export const APP_ROLE_TO_BACKEND: Record<UserRole, BackendRole> = {
  [USER_ROLES.ADMIN]: 'ADMIN',
  [USER_ROLES.SUPERVISOR]: 'SUPERVISOR',
  [USER_ROLES.OPERATOR]: 'OPERATOR',
  [USER_ROLES.QC]: 'QC',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.SUPERVISOR]: 'Supervisor',
  [USER_ROLES.OPERATOR]: 'Operator',
  [USER_ROLES.QC]: 'QC',
};

/**
 * Dashboard stack screen each role lands on after login: Admin gets the
 * dashboard; the others get the shop-floor app (jobs and scanning).
 */
export const ROLE_HOME = {
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.SUPERVISOR]: 'Supervisor',
  [USER_ROLES.OPERATOR]: 'Operator',
  [USER_ROLES.QC]: 'Qc',
} as const satisfies Record<UserRole, string>;

export type MockUser = {
  email: string;
  /** 10-digit mobile number; logging in with it works like the email. */
  phone: string;
  password: string;
  role: UserRole;
};

/** Logins for the Jest stand-in of the auth API (api/mockAuthApi.ts). */
export const MOCK_USERS: MockUser[] = [
  {
    email: 'admin@n1.com',
    phone: '9000000001',
    password: 'Admin@123',
    role: USER_ROLES.ADMIN,
  },
  {
    email: 'supervisor@n1.com',
    phone: '9000000002',
    password: 'Supervisor@123',
    role: USER_ROLES.SUPERVISOR,
  },
  {
    email: 'operator@n1.com',
    phone: '9000000003',
    password: 'Operator@123',
    role: USER_ROLES.OPERATOR,
  },
  {
    email: 'qc@n1.com',
    phone: '9000000004',
    password: 'Qc@12345',
    role: USER_ROLES.QC,
  },
];

export const INVALID_CREDENTIALS_MESSAGE =
  'Invalid email, phone number or password.';
