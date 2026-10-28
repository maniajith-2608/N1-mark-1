import { PASSWORD_MIN_LENGTH } from '../../config/constants';
import { ROLE_LABELS } from '../auth/constants';
import { workOrderLabel } from '../orders/constants';
import type { N1DropDownOption } from '../../shared/components';
import { INDIAN_STATES } from '../../shared/constants';
import type { StatusMeta } from '../../shared/types';
import type { UserPermissionKey, UserRole, UserStatus } from './types';

export const USER_STRINGS = {
  title: 'Employees',
  subtitle: (org: string) => `Manage everyone in ${org}.`,
  create: 'Create Employee',
  createTitle: 'Create employee',
  createSubtitle: (org: string) => `Add a new person to ${org}.`,
  createSubmit: 'Create employee',
  editTitle: 'Edit employee',
  editSubtitle: 'Update this person’s details.',
  search: 'Search employees',
  roleFilter: 'Role',
  statusFilter: 'Status',
  noun: 'employees',
  columns: {
    name: 'Name',
    email: 'Email / Phone',
    role: 'Role',
    status: 'Status',
    joined: 'Joined',
  },
  fields: {
    name: 'Full name',
    namePlaceholder: 'e.g. Priya Sharma',
    designation: 'Designation',
    designationPlaceholder: 'e.g. Production Supervisor',
    email: 'Email',
    emailPlaceholder: 'e.g. priya.sharma@abcengineering.com',
    phone: 'Phone number',
    phonePlaceholder: 'e.g. +91 98765 43210',
    password: 'Password',
    passwordCreatePlaceholder: 'Set a password for this employee',
    passwordCreateHelp:
      'As an admin, you’re setting this person’s initial password. They can change it after signing in.',
    passwordEditHelp:
      'As an admin, you can reset this person’s password here. Leave both blank to keep it unchanged.',
    passwordWeak: `Use at least ${PASSWORD_MIN_LENGTH} characters with letters and numbers`,
    role: 'Role',
    status: 'Status',
  },
  details: {
    title: 'Employee details',
    backToUsers: 'Back to employees',
    joined: (date: string) => `Joined ${date}`,
    resetPassword: 'Reset password',
    resetPasswordHelp: (name: string) =>
      `Set a new password for ${name}. Let them know what it is.`,
    email: 'Email',
    phone: 'Phone number',
    designation: 'Designation',
    department: 'Department',
    organization: 'Organization',
    joinedLabel: 'Joined',
    attachments: 'Attachments',
    role: 'Role',
    status: 'Status',
    notFound: 'This employee no longer exists.',
    sections: {
      profile: 'Profile',
      security: 'Security',
      documents: 'Documents',
      address: 'Address details',
      work: 'Work history',
    },
    work: {
      subtitle: (name: string) =>
        `The last 10 job cards ${name} worked a step on.`,
      empty: (name: string) =>
        `No job cards yet. They show here once ${name} runs a step.`,
      title: (jobCard: string, job: string) =>
        [jobCard, job].filter(Boolean).join(' · '),
      workOrder: workOrderLabel,
      routeCard: (id: string) => `RC #${id}`,
      started: (date: string) => `Started ${date}`,
    },
    addressFields: {
      address: 'Address',
      addressPlaceholder: 'Building, street, area',
      city: 'City',
      cityPlaceholder: 'e.g. Chennai',
      state: 'State',
      statePlaceholder: 'Select state',
      pinCode: 'PIN code',
      pinCodePlaceholder: 'e.g. 600098',
      pinCodeInvalid: 'Enter a 6-digit PIN code',
      country: 'Country',
      countryPlaceholder: 'Select country',
    },
    personalInfo: 'Personal information',
    account: 'Account',
    deleteUser: 'Delete employee',
    noDocuments: 'No documents uploaded yet.',
    documentsKind: 'Employee document',
    documentsSample: 'ID proof.pdf',
    upload: {
      add: 'Add',
      a11y: 'Upload documents',
      hint: 'ID proofs, certificates and photos. Images, PDF, Word or Excel.',
      count: (n: number) => (n === 1 ? '1 document' : `${n} documents`),
    },
  },
  delete: {
    title: 'Delete employee?',
    message: (name: string) =>
      [
        'This will deactivate ',
        name,
        ': they can no longer sign in. Their history is kept, and setting their status back to Active restores access.',
      ] as const,
    confirm: 'Delete employee',
  },
  a11y: {
    edit: (name: string) => `Edit ${name}`,
    delete: (name: string) => `Delete ${name}`,
    removeDocument: (name: string) => `Remove ${name}`,
    openJobCard: (id: string) => `Open job card WO #${id}`,
  },
} as const;

export const ROLE_META: Record<UserRole, StatusMeta> = {
  admin: { label: ROLE_LABELS.admin, tone: 'info' },
  supervisor: { label: ROLE_LABELS.supervisor, tone: 'warning' },
  operator: { label: ROLE_LABELS.operator, tone: 'neutral' },
  qc: { label: ROLE_LABELS.qc, tone: 'success' },
};

export const STATUS_META: Record<UserStatus, StatusMeta> = {
  active: { label: 'Active', tone: 'success' },
  inactive: { label: 'Inactive', tone: 'neutral' },
};

export const ROLE_OPTIONS: N1DropDownOption<UserRole>[] = (
  Object.keys(ROLE_META) as UserRole[]
).map(value => ({ value, label: ROLE_META[value].label }));

export const STATUS_OPTIONS: N1DropDownOption<UserStatus>[] = (
  Object.keys(STATUS_META) as UserStatus[]
).map(value => ({ value, label: STATUS_META[value].label }));

export const STATE_OPTIONS: N1DropDownOption<string>[] = INDIAN_STATES.map(
  s => ({ label: s.name, value: s.name }),
);

export const DEFAULT_PERMISSIONS: Record<
  UserRole,
  Record<UserPermissionKey, boolean>
> = {
  admin: { viewOrders: true, manageUsers: true, exportReports: true },
  supervisor: { viewOrders: true, manageUsers: false, exportReports: true },
  operator: { viewOrders: true, manageUsers: false, exportReports: false },
  qc: { viewOrders: true, manageUsers: false, exportReports: false },
};
