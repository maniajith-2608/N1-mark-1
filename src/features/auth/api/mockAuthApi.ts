import { ApiError } from '../../../services/api';
import { respond } from '../../../services/mock/mockServer';
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
