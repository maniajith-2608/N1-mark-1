import { ApiError } from '../../../services/api';
import { respond } from '../../../services/mock/mockServer';
import { MOCK_USERS, USER_ROLES } from '../constants';
import type { CreateOrganizationValues } from '../types';
import { findMockUser } from '../utils';

/** The emailed reset code the mock accepts; any other is wrong. */
export const MOCK_RESET_CODE = '123456';

const codeInvalid = () =>
  new ApiError(
    'That code is not right or has expired. Ask for a new one.',
    400,
    undefined,
    { code: 'RESET_CODE_INVALID' },
  );

/** Stands in for authApi under Jest (jest.setup.js), signing in MOCK_USERS. */
export const authApi = {
  login: async (identifier: string, password: string) => {
    const user = findMockUser(identifier, password);
    if (!user) {
      await respond(null);
      throw new ApiError('Sign in again.', 401, undefined, {
        code: 'UNAUTHENTICATED',
      });
    }
    return respond({ role: user.role });
  },
  /** Refuses the email of a MOCK_USERS account, like the backend does. */
  createOrganization: async (values: CreateOrganizationValues) => {
    await respond(null);
    const email = values.email.toLowerCase();
    if (MOCK_USERS.some(u => u.email.toLowerCase() === email)) {
      throw new ApiError(
        'This business email is already registered.',
        409,
        undefined,
        { code: 'EMAIL_ALREADY_REGISTERED' },
      );
    }
    return {
      role: USER_ROLES.ADMIN,
      organization: { id: 'org-mock', code: 'org-mock', name: values.name },
    };
  },
  forgotPassword: (_email: string) => respond(undefined),
  verifyResetCode: async (_email: string, code: string) => {
    await respond(undefined);
    if (code !== MOCK_RESET_CODE) {
      throw codeInvalid();
    }
  },
  resetPassword: async (_email: string, code: string, _newPassword: string) => {
    await respond(undefined);
    if (code !== MOCK_RESET_CODE) {
      throw codeInvalid();
    }
  },
  logout: () => respond(undefined),
};
