import {
  allText,
  byLabel,
  byTestId,
  byText,
  hasTestId,
  press,
  renderAdmin,
  typeInto,
} from '../../../shared/testing/testUtils';
import { customersApi } from '../api/mockCustomersApi';
import { validateCustomer } from '../components/CustomerFormModal';
import { formatAddress } from '../utils';

// Until jest.setup.js maps it: the dashboard reads the in-memory version.
jest.mock('../../dashboard/api/dashboardApi', () =>
  jest.requireActual('../../dashboard/api/mockDashboardApi'),
);

let mockWidth = 1280;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 900, scale: 1, fontScale: 1 }),
}));

beforeEach(() => {
  mockWidth = 1280;
});
afterEach(() => jest.restoreAllMocks());

test('desktop list shows projects, money and address', async () => {
  const { root } = await renderAdmin('Customers');
  const text = allText(root);
  // The title now lives in the table's toolbar, next to search and Add.
  expect(allText(byTestId(root, 'customers-table'))).toContain('Customers');
  expect(text).toContain('12 active');
  expect(text).toContain('27 completed');
  expect(text).toContain('₹18,42,000');
  expect(text).toContain('12 Industrial Estate Road, Chennai, Tamil Nadu');
  expect(text).toContain('Not added yet');
  expect(text).toContain('Showing 10 of 12 customers');
});

test('search filters by name or city', async () => {
  const { root } = await renderAdmin('Customers');
  await typeInto(byLabel(root, 'Search customers'), 'bengaluru');
  expect(allText(root)).toContain('Nova Fabrication');
  expect(allText(root)).not.toContain('Acme Metalworks');
});

test('adds a customer with validation', async () => {
  const { root, store } = await renderAdmin('Customers');
  await press(byTestId(root, 'add-customer'));
  await press(byTestId(root, 'customer-form-submit'));
  // Name, contact, mobile and the billing address (street, city, PIN code).
  expect(allText(root).split('This field is required').length - 1).toBe(6);
  await typeInto(byTestId(root, 'customer-form-name'), 'Kaveri Tools');
  await typeInto(byTestId(root, 'customer-form-contact'), 'Lakshmi Raman');
  await typeInto(byTestId(root, 'customer-form-mobile'), '+91 98400 12345');
  await typeInto(byTestId(root, 'customer-form-address'), '8 Mill Road');
  await typeInto(byTestId(root, 'customer-form-city'), 'Erode');
  await typeInto(byTestId(root, 'customer-form-pin'), '638001');
  await typeInto(byTestId(root, 'customer-form-gst'), 'bad');
  await press(byTestId(root, 'customer-form-submit'));
  expect(allText(root)).toContain('GST numbers are 15 letters and digits');
  await typeInto(byTestId(root, 'customer-form-gst'), '33abcde1234f1z5');
  await press(byTestId(root, 'customer-form-submit'));
  const created = Object.values(store.getState().customers.entities).find(
    c => c.name === 'Kaveri Tools',
  );
  expect(created).toMatchObject({
    gstNumber: '33ABCDE1234F1Z5',
    state: 'Tamil Nadu',
    currentProjects: 0,
  });
});

test('edits and deletes from the list', async () => {
  const { root, store } = await renderAdmin('Customers');
  await press(byLabel(root, 'Edit Acme Metalworks'));
  expect(allText(root)).toContain("Update Acme Metalworks's account details.");
  await typeInto(byTestId(root, 'customer-form-contact'), 'R. Kumar');
  await press(byTestId(root, 'customer-form-submit'));
  expect(store.getState().customers.entities['CUS-1'].contactPerson).toBe(
    'R. Kumar',
  );

  await press(byLabel(root, 'Delete Silverline Industries'));
  expect(allText(root)).toContain(
    'and their order history from ABC Engineering Pvt Ltd',
  );
  await press(byText(root, 'Delete customer'));
  expect(store.getState().customers.entities['CUS-4']).toBeUndefined();
});

