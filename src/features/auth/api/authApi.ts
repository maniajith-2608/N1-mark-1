import { apiClient, getAuthTokens, setAuthTokens } from '../../../services/api';
import { isEmail, toE164Phone } from '../../../shared/utils';
import {
  BACKEND_ROLE_TO_APP,
  type BackendRole,
  type UserRole,
} from '../constants';

type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  /** Seconds the access token lasts (15 minutes). */
  expiresIn: number;
  refreshToken: string;
  /** role is lowercase here, e.g. "owner". */
  user: { id: string; tenantId: string; role: string };
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
