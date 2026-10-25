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
