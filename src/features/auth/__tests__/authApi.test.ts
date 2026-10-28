import {
  getAuthTokens,
  graphqlRequest,
  setAuthTokens,
} from '../../../services/api';
import type { CreateOrganizationValues } from '../types';

// jest.setup.js swaps this module for the in-memory one; test the real one.
const { authApi } =
  jest.requireActual<typeof import('../api/authApi')>('../api/authApi');

jest.mock('../../../services/api', () => ({
  ...jest.requireActual('../../../services/api'),
  graphqlRequest: jest.fn(),
}));
const request = graphqlRequest as jest.MockedFunction<typeof graphqlRequest>;

const values: CreateOrganizationValues = {
  yourName: 'Test Owner',
  name: 'Test Machine Works',
  code: 'TESTMA-4821',
  industry: 'manufacturing',
  email: 'owner@example.test',
  phone: '98765 43210',
  gstNumber: '27QWERT1234M1ZO',
  password: 'TestPass12345',
  addressLine1: '1 Test Road',
  addressLine2: '',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pinCode: '600001',
};

const payload = {
  createOrganization: {
    organization: { id: 't1', code: 'org-abc', name: 'Test Machine Works' },
    userId: 'u1',
    accessToken: 'access',
    refreshToken: 'refresh',
  },
};

beforeEach(() => {
  request.mockReset();
  setAuthTokens(null);
});

describe('createOrganization', () => {
  test('sends the public signup call and signs the owner in', async () => {
    request.mockResolvedValue(payload);
    // A stale session would turn signup into a FORBIDDEN signed-in call.
    setAuthTokens({ accessToken: 'old', refreshToken: 'old' });

    const result = await authApi.createOrganization(values);

    const [query, variables, headers] = request.mock.calls[0];
    expect(query).toMatch(/^mutation CreateOrganization\b/);
    expect(headers).toEqual({ 'X-N1-Public-Operation': 'createOrganization' });
    // Code and industry are the server's, so they are not sent.
    expect(variables).toEqual({
      input: {
        yourName: 'Test Owner',
        name: 'Test Machine Works',
        businessEmail: 'owner@example.test',
        phone: '+919876543210',
        gstin: '27QWERT1234M1ZO',
        password: 'TestPass12345',
        address: {
          line1: '1 Test Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
        },
      },
    });
    expect(getAuthTokens()).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    expect(result).toEqual({
      role: 'admin',
      organization: payload.createOrganization.organization,
    });
  });

  test('leaves out a blank GST number', async () => {
    request.mockResolvedValue(payload);
    await authApi.createOrganization({ ...values, gstNumber: '' });
    const { input } = request.mock.calls[0][1] as { input: any };
    expect(input).not.toHaveProperty('gstin');
  });

  test('sends address line 2 when given', async () => {
    request.mockResolvedValue(payload);
    await authApi.createOrganization({ ...values, addressLine2: 'Guindy' });
    const { input } = request.mock.calls[0][1] as { input: any };
    expect(input.address.line2).toBe('Guindy');
  });

  test('a refusal keeps the app signed out', async () => {
    request.mockRejectedValue(
      new Error('This business email is already registered.'),
    );
    await expect(authApi.createOrganization(values)).rejects.toThrow(
      'already registered',
    );
    expect(getAuthTokens()).toBeNull();
  });
});
