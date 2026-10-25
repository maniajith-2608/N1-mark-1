import { ROLE_LABELS } from '../auth/constants';
import type { EmployeeRole } from './types';

export const PROFILE_STRINGS = {
  title: 'My profile',
  addressTitle: 'Address',
  tabs: {
    account: 'Account settings',
    security: 'Security',
  },
  /** Phones: My profile's menu rows. */
  menu: {
    organization: 'Organization details',
    account: 'Account settings',
    security: 'Security',
    address: 'Address details',
  },
  changePhoto: 'Change photo',
  phoneHelp: 'Your sign-in number. Contact support to change it.',
  logout: 'Log out',
  editProfile: 'Edit profile',
  edit: 'Edit',
  email: 'Email',
  phone: 'Phone number',
  organization: 'Organization',
  organizationCode: 'Organization code',
  memberSince: 'Member since',
  active: 'Active',
  fields: {
    name: 'Full name',
    designation: 'Designation',
    phone: 'Phone number',
  },
  passwordTitle: 'Change password',
  passwordSubtitle:
    'Enter your current password, then choose a new one for your account.',
  currentPassword: 'Current password',
  currentPasswordPlaceholder: 'Enter your current password',
  currentPasswordWrong: 'Your current password is not right.',
  logoutTitle: 'Log out?',
  logoutMessage: 'You’ll need to sign in again to use N1.',
} as const;

export const EMPLOYEE_PROFILE_STRINGS = {
  title: 'My profile',
  logout: 'Log out',
  logoutTitle: 'Log out?',
  logoutMessage: 'You’ll need to sign in again to use N1.',
  employeeId: 'Employee ID',
  department: 'Department',
  shift: 'Shift',
  joined: 'Joined',
  phone: 'Phone',
  email: 'Email',
  work: 'Work details',
  contact: 'Contact',
} as const;

export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  supervisor: ROLE_LABELS.supervisor,
  operator: ROLE_LABELS.operator,
  qc: ROLE_LABELS.qc,
};
