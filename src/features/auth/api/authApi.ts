import {
  apiClient,
  getAuthTokens,
  graphqlRequest,
  setAuthTokens,
} from '../../../services/api';
import { isEmail, toE164Phone } from '../../../shared/utils';
import {
  BACKEND_ROLE_TO_APP,
  type BackendRole,
  type UserRole,
} from '../constants';
import type { CreateOrganizationValues } from '../types';

type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  /** Seconds the access token lasts (15 minutes). */
  expiresIn: number;
  refreshToken: string;
  /** role is lowercase here, e.g. "owner". */
  user: { id: string; tenantId: string; role: string };
};

// The one GraphQL operation callers may send signed out. The backend admits
// it only with this header, no Authorization header, and exactly one
// unaliased createOrganization field in the document.
const CREATE_ORGANIZATION_MUTATION = `mutation CreateOrganization($input: CreateOrganizationInput!) {
  createOrganization(input: $input) {
    organization { id code name }
    userId
    accessToken
    refreshToken
  }
}`;

type CreateOrganizationResponse = {
  createOrganization: {
    organization: { id: string; code: string; name: string };
    userId: string;
    accessToken: string;
    refreshToken: string;
  };
};

export const authApi = {
  /**
   * POST /auth/login. The identifier is an email or a phone number; phones are
   * sent as +91…, the only form the backend matches. Wrong credentials reject
   * with an ApiError of status 401.
   */
  login: async (identifier: string, password: string) => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', {
      identifier: isEmail(identifier)
        ? identifier.trim()
        : toE164Phone(identifier),
      password,
      client: 'app',
    });
    setAuthTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    const role: UserRole =
      BACKEND_ROLE_TO_APP[data.user.role.toUpperCase() as BackendRole];
    return { role };
  },

  /**
   * createOrganization on POST /graphql: makes the shop and its first owner,
   * then signs that owner in with the returned tokens. The server generates
   * the organization code and fixes the industry to Manufacturing, so neither
   * is sent. Duplicates reject with EMAIL_ALREADY_REGISTERED or
   * PHONE_ALREADY_REGISTERED; five attempts per hour per IP, then RATE_LIMITED.
   */
  createOrganization: async (values: CreateOrganizationValues) => {
    // A leftover session would make this a signed-in call, which is FORBIDDEN.
    setAuthTokens(null);
    const { createOrganization } =
      await graphqlRequest<CreateOrganizationResponse>(
        CREATE_ORGANIZATION_MUTATION,
        {
          input: {
            yourName: values.yourName,
            name: values.name,
            businessEmail: values.email,
            phone: toE164Phone(values.phone),
            // Left out when the business isn't GST-registered.
            ...(values.gstNumber ? { gstin: values.gstNumber } : {}),
            password: values.password,
            address: {
              line1: values.addressLine1,
              ...(values.addressLine2 ? { line2: values.addressLine2 } : {}),
              city: values.city,
              state: values.state,
              pincode: values.pinCode,
            },
          },
        },
        { 'X-N1-Public-Operation': 'createOrganization' },
      );
    setAuthTokens({
      accessToken: createOrganization.accessToken,
      refreshToken: createOrganization.refreshToken,
    });
    // The first member of a new shop is always its owner.
    const role: UserRole = BACKEND_ROLE_TO_APP.OWNER;
    return { role, organization: createOrganization.organization };
  },

  // Password reset (guide section 6, "Forgot Password"): public routes, no
  // tokens. Each answers 202/204 with no body; a wrong or expired code is a
  // 400 RESET_CODE_INVALID whose message says to ask for a new one.

  /**
   * POST /auth/forgot emails a 6-digit code (it works for 10 minutes). Also
   * Resend code. The answer is the same whether or not the email is known.
   */
  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot', { email: email.trim() });
  },

  /** POST /auth/verify-code checks the code without using it up. */
  verifyResetCode: async (email: string, code: string): Promise<void> => {
    await apiClient.post('/auth/verify-code', { email: email.trim(), code });
  },

  /** POST /auth/reset sets the new password; the code then stops working. */
  resetPassword: async (
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> => {
    await apiClient.post('/auth/reset', {
      email: email.trim(),
      code,
      newPassword,
    });
  },

  /** POST /auth/logout ends the session on the server too. */
  logout: async () => {
    const tokens = getAuthTokens();
    setAuthTokens(null);
    if (tokens) {
      await apiClient.post('/auth/logout', {
        refreshToken: tokens.refreshToken,
        client: 'app',
      });
    }
  },
};
