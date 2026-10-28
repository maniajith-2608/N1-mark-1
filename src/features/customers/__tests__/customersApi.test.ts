import { graphqlRequest } from '../../../services/api';

// jest.setup.js swaps this module for the in-memory one; test the real one.
const { customersApi } = jest.requireActual<
  typeof import('../api/customersApi')
>('../api/customersApi');

jest.mock('../../../services/api', () => ({
  ...jest.requireActual('../../../services/api'),
  graphqlRequest: jest.fn(),
}));
const request = graphqlRequest as jest.MockedFunction<typeof graphqlRequest>;

const node = (address: object | null) => ({
  id: 'c1',
  name: 'Kaveri Tools',
  type: 'COMPANY',
  contactPerson: 'Ravi',
  mobile: '+919000000001',
  alternateMobile: '',
  email: null,
  gstin: null,
  notes: '',
  address,
  currentProjects: 0,
  previousProjects: 0,
  totalRevenue: 0,
  outstandingBalance: 0,
  customerSince: '2026-10-28',
  activity: { edges: [] },
});

beforeEach(() => request.mockReset());

test('a customer saved without an address loads with blank address fields', async () => {
  request.mockResolvedValue({ customer: node(null) });
  await expect(customersApi.get('c1')).resolves.toMatchObject({
    address: '',
    city: '',
    state: '',
    pinCode: '',
    country: '',
  });
});

test('a partial address keeps what was saved', async () => {
  request.mockResolvedValue({
    customer: node({
      address: null,
      city: 'Chennai',
      state: null,
      pinCode: null,
      country: 'India',
    }),
  });
  await expect(customersApi.get('c1')).resolves.toMatchObject({
    address: '',
    city: 'Chennai',
    state: '',
    pinCode: '',
    country: 'India',
  });
});
