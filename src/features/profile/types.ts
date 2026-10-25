import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  ActivityEntry,
  Attachment,
  ISODateString,
} from '../../shared/types';
import type { UserRole } from '../auth/constants';

/** A configured GST rate (%). CGST / SGST / IGST are derived from it. */
export type TaxRate = {
  id: string;
  rate: number;
  active: boolean;
};

export type Organization = {
  id: string;
  /** Generated at sign-up; identifies the organization, never edited. */
  code: string;
  createdAt: ISODateString;
  /** Used where space is tight, e.g. the phone top bar. */
  shortName: string;

  // General
  name: string;
  logo: Attachment | null;
  phone: string;
  email: string;
  website: string;

  // Business details
  /** A BUSINESS_TYPE_OPTIONS value, e.g. "private-limited". */
  businessType: string;
  /** An INDUSTRY_OPTIONS value, e.g. "metal-manufacturing". */
  industry: string;
  /** e.g. CIN or Udyam registration number. */
  registrationDetails: string;

  // Address
  address: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;

  // GST & tax
  gstRegistered: boolean;
  /** GSTIN, upper-case; blank when not registered. */
  gstNumber: string;
  /** State the GSTIN is registered in. */
  gstState: string;
  /** GST rates this organization bills at; inactive ones are kept for history. */
  taxRates: TaxRate[];
  /** Picked automatically on new quotes and invoices; an active rate. */
  defaultTaxRate: number | null;

  // Invoice settings
  invoicePrefix: string;
  invoiceStartNumber: number;
  invoiceFooter: string;

  // Document settings
  invoiceLogo: Attachment | null;
  termsAndConditions: string;
  signature: Attachment | null;
};

/** Everything Organization details can change (not the code or dates). */
export type OrganizationUpdate = Partial<
  Omit<Organization, 'id' | 'code' | 'createdAt' | 'shortName'>
>;

/** The signed-in person. Will come from the auth session once login lands. */
export type MyProfile = {
  id: string;
  name: string;
  email: string;
  designation: string;
  phone: string;
  /** Profile picture; initials are shown without one. */
  photo: Attachment | null;
  /** False for someone who hasn't set a password yet (e.g. invited). */
  hasPassword: boolean;
  // Address
  address: string;
  city: string;
  /** One of STATE_OPTIONS, e.g. "Tamil Nadu". */
  state: string;
  pinCode: string;
  country: string;
  role: UserRole;
  status: 'active';
  memberSince: ISODateString;
  activity: ActivityEntry[];
};

export type ProfileInput = Partial<
  Pick<
    MyProfile,
    | 'name'
    | 'designation'
    | 'email'
    | 'phone'
    | 'photo'
    | 'address'
    | 'city'
    | 'state'
    | 'pinCode'
    | 'country'
  >
>;

/** changeMyPassword: the current password proves it's the person. */
export type PasswordChangeInput = {
  currentPassword: string;
  newPassword: string;
};

/**
 * Permission codes from me.permissions, e.g. "customers.write": show or hide
 * actions by these rather than by role name (guide section 5, rule 8).
 */
export type PermissionCode = string;

export type Session = {
  profile: MyProfile;
  organization: Organization;
  permissions: PermissionCode[];
};

// Stack nested inside the admin drawer's hidden "Profile" item.
/** Phones: My profile's menu opens each of these as its own screen. */
export type ProfileSection =
  | 'organization'
  | 'account'
  | 'security'
  | 'address';

export type ProfileStackParamList = {
  MyProfile: undefined;
  ProfileSection: { section: ProfileSection };
};

export type ProfileScreenProps<R extends keyof ProfileStackParamList> =
  NativeStackScreenProps<ProfileStackParamList, R>;

/** Non-admin roles. Their tabs differ but they share the same profile screens. */
export type EmployeeRole = Exclude<UserRole, 'admin'>;

/** A non-admin signed-in person (Profile tab). */
export type EmployeeProfile = {
  id: string;
  name: string;
  role: EmployeeRole;
  employeeId: string;
  department: string;
  shift: string;
  joinedOn: ISODateString;
  phone: string;
  email: string;
};

/** What the employee Profile loads from me. */
export type EmployeeSession = {
  profile: EmployeeProfile;
  permissions: PermissionCode[];
};

export type EmployeeProfileInput = Pick<
  EmployeeProfile,
  'name' | 'department' | 'shift' | 'phone' | 'email'
>;

// Routes the employee profile screens navigate to. The role navigator that
// hosts them must register these names.
export type EmployeeProfileParamList = {
  Profile: undefined;
};