test('details screen: identity, section menu, account and delete', async () => {
  const h = await renderAdmin('Customers');
  await h.navigate('CustomerDetails', { customerId: 'CUS-1' });
  const screen = byTestId(h.root, 'customer-details-screen');
  const text = allText(screen);
  expect(text).toContain('Business customer');
  expect(text).toContain('Customer since Jan 12, 2025');
  expect(text).toContain('Rajesh Kumar · Contact person');
  // No Recent activity, quick actions or Edit dialog any more.
  expect(text).not.toContain('Recent activity');
  expect(hasTestId(screen, 'edit-customer')).toBe(false);
  expect(text).not.toContain('Message');

  // Customer info is the first tab: locked fields.
  const field = (id: string) => byTestId(screen, id);
  expect(field('customer-info-gstNumber').props.value).toBe('33AAAAA0000A1Z5');
  expect(field('customer-info-name').props.editable).toBe(false);
  expect(field('customer-info-alternateMobile').props.value).toBe(
    '+91 98400 11037',
  );
  await press(byTestId(screen, 'customer-tab-address'));
  expect(field('customer-address-city').props.value).toBe('Chennai');
  expect(field('customer-address-pinCode').props.value).toBe('600032');
  expect(allText(field('customer-address-country'))).toBe('India');
  await press(byTestId(screen, 'customer-tab-stats'));
  expect(field('customer-stats-current').props.value).toBe('12 active');
  expect(field('customer-stats-revenue').props.value).toBe('₹18,42,000');
  await press(byTestId(screen, 'customer-tab-notes'));
  expect(field('customer-notes-notes').props.value).toBe(
    'Long-standing bracket supplier account.',
  );

  await press(byTestId(screen, 'delete-customer'));
  await press(
    byText(byTestId(screen, 'delete-customer-dialog'), 'Delete customer'),
  );
  expect(h.currentRoute()).toBe('Customers');
});

test('details: Edit unlocks a tab in place, validates and saves only it', async () => {
  const spy = jest.spyOn(customersApi, 'update');
  const h = await renderAdmin('Customers');
  await h.navigate('CustomerDetails', { customerId: 'CUS-1' });
  const screen = byTestId(h.root, 'customer-details-screen');
  const field = (id: string) => byTestId(screen, id);

  await press(byTestId(screen, 'edit-customer-info'));
  expect(hasTestId(screen, 'customer-form')).toBe(false);
  expect(field('customer-info-name').props.editable).toBe(true);
  await typeInto(field('customer-info-mobile'), '12');
  await press(byTestId(screen, 'customer-info-submit'));
  expect(allText(screen)).toContain('Enter a valid phone number');
  expect(spy).not.toHaveBeenCalled();
  await typeInto(field('customer-info-mobile'), '+91 90000 11111');
  await press(byTestId(screen, 'customer-info-submit'));
  expect(spy).toHaveBeenCalledWith('CUS-1', {
    type: 'business',
    name: 'Acme Metalworks',
    contactPerson: 'Rajesh Kumar',
    mobile: '+91 90000 11111',
    alternateMobile: '+91 98400 11037',
    email: 'accounts@acmemetalworks.com',
    gstNumber: '33AAAAA0000A1Z5',
  });
  expect(field('customer-info-mobile').props.editable).toBe(false);

  // Switching tabs drops unsaved edits.
  await press(byTestId(screen, 'customer-tab-address'));
  await press(byTestId(screen, 'edit-customer-address'));
  await typeInto(field('customer-address-city'), 'Madurai');
  await press(byTestId(screen, 'customer-tab-orders'));
  await press(byTestId(screen, 'customer-tab-address'));
  expect(field('customer-address-city').props.value).toBe('Chennai');
  expect(field('customer-address-city').props.editable).toBe(false);
});

test('details: back always returns to the list', async () => {
  const h = await renderAdmin('Customers');
  await h.navigate('CustomerDetails', { customerId: 'CUS-1' });
  await press(byTestId(h.root, 'customer-details-back'));
  expect(hasTestId(h.root, 'customer-details-screen')).toBe(false);
  expect(h.currentRoute()).toBe('Customers');
});

test('details: Back returns where the customer was opened from', async () => {
  const back = (h: Awaited<ReturnType<typeof renderAdmin>>) =>
    byTestId(h.root, 'customer-details-back');

  // From the Dashboard: back to the Dashboard.
  let h = await renderAdmin('Customers');
  await h.navigate('CustomerDetails', {
    customerId: 'CUS-1',
    from: 'dashboard',
  });
  expect(allText(back(h))).toBe('Back to dashboard');
  await press(back(h));
  expect(h.currentRoute()).toBe('Dashboard');

  // From an order: back to Orders.
  h = await renderAdmin('Customers');
  await h.navigate('CustomerDetails', { customerId: 'CUS-1', from: 'orders' });
  expect(allText(back(h))).toBe('Back to orders');
  await press(back(h));
  expect(h.currentRoute()).toBe('Orders');

  // From the list (or a link): back to the list.
  h = await renderAdmin('Customers');
  await h.navigate('CustomerDetails', { customerId: 'CUS-1' });
  expect(allText(back(h))).toBe('Back to customers');
  await press(back(h));
  expect(h.currentRoute()).toBe('Customers');
});

