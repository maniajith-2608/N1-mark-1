import type { NavigatorScreenParams } from '@react-navigation/native';

// Screens in the forgot password flow (nested inside the auth stack).
export type ForgotPasswordStackParamList = {
  ForgotPassword: undefined;
  VerifyCode: undefined;
  ResetPassword: undefined;
};

// Screens in the auth stack.
export type AuthStackParamList = {
  Login: undefined;
  CreateOrganization: undefined;
  ForgotPasswordFlow: NavigatorScreenParams<ForgotPasswordStackParamList>;
};

/** What Create organization sends; trimmed, GSTIN upper-cased. */
export type CreateOrganizationValues = {
  /** The owner's full name. */
  yourName: string;
  name: string;
  /** Preview only: the server generates the stored code. */
  code: string;
  industry: string;
  email: string;
  phone: string;
  /** Blank when the business isn't GST-registered. */
  gstNumber: string;
  password: string;
  addressLine1: string;
  /** Blank when not given. */
  addressLine2: string;
  city: string;
  /** One of STATE_OPTIONS, e.g. "Tamil Nadu". */
  state: string;
  pinCode: string;
};
