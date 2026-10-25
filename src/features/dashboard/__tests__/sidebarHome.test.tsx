import {
  byLabel,
  byTestId,
  press,
  renderAdmin,
} from '../../../shared/testing/testUtils';

// Until jest.setup.js maps it: the dashboard reads the in-memory version.
jest.mock('../api/dashboardApi', () =>
  jest.requireActual('../api/mockDashboardApi'),
);

let mockWidth = 1280;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 900, scale: 1, fontScale: 1 }),
}));

beforeEach(() => {
  mockWidth = 1280;
});

describe('a sidebar item always opens its list', () => {
  test('pressing the open item on a details screen returns to its list', async () => {
    const h = await renderAdmin('Overview');
    await press(byTestId(h.root, 'priority-job-1042'));
    expect(h.currentRoute()).toBe('JobCardDetails');
    await press(byLabel(h.root, 'Job Cards'));
    expect(h.currentRoute()).toBe('JobCards');
  });

  test('switching away and back opens the list', async () => {
    const h = await renderAdmin('Orders');
    await h.navigate('OrderDetails', { orderId: '1042' });
    await press(byLabel(h.root, 'Customers'));
    await press(byLabel(h.root, 'Orders'));
    expect(h.currentRoute()).toBe('Orders');
  });

  test.each([
    ['Employees', 'Users', 'UserDetails', { userId: 'USR-6' }],
    ['Customers', 'Customers', 'CustomerDetails', { customerId: 'CUS-1' }],
    ['Orders', 'Orders', 'OrderDetails', { orderId: '1042' }],
    ['Job Cards', 'JobCards', 'JobCardDetails', { jobCardId: '1042' }],
    ['Machines', 'Machines', 'MachineDetails', { machineId: 'MCH-1' }],
    ['Billing', 'Billing', 'InvoiceDetails', { invoiceId: 'INV-2026-0125' }],
  ])(
    '%s: pressing it on its own details screen opens the list',
    async (label, list, details, params) => {
      const h = await renderAdmin(list);
      await h.navigate(details, params);
      expect(h.currentRoute()).toBe(details);
      await press(byLabel(h.root, label));
      expect(h.currentRoute()).toBe(list);
    },
  );
});
