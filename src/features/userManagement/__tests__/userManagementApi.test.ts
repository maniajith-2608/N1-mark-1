import { graphqlRequest } from '../../../services/api';

// jest.setup.js swaps this module for the in-memory one; test the real one.
const { userManagementApi } = jest.requireActual<
  typeof import('../api/userManagementApi')
>('../api/userManagementApi');

jest.mock('../../../services/api', () => ({
  ...jest.requireActual('../../../services/api'),
  graphqlRequest: jest.fn(),
}));
const request = graphqlRequest as jest.MockedFunction<typeof graphqlRequest>;

const node = (overrides: object = {}) => ({
  id: 'u1',
  name: 'Demo Owner',
  email: null,
  phone: '+919000000001',
  designation: 'Owner',
  department: '',
  address: '',
  city: '',
  state: '',
  pinCode: '',
  country: '',
  role: 'OWNER',
  status: 'ACTIVE',
  joinedAt: '2026-10-19',
  permissions: { viewOrders: true, manageUsers: true, exportReports: true },
  documents: [{ id: 'f1', name: 'ID.pdf', kind: null, sizeBytes: 10 }],
  ...overrides,
});

const variablesOf = (call: number) =>
  request.mock.calls[call][1] as Record<string, any>;

beforeEach(() => request.mockReset());

test('list pages through every user and maps them to app shapes', async () => {
  request
    .mockResolvedValueOnce({
      users: {
        edges: [{ node: node() }],
        pageInfo: { hasNextPage: true, endCursor: 'c1' },
      },
    })
    .mockResolvedValueOnce({
      users: {
        edges: [{ node: node({ id: 'u2', role: 'QC', status: 'INVITED' }) }],
        pageInfo: { hasNextPage: false, endCursor: 'c2' },
      },
    });

  const users = await userManagementApi.list();

  expect(variablesOf(1)).toEqual({ after: 'c1' });
  expect(request.mock.calls[0][0]).toContain('users(first: 50,');
  expect(users.map(u => [u.role, u.status])).toEqual([
    ['admin', 'active'],
    ['qc', 'invited'],
  ]);
  expect(users[0]).toMatchObject({
    email: '',
    attachments: [{ id: 'f1', name: 'ID.pdf', kind: undefined, sizeBytes: 10 }],
    activity: [],
  });
});

test('create sends the backend input: uppercase enums, +91 phone, null blanks', async () => {
  request.mockResolvedValueOnce({
    createUser: node({ id: 'u3', role: 'OPERATOR' }),
  });

  await userManagementApi.create({
    name: ' Ravi ',
    designation: 'Machinist',
    email: '',
    phone: '98765 43210',
    role: 'operator',
    status: 'active',
    password: 'welcome1234',
  });

  expect(request.mock.calls[0][0]).toContain('createUser(input: $input)');
  expect(variablesOf(0).input).toEqual({
    name: 'Ravi',
    designation: 'Machinist',
    email: null,
    phone: '+919876543210',
    role: 'OPERATOR',
    status: 'ACTIVE',
    initialPassword: 'welcome1234',
  });
});

test('editing an owner shown as Admin never sends a role change', async () => {
  // Loading the list records each person's backend role (u1 is the OWNER).
  request.mockResolvedValueOnce({
    users: {
      edges: [{ node: node() }],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  });
  await userManagementApi.list();
  request.mockReset();
  request.mockResolvedValue({ updateUser: node() });

  await userManagementApi.update('u1', { name: 'Owner', role: 'admin' });
  expect(variablesOf(0).input).toEqual({ name: 'Owner' });

  await userManagementApi.update('u1', { role: 'supervisor' });
  expect(variablesOf(1).input).toEqual({ role: 'SUPERVISOR' });
});

test('a new password goes through resetUserPassword, not updateUser', async () => {
  request
    .mockResolvedValueOnce({ resetUserPassword: true })
    .mockResolvedValueOnce({ user: node() });

  const user = await userManagementApi.update('u1', {
    password: 'welcome1234',
  });

  expect(request.mock.calls[0][0]).toContain('resetUserPassword');
  expect(variablesOf(0)).toEqual({ id: 'u1', newPassword: 'welcome1234' });
  expect(request.mock.calls[1][0]).toContain('user(id: $id)');
  expect(user.id).toBe('u1');
});

test('delete deactivates the person', async () => {
  request.mockResolvedValueOnce({ setUserStatus: { id: 'u1' } });

  await expect(userManagementApi.remove('u1')).resolves.toBe('u1');
  expect(request.mock.calls[0][0]).toContain('status: INACTIVE');
});