test('unknown customer shows not found', async () => {
  const h = await renderAdmin('Customers');
  await h.navigate('CustomerDetails', { customerId: 'CUS-404' });
  expect(allText(h.root)).toContain('This customer no longer exists.');
});

test('phone: cards with the table figures, actions and full-screen details', async () => {
  mockWidth = 390;
  const h = await renderAdmin('Customers');
  // No overview stats on phones; each card carries the table's columns.
  expect(hasTestId(h.root, 'customer-overview')).toBe(false);
  const card = allText(byTestId(h.root, 'customer-row-CUS-1'));
  for (const value of [
    '12 active',
    '27 completed',
    '₹18,42,000',
    '₹2,12,000',
  ]) {
    expect(card).toContain(value);
  }
  expect(byLabel(h.root, 'Edit Acme Metalworks')).toBeTruthy();
  await press(byTestId(h.root, 'customer-row-CUS-2'));
  // Phones open the details on its first swipeable tab.
  expect(h.currentRoute()).toBe('info');
  expect(hasTestId(h.root, 'customer-tab-orders')).toBe(true);
  expect(hasTestId(h.root, 'delete-customer')).toBe(true);
  const text = allText(byTestId(h.root, 'customer-details-screen'));
  expect(text).toContain('Contact person');
  expect(text).toContain('Meera Nair');
});

test('validator and address helpers', () => {
  const base = {
    type: 'business' as const,
    name: 'A',
    contactPerson: 'B',
    mobile: '9876543210',
    alternateMobile: '',
    email: 'bad',
    gstNumber: '',
    address: '1 Beach Road',
    city: 'Kochi',
    state: 'Kerala',
    pinCode: '682001',
    country: 'India',
    notes: '',
  };
  expect(validateCustomer(base)).toEqual({
    email: 'Enter a valid email address',
  });
  // The API needs a billing address to create a customer.
  expect(
    validateCustomer({
      ...base,
      email: '',
      address: '',
      city: '',
      pinCode: '',
    }),
  ).toEqual({
    address: 'This field is required',
    city: 'This field is required',
    pinCode: 'This field is required',
  });
  expect(validateCustomer({ ...base, email: '', mobile: '12' })).toEqual({
    mobile: 'Enter a valid phone number',
  });
  expect(
    validateCustomer({
      ...base,
      email: '',
      alternateMobile: '12',
      pinCode: '6000',
    }),
  ).toEqual({
    alternateMobile: 'Enter a valid phone number',
    pinCode: 'Enter a 6-digit PIN code',
  });
  expect(formatAddress({ address: '', city: 'Kochi', state: 'Kerala' })).toBe(
    'Kochi, Kerala',
  );
});

test('details screen lists the customer’s orders and shared quotes', async () => {
  const h = await renderAdmin('Customers');
  await h.navigate('CustomerDetails', { customerId: 'CUS-1' });

  await press(byTestId(h.root, 'customer-tab-orders'));
  const orders = allText(byTestId(h.root, 'customer-orders'));
  expect(orders).toContain('WO #1042');
  expect(orders).toContain('Bracket — Job A');
  // Other customers' orders stay out.
  expect(orders).not.toContain('WO #1041');

  // Quotes are the second tab.
  await press(byTestId(h.root, 'customer-tab-quotes'));
  const quotes = allText(byTestId(h.root, 'customer-quotes'));
  expect(quotes).toContain('QT-2026-0040');
  expect(quotes).toContain('Sent');
  expect(quotes).not.toContain('QT-2026-0042');

  await press(byText(byTestId(h.root, 'customer-quotes'), 'QT-2026-0040'));
  expect(h.currentRoute()).toBe('QuoteDetails');
  // Back on the quote returns to this customer.
  const back = byTestId(h.root, 'quote-back');
  expect(allText(back)).toBe('Back to customer');
  await press(back);
  expect(h.currentRoute()).toBe('CustomerDetails');
});

test('wide screens: the page stays put; only the customer rows scroll', async () => {
  const { root } = await renderAdmin('Customers');
  const table = byTestId(root, 'customers-table');
  const scroll = byTestId(table, 'customers-table-scroll');
  expect(allText(scroll)).toContain('Acme Metalworks');
  expect(allText(scroll)).not.toContain('Showing 10 of 12 customers');
  expect(allText(table)).toContain('Showing 10 of 12 customers');
  // Add sits inside the table's toolbar.
  expect(byTestId(table, 'add-customer')).toBeTruthy();
});
