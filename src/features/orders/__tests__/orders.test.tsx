import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import { Platform } from 'react-native';
import {
  allText,
  byLabel,
  byTestId,
  byText,
  choose,
  hasTestId,
  press,
  renderAdmin,
  typeInto,
} from '../../../shared/testing/testUtils';
import { MOCK_ORDERS } from '../api/mockData';
import {
  formValuesToOrderInput,
  orderToFormValues,
  firstStepWithErrors,
  hasStepErrors,
  validateOrderForm,
} from '../components/orderForm';
import { MOCK_JOB_CARDS } from '../../jobCards/api/mockData';
import type { JobCard, JobOperation } from '../../jobCards/types';
import { statusFor } from '../../jobCards/utils';
import { selectOrderById } from '../store/selectors';
import type { WorkOrder } from '../types';
import { compareOrders, orderQrValue, orderStatus, orderTitle } from '../utils';
import { normaliseJobCode } from '../../jobCards/utils';

let mockWidth = 1280;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 900, scale: 1, fontScale: 1 }),
}));

const mockPrintHtml = jest.fn((_html: string, _jobName: string) =>
  Promise.resolve(true),
);
jest.mock('../../../services/print/printHtml', () => ({
  printHtml: (html: string, jobName: string) => mockPrintHtml(html, jobName),
}));

beforeEach(() => {
  mockWidth = 1280;
  mockPrintHtml.mockClear();
  mockPrintHtml.mockImplementation(() => Promise.resolve(true));
});
afterEach(() => jest.restoreAllMocks());

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Opens a date field's native picker, turns the wheels and taps Done. */
async function pickDate(
  form: ReactTestInstance,
  testID: string,
  [day, month, year]: [number, string, number],
) {
  await press(byTestId(form, testID));
  const wheels = byTestId(form, `${testID}-wheels`);
  await ReactTestRenderer.act(() =>
    wheels.props.onValueChange({}, new Date(year, MONTHS.indexOf(month), day)),
  );
  await press(byTestId(form, `${testID}-done`));
}

/** Fills Order details' required fields (step 2 must be open). */
async function fillOrderDetails(form: ReactTestInstance) {
  const fields: [string, string][] = [
    ['order-form-po-number', 'PO-9001'],
    ['order-form-quantity', '25'],
    ['order-form-part-name', 'Spacer ring'],
    ['order-form-drawing-number', 'DRW-9001'],
    ['order-form-dc-no', 'DC-9001'],
  ];
  for (const [id, value] of fields) {
    await typeInto(byTestId(form, id), value);
  }
  await pickDate(form, 'order-form-delivery', [20, 'October', 2026]);
  await pickDate(form, 'order-form-dc-date', [15, 'October', 2026]);
}

test('list is sorted by priority then due date', async () => {
  const { root } = await renderAdmin('Orders');
  const text = allText(byTestId(root, 'orders-table'));
  // The first page of 12 (Low priority falls to page 2).
  const order = [
    'WO #1042',
    'WO #1040',
    'WO #1037',
    'WO #1033',
    'WO #1043',
    'WO #1039',
    'WO #1041',
    'WO #125',
    'WO #1036',
    'WO #1034',
  ];
  const positions = order.map(id => text.indexOf(id));
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  // PO and RC numbers in place of material / quantity.
  expect(text).toMatch(
    /Work order \/ Part.*Customer.*PO number.*RC number.*Priority.*Status.*Due date.*Actions/,
  );
  expect(text).not.toContain('Material / Qty');
  expect(text).not.toContain('MS Round Bar · 200 pcs');
  expect(text).toMatch(/WO #1042.*Acme Metalworks.*PO-8842.*RC-2210/);
  // Narrow windows scroll the columns sideways, never squeezing them.
  const hscroll = byTestId(root, 'orders-table-hscroll');
  expect(hscroll.props.horizontal).toBe(true);
  expect(allText(hscroll)).toContain('WO #1042');
  expect(allText(root)).toContain('Showing 10 of 13 orders');
});

test('only orders with a job card show the job card button', async () => {
  const h = await renderAdmin('Orders');
  // Example data: a full route, one still to set up, and two with none.
  expect(hasTestId(h.root, 'job-card-1042')).toBe(true);
  expect(hasTestId(h.root, 'job-card-1036')).toBe(true);
  expect(hasTestId(h.root, 'job-card-1043')).toBe(false);
  expect(hasTestId(h.root, 'job-card-1044')).toBe(false);
  // Edit is there either way.
  expect(hasTestId(h.root, 'edit-order-1043')).toBe(true);
  expect(allText(byTestId(h.root, 'orders-table'))).not.toContain('Job card');
  // A job card with its route opens; one without steps opens with Create flow.
  await press(byLabel(h.root, 'Open job card for WO #1042'));
  expect(h.currentRoute()).toBe('JobCardDetails');
  await h.navigate('Orders');
  await press(byLabel(h.root, 'Create job card for WO #1036'));
  expect(h.currentRoute()).toBe('JobCardDetails');
  expect(hasTestId(h.root, 'flow-editor')).toBe(true);
});

test('search finds an order by its RC number', async () => {
  const { root } = await renderAdmin('Orders');
  await typeInto(byLabel(root, 'Search by WO #, part or customer'), 'RC-2210');
  expect(allText(byTestId(root, 'orders-table'))).toContain('Showing 1 of 1');
});

describe('order status', () => {
  const order = MOCK_ORDERS.find(o => o.id === '1042') as WorkOrder;
  // A two-step job card: steps by status, the first one's QC check if any.
  const card = (
    steps: JobOperation['status'][] = [],
    changes: Partial<JobCard> = {},
  ): JobCard => {
    const operations = steps.map(
      (status, i): JobOperation => ({
        id: `op${i + 1}`,
        name: `Step ${i + 1}`,
        machine: '',
        operator: '',
        status,
        startedAt: null,
        completedAt: null,
      }),
    );
    return {
      ...(MOCK_JOB_CARDS[0] as JobCard),
      materialQc: 'accepted',
      billing: 'not_invoiced',
      qcHistory: [],
      operations,
      status: statusFor(operations),
      ...changes,
    };
  };
  const passed = (operationId: string) => ({
    qcHistory: [
      {
        id: 'q',
        stage: 'QC',
        result: 'passed' as const,
        remark: '',
        at: '2026-09-25',
        operationId,
      },
    ],
  });
  const noMaterial = { ...order, heatNumber: '' };

  test.each([
    ['no job card', 'new', order, undefined, false],
    [
      'job card, raw material not in',
      'new',
      noMaterial,
      card([], { materialQc: 'pending' }),
      false,
    ],
    [
      'job card and raw material in, RM QC to do',
      'yet_to_start',
      order,
      card([], { materialQc: 'pending' }),
      false,
    ],
    ['RM QC passed, no flow yet', 'in_progress', order, card(), false],
    [
      'a step started',
      'in_progress',
      order,
      card(['running', 'pending']),
      false,
    ],
    ['a step paused', 'paused', order, card(['paused', 'pending']), false],
    [
      'RM QC rejected the material',
      'paused',
      order,
      card([], { materialQc: 'rejected' }),
      false,
    ],
    [
      'last step done, final QC to do',
      'in_progress',
      order,
      card(['completed', 'completed']),
      false,
    ],
    [
      'ready to dispatch, not paid',
      'payment_due',
      order,
      card(['completed', 'completed'], passed('op2')),
      false,
    ],
    [
      'dispatched, not paid',
      'payment_due',
      order,
      card(['completed', 'completed'], { billing: 'invoiced' }),
      false,
    ],
    [
      'invoice paid',
      'completed',
      order,
      card(['completed', 'completed'], { billing: 'invoiced' }),
      true,
    ],
  ] as const)('%s → %s', (_, expected, o, c, paid) => {
    expect(orderStatus(o, c, paid)).toBe(expected);
  });

  test('the list shows each order’s worked-out status', async () => {
    const { store } = await renderAdmin('Orders');
    const status = (id: string) =>
      selectOrderById(store.getState(), id)?.status;
    expect(status('1042')).toBe('in_progress');
    expect(status('1034')).toBe('paused');
    expect(status('1041')).toBe('paused');
    expect(status('1035')).toBe('completed');
    expect(status('1043')).toBe('new');
  });
});

test('filters by priority and status, and searches', async () => {
  const { root } = await renderAdmin('Orders');
  const panel = () => byTestId(root, 'orders-filter-panel');
  const tab = (label: string) =>
    panel().find(
      n =>
        n.props.accessibilityRole === 'tab' &&
        n.props.onPress &&
        allText(n).startsWith(label),
    );
  const applyFilters = async (group: string, options: string[]) => {
    await press(byTestId(root, 'orders-filter'));
    await press(byText(panel(), 'Clear all'));
    await press(tab(group));
    for (const option of options) {
      await press(byLabel(panel(), option));
    }
    await press(byTestId(root, 'orders-filter-apply'));
  };

  await applyFilters('Priority', ['Low']);
  expect(allText(byTestId(root, 'orders-table'))).toContain('WO #1038');
  expect(allText(byTestId(root, 'orders-table'))).not.toContain('WO #1042');
  // Paused: 1034 has a paused step; 1041's material was rejected.
  await applyFilters('Status', ['Paused']);
  expect(allText(root)).toContain('Showing 2 of 2 orders');
  // Multi-select: Paused or Completed (1035, its invoice paid).
  await applyFilters('Status', ['Paused', 'Completed']);
  expect(allText(root)).toContain('Showing 3 of 3 orders');
  await applyFilters('Status', []);
  await typeInto(byLabel(root, 'Search by WO #, part or customer'), 'coupling');
  expect(allText(root)).toContain('Showing 1 of 1 orders');
});

test('wide screens: the page stays put and only the order rows scroll', async () => {
  const { root } = await renderAdmin('Orders');
  const table = byTestId(root, 'orders-table');
  const scroll = byTestId(table, 'orders-table-scroll');
  expect(allText(scroll)).toContain('WO #1042');
  expect(allText(scroll)).not.toContain('Showing 10 of 13 orders');
  expect(allText(table)).toContain('Showing 10 of 13 orders');
  // Title and Create live in the toolbar.
  expect(allText(table)).toContain('Orders');
  expect(byTestId(table, 'create-order')).toBeTruthy();
});

test('phone details: the order over swipeable tabs, Edit in the header', async () => {
  mockWidth = 390;
  const h = await renderAdmin('Orders');
  await press(byTestId(h.root, 'order-card-1043'));
  const screen = byTestId(h.root, 'order-details-screen');
  expect(allText(screen)).toContain('WO #1043');
  // The tabs swipe between pages; 1043's job card is gone.
  const details = byTestId(h.root, 'order-tab-page-details');
  expect(allText(details)).toContain('Customer details');
  await press(byTestId(h.root, 'order-tab-jobCard'));
  const jobCardPage = byTestId(h.root, 'order-tab-page-jobCard');
  expect(allText(jobCardPage)).toContain('No job card');
  // Edit sits in the header (only there) and opens the form.
  expect(
    screen.findAll(
      n => n.props.testID === 'edit-order' && typeof n.type === 'string',
    ).length,
  ).toBe(1);
  await press(byLabel(screen, 'Edit order WO #1043'));
  expect(h.currentRoute()).toBe('OrderForm');
});

test('details show the full work order', async () => {
  const h = await renderAdmin('Orders');
  await press(byText(h.root, 'WO #1042'));
  const screen = byTestId(h.root, 'order-details-screen');
  const text = () => allText(screen);
  // Title, badges and the tabs, with the customer alongside.
  expect(text()).toContain('WO #1042 · Bracket — Job A');
  expect(text()).toContain('High priority');
  expect(text()).toMatch(
    /Order details.*Raw material.*Documents.*Job card details/,
  );
  // Customer details: just the name, email and phone.
  const customer = allText(byTestId(screen, 'order-customer'));
  expect(customer).toMatch(
    /Name\|Acme Metalworks\|Email\|accounts@acmemetalworks.com\|Phone number\|\+91/,
  );
  expect(customer).not.toContain('Contact person');
  // One card: the title stays put; only the tab's content scrolls.
  const scroll = byTestId(screen, 'order-details-scroll');
  expect(allText(scroll)).toContain('PO-8842');
  expect(allText(scroll)).not.toContain('WO #1042 · Bracket — Job A');
  expect(hasTestId(scroll, 'edit-order')).toBe(false);

  // Order details (the first tab): overview, dispatch and notes.
  expect(allText(byTestId(screen, 'order-overview'))).toMatch(
    /PO number.*PO-8842.*Delivery date.*02 Oct 2026/,
  );
  expect(text()).toContain('RC-2210');
  // Quotation and billing come from the order's job card.
  expect(allText(byTestId(screen, 'order-billing'))).toBe(
    'Quotation|Accepted|Billing|Not invoiced',
  );
  expect(text()).toContain('Rework batch');
  expect(text()).not.toContain('HT-99213');

  await press(byTestId(screen, 'order-tab-material'));
  expect(allText(byTestId(screen, 'order-raw-material'))).toContain('HT-99213');
  await press(byTestId(screen, 'order-tab-documents'));
  expect(text()).toContain('PO-8842_project-docs.pdf');
  await press(byTestId(screen, 'order-tab-jobCard'));
  expect(text()).not.toContain('Moved to CNC Turning');
  expect(text()).toContain('Turning (Lathe)');

  // The customer link lives on the Order details tab.
  await press(byTestId(screen, 'order-tab-details'));
  await press(byTestId(screen, 'order-view-customer'));
  expect(h.currentRoute()).toBe('CustomerDetails');
});

test('View customer slides the customer in on Orders; Back returns to the order', async () => {
  const h = await renderAdmin('Orders');
  await press(byText(h.root, 'WO #1042'));
  await press(byTestId(h.root, 'order-view-customer'));
  expect(h.currentRoute()).toBe('CustomerDetails');
  // Still in the Orders drawer item: the customer was pushed on its stack.
  const stack = h.navState().routes.find(r => r.name === 'Orders')?.state;
  expect(stack?.routes.map(r => r.name)).toEqual([
    'OrdersList',
    'OrderDetails',
    'CustomerDetails',
  ]);
  const back = byTestId(h.root, 'customer-details-back');
  expect(allText(back)).toBe('Back to order');
  await press(back);
  expect(h.currentRoute()).toBe('OrderDetails');
  expect(allText(byTestId(h.root, 'order-details-screen'))).toContain(
    'WO #1042',
  );
});

test('Back on an order returns to the customer or the list it came from', async () => {
  // From a customer's Orders tab: "Back to customer", back to that customer.
  const h = await renderAdmin('Customers');
  await h.navigate('CustomerDetails', { customerId: 'CUS-1' });
  await press(byTestId(h.root, 'customer-tab-orders'));
  await press(byText(byTestId(h.root, 'customer-details-screen'), 'WO #1042'));
  let screen = byTestId(h.root, 'order-details-screen');
  expect(allText(byTestId(screen, 'order-details-back'))).toBe(
    'Back to customer',
  );
  // Saving an edit keeps where the order came from.
  await press(byTestId(screen, 'edit-order'));
  const form = byTestId(h.root, 'order-form-screen');
  await press(byTestId(form, 'order-step-3'));
  await press(byTestId(form, 'order-form-submit'));
  expect(h.currentRoute()).toBe('OrderDetails');
  screen = byTestId(h.root, 'order-details-screen');
  await press(byTestId(screen, 'order-details-back'));
  expect(h.currentRoute()).toBe('CustomerDetails');
  expect(allText(byTestId(h.root, 'customer-details-screen'))).toContain(
    'Acme Metalworks',
  );

  // From the orders list: "Back to orders", back to the list.
  await h.navigate('Orders');
  await h.navigate('OrdersList');
  await press(byText(h.root, 'WO #1040'));
  screen = byTestId(h.root, 'order-details-screen');
  expect(allText(byTestId(screen, 'order-details-back'))).toBe(
    'Back to orders',
  );
  await press(byTestId(screen, 'order-details-back'));
  expect(h.currentRoute()).toBe('Orders');
});

test('documents and the drawing open in a viewer with Print', async () => {
  const alert = jest.fn();
  (globalThis as { alert?: unknown }).alert = alert;
  const os = Platform.OS;
  Platform.OS = 'web';
  const h = await renderAdmin('Orders');
  await h.navigate('OrderDetails', { orderId: '1042' });
  const screen = byTestId(h.root, 'order-details-screen');
  await press(byTestId(screen, 'order-tab-documents'));

  // Clicking a document views it; this one isn't stored, so it says so.
  await press(byTestId(screen, 'document-po'));
  let viewer = byTestId(h.root, 'document-viewer');
  expect(allText(viewer)).toContain('PO-8842_project-docs.pdf');
  expect(allText(viewer)).toContain('Purchase order · 640 KB');
  expect(hasTestId(viewer, 'document-viewer-placeholder')).toBe(true);
  // Its Print opens the print dialog with a sheet naming the file.
  await press(byTestId(viewer, 'document-viewer-print'));
  expect(mockPrintHtml).toHaveBeenLastCalledWith(
    expect.stringContaining('PO-8842_project-docs.pdf'),
    'PO-8842_project-docs.pdf',
  );
  expect(alert).not.toHaveBeenCalled();

  // Each row also has its own View and Print buttons.
  expect(byLabel(screen, 'View drawing.pdf')).toBeTruthy();
  await press(byLabel(screen, 'Print drawing.pdf'));
  expect(mockPrintHtml).toHaveBeenLastCalledWith(
    expect.stringContaining('Design file · 480 KB'),
    'drawing.pdf',
  );

  // The order QR is a document of its own: view it, then download it.
  await press(byTestId(screen, 'document-order-qr'));
  viewer = byTestId(h.root, 'document-viewer');
  expect(allText(viewer)).toContain('WO-1042-QR.png');
  expect(hasTestId(viewer, 'document-viewer-qr')).toBe(true);
  await press(byTestId(viewer, 'document-viewer-download'));
  expect(alert).toHaveBeenCalledWith(
    expect.stringContaining('Downloading documents will work once'),
  );
  // Its Print prints the QR large, with the order's details.
  await press(byTestId(viewer, 'document-viewer-print'));
  expect(mockPrintHtml).toHaveBeenLastCalledWith(
    expect.stringContaining('aria-label="QR code for WO #1042"'),
    'WO-1042-QR.png',
  );
  // The row's Print buttons print the QR and the drawing too.
  await press(byLabel(screen, 'Print WO-1042-QR.png'));
  expect(mockPrintHtml).toHaveBeenLastCalledWith(
    expect.any(String),
    'WO-1042-QR.png',
  );
  await press(byLabel(screen, 'Print Drawing DRW-1187'));
  expect(mockPrintHtml.mock.lastCall?.[1]).toMatch(/^Drawing · WO #1042/);

  // The drawing is listed with the documents and opens in the viewer.
  await press(byTestId(screen, 'document-order-drawing'));
  viewer = byTestId(h.root, 'document-viewer');
  expect(allText(viewer)).toContain('Drawing DRW-1187');
  expect(allText(viewer)).toContain('Print drawing with QR');

  // On the Order details tab, the drawing preview opens it too, with the
  // Order QR beside it.
  await press(byTestId(screen, 'order-tab-details'));
  expect(allText(byTestId(screen, 'order-qr'))).toContain('Order QR');
  expect(byLabel(screen, 'QR code for WO #1042')).toBeTruthy();
  await press(byTestId(screen, 'order-drawing'));
  viewer = byTestId(h.root, 'document-viewer');
  expect(allText(viewer)).toContain('Drawing DRW-1187');
  Platform.OS = os;
});

test('an order with a job card lists it; pressing it opens the job card', async () => {
  const h = await renderAdmin('Orders');
  await h.navigate('OrderDetails', { orderId: '1042' });
  const screen = byTestId(h.root, 'order-details-screen');
  // It already has one, so there's nothing to create.
  expect(hasTestId(screen, 'order-create-job-card')).toBe(false);
  await press(byTestId(screen, 'order-tab-jobCard'));
  const item = allText(byTestId(screen, 'order-job-card-1042'));
  expect(item).toContain('WO #1042');
  expect(item).toContain('Now: Turning (Lathe) · CNC-02 · Arun Prakash');
  expect(item).toContain('42%');
  await press(byTestId(screen, 'order-job-card-1042'));
  expect(h.currentRoute()).toBe('JobCardDetails');
  expect(allText(byTestId(h.root, 'job-card-details-screen'))).toContain(
    '#JOB1 · Acme Metalworks',
  );
});

test('an order without its job card says so; nothing creates a second one', async () => {
  const h = await renderAdmin('Orders');
  await h.navigate('OrderDetails', { orderId: '1043' });
  const screen = byTestId(h.root, 'order-details-screen');
  // createOrder opens every order's job card; there's no Create job card.
  expect(hasTestId(screen, 'order-create-job-card')).toBe(false);
  await press(byTestId(screen, 'order-tab-jobCard'));
  expect(allText(screen)).toContain('No job card');
});

test('missing raw material is added on the job card, from a popup', async () => {
  const h = await renderAdmin('Orders');
  await h.navigate('OrderDetails', { orderId: '1040' });
  const screen = byTestId(h.root, 'order-details-screen');
  // Its material source is missing: a popup collects the raw material
  // details (prefilled with the rest).
  await press(byTestId(screen, 'order-add-raw-material'));
  const dialog = () => byTestId(h.root, 'rm-dialog');
  expect(allText(dialog())).toContain('WO #1040 is missing some raw material');
  await press(byTestId(dialog(), 'rm-dialog-submit'));
  // Material source is still empty: nothing is saved yet.
  expect(allText(dialog())).toContain('This field is required');
  await press(byLabel(dialog(), 'In-house'));
  await press(byTestId(dialog(), 'rm-dialog-submit'));
  // Saved on the job card, which fills it in on the order too.
  expect(h.store.getState().jobCards.entities['1040']?.materialSource).toBe(
    'in_house',
  );
  expect(h.store.getState().orders.entities['1040']?.materialSource).toBe(
    'in_house',
  );
  expect(hasTestId(h.root, 'rm-dialog-submit')).toBe(false);
  expect(hasTestId(screen, 'order-add-raw-material')).toBe(false);
});

test('raw material shows pending until every detail is in', async () => {
  const h = await renderAdmin('Orders');
  // WO #1043 has no material source yet.
  await h.navigate('OrderDetails', { orderId: '1043' });
  const screen = byTestId(h.root, 'order-details-screen');
  await press(byTestId(screen, 'order-tab-material'));
  expect(allText(screen)).toContain('Pending');
  // Back returns to the list it was opened from.
  await press(byTestId(screen, 'order-details-back'));
  expect(h.currentRoute()).toBe('Orders');
});

test('documents: the drawing prints with its QR; download is not wired yet', async () => {
  const alert = jest.fn();
  (globalThis as { alert?: unknown }).alert = alert;
  const os = Platform.OS;
  Platform.OS = 'web';
  const h = await renderAdmin('Orders');
  await h.navigate('OrderDetails', { orderId: '1042' });
  const screen = byTestId(h.root, 'order-details-screen');
  // Print drawing sits with the drawing on the Order details tab.
  await press(byText(screen, 'Print drawing with QR'));
  const [html, jobName] = mockPrintHtml.mock.calls[0];
  expect(jobName).toMatch(/^Drawing · WO #1042/);
  expect(html).toContain('DRW-1187');
  expect(html).toContain('aria-label="QR code for WO #1042"');

  // A build without a printer module says so; a failed dialog says that.
  mockPrintHtml.mockImplementation(() => Promise.resolve(false));
  await press(byText(screen, 'Print drawing with QR'));
  expect(alert).toHaveBeenLastCalledWith(
    expect.stringContaining(
      'Print drawing with QR will work once the backend is connected.',
    ),
  );
  mockPrintHtml.mockImplementation(() => Promise.reject(new Error('busy')));
  await press(byText(screen, 'Print drawing with QR'));
  expect(alert).toHaveBeenLastCalledWith(
    expect.stringContaining('The print dialog could not be opened.'),
  );

  await press(byTestId(screen, 'order-tab-documents'));
  expect(hasTestId(screen, 'order-drawing')).toBe(false);
  await press(byLabel(screen, 'Download PO-8842_project-docs.pdf'));
  expect(alert).toHaveBeenCalledTimes(3);
  Platform.OS = os;
  expect(hasTestId(screen, 'view-route-card')).toBe(false);
});

test('creates an order over three steps', async () => {
  const h = await renderAdmin('Orders');
  await press(byTestId(h.root, 'create-order'));
  let form = byTestId(h.root, 'order-form-screen');
  const onStep = (n: number) => hasTestId(form, `order-form-step-${n}`);
  expect(allText(form)).toContain('Create order');
  expect(allText(byTestId(form, 'order-stepper'))).toBe(
    '1|Customer|2|Order details|3|Raw material',
  );
  expect(onStep(1)).toBe(true);
  // Steps ahead can't be opened from the stepper yet.
  expect(byTestId(form, 'order-step-3').props.accessibilityState).toMatchObject(
    { disabled: true },
  );

  // Upload boxes first, then the customer; both marked ones are required.
  expect(allText(byTestId(form, 'order-form-step-1'))).toMatch(
    /Design file.*Purchase order.*Customer.*Customer email/,
  );
  await press(byTestId(form, 'order-form-next'));
  expect(onStep(1)).toBe(true);
  expect(allText(form).split('This field is required').length - 1).toBe(2);

  // Typing narrows the customers; picking one fills in their email.
  await typeInto(byTestId(form, 'order-form-customer'), 'nova');
  const list = byTestId(form, 'order-form-customer-list');
  expect(allText(list)).toBe('Nova Fabrication');
  await press(byText(list, 'Nova Fabrication'));
  expect(hasTestId(form, 'order-form-customer-list')).toBe(false);
  expect(byTestId(form, 'order-form-customer').props.value).toBe(
    'Nova Fabrication',
  );
  expect(byTestId(form, 'order-form-email').props.value).toBe(
    'orders@novafab.co.in',
  );
  await press(byTestId(form, 'order-form-design'));
  expect(allText(form)).toContain('bracket-drawing.pdf');
  await press(byTestId(form, 'order-form-next'));
  expect(onStep(2)).toBe(true);

  await typeInto(byTestId(form, 'order-form-quantity'), 'ten');
  await typeInto(byTestId(form, 'order-form-po-amount'), '-5');
  await press(byTestId(form, 'order-form-next'));
  expect(allText(form).split('Enter a number').length - 1).toBe(2);

  // Required fields come first; DC no sits at the bottom.
  expect(allText(byTestId(form, 'order-form-step-2'))).toMatch(
    /Part name.*Drawing number.*DC date.*Delivery date.*Priority.*Quantity.*PO number.*PO amount.*DC no.*Part \/ job description/,
  );
  // Priority starts at Low.
  expect(allText(byTestId(form, 'order-form-priority'))).toBe('Low');
  // The required fields stop Next until they're filled (the server needs a
  // PO number; DC no is optional).
  expect(allText(form).split('This field is required').length - 1).toBe(5);

  await typeInto(byTestId(form, 'order-form-quantity'), '25');
  await typeInto(byTestId(form, 'order-form-po-amount'), '125000');
  await fillOrderDetails(form);
  await typeInto(byTestId(form, 'order-form-description'), 'Spacer ring');
  await typeInto(byTestId(form, 'order-form-part-number'), 'PN-40001');
  await choose(form, 'order-form-priority', 'High');
  await press(byTestId(form, 'order-form-next'));
  expect(onStep(3)).toBe(true);
  expect(allText(form)).toContain('Raw material details');
  // Done steps fill in; the current one is a ring.
  expect(hasTestId(form, 'order-step-1-completed')).toBe(true);
  expect(hasTestId(form, 'order-step-3-current')).toBe(true);
  expect(allText(byTestId(form, 'order-form-step-3'))).toMatch(
    /Material source.*Bought out.*In-house.*RM part number.*Raw material size.*Heat number.*Raw material grade/,
  );

  // The stepper goes back to a finished step and forward again.
  await press(byTestId(form, 'order-step-1'));
  expect(onStep(1)).toBe(true);
  await press(byTestId(form, 'order-step-3'));
  expect(onStep(3)).toBe(true);

  form = byTestId(h.root, 'order-form-screen');
  await typeInto(byTestId(form, 'order-form-rm-part-number'), 'RM-77');
  await press(byLabel(form, 'In-house'));
  await press(byTestId(form, 'order-form-submit'));

  expect(h.currentRoute()).toBe('Orders');
  const created = h.store.getState().orders.entities['1045'];
  expect(created).toMatchObject({
    customerId: 'CUS-3',
    customerName: 'Nova Fabrication',
    quantity: 25,
    dueDate: '2026-10-20',
    priority: 'high',
    status: 'new',
    partName: 'Spacer ring',
    partNumber: 'PN-40001',
    dcDate: '2026-10-15',
    rmPartNumber: 'RM-77',
    materialSource: 'in_house',
    poAmount: 125000,
  });
  expect(created.designFile?.name).toBe('bracket-drawing.pdf');
  // The order's details show it.
  await h.navigate('OrderDetails', { orderId: '1045' });
  expect(allText(byTestId(h.root, 'order-overview'))).toContain(
    'PO amount|₹1,25,000',
  );
});

test('edits an existing order and keeps its names', async () => {
  const h = await renderAdmin('Orders');
  await h.navigate('OrderDetails', { orderId: '1040' });
  await press(byTestId(byTestId(h.root, 'order-details-screen'), 'edit-order'));
  const form = byTestId(h.root, 'order-form-screen');
  expect(allText(form)).toContain('Edit order');
  // Editing can open any step straight away.
  await press(byTestId(form, 'order-step-2'));
  expect(byTestId(form, 'order-form-quantity').props.value).toBe('120');
  await typeInto(byTestId(form, 'order-form-quantity'), '150');
  await press(byTestId(form, 'order-form-next'));
  await press(byText(form, 'Back'));
  expect(hasTestId(form, 'order-form-step-2')).toBe(true);
  await press(byTestId(form, 'order-step-3'));
  await press(byTestId(form, 'order-form-submit'));
  // Opened from the order's details, so saving returns there.
  expect(h.currentRoute()).toBe('OrderDetails');
  expect(hasTestId(h.root, 'order-form-screen')).toBe(false);
  expect(h.store.getState().orders.entities['1040']).toMatchObject({
    quantity: 150,
    partName: 'Bracket',
    jobName: 'Job B',
  });
});

test('a typed part name wins over the description', () => {
  const input = formValuesToOrderInput({
    ...orderToFormValues(),
    partName: ' Hub ',
    description: 'Spacer ring',
  });
  expect(input.partName).toBe('Hub');
});

test('an order is made for a saved customer: a new name must be added first', async () => {
  const h = await renderAdmin('Orders');
  await press(byTestId(h.root, 'create-order'));
  const form = byTestId(h.root, 'order-form-screen');
  await typeInto(byTestId(form, 'order-form-customer'), 'Zenith Tools');
  expect(hasTestId(form, 'order-form-customer-list')).toBe(false);
  await press(byTestId(form, 'order-form-design'));
  await press(byTestId(form, 'order-form-next'));
  expect(allText(form)).toContain('Not one of your customers yet.');
  // An exact name (any case) counts as that customer.
  await typeInto(byTestId(form, 'order-form-customer'), 'acme metalworks');
  expect(byTestId(form, 'order-form-email').props.value).not.toBe('');
  await press(byTestId(form, 'order-form-next'));
  await fillOrderDetails(form);
  await press(byTestId(form, 'order-form-next'));
  await press(byTestId(form, 'order-form-submit'));
  const created = Object.values(h.store.getState().orders.entities).find(
    o => o?.poNumber === 'PO-9001',
  );
  // Left at its default.
  expect(created).toMatchObject({ customerId: 'CUS-1', priority: 'low' });
});

test('a new customer name can be created from the order form and is picked', async () => {
  const h = await renderAdmin('Orders');
  await press(byTestId(h.root, 'create-order'));
  const form = byTestId(h.root, 'order-form-screen');
  expect(hasTestId(form, 'order-form-create-customer')).toBe(false);
  await typeInto(byTestId(form, 'order-form-customer'), 'Zenith Tools');
  await typeInto(byTestId(form, 'order-form-email'), 'buy@zenith.in');
  await press(byTestId(form, 'order-form-create-customer'));
  // Add customer opens with what was typed.
  expect(byTestId(h.root, 'customer-form-name').props.value).toBe(
    'Zenith Tools',
  );
  expect(byTestId(h.root, 'customer-form-email').props.value).toBe(
    'buy@zenith.in',
  );
  await typeInto(byTestId(h.root, 'customer-form-contact'), 'Ravi Kumar');
  await typeInto(byTestId(h.root, 'customer-form-mobile'), '+91 98400 12345');
  await typeInto(byTestId(h.root, 'customer-form-address'), '8 Mill Road');
  await typeInto(byTestId(h.root, 'customer-form-city'), 'Erode');
  await typeInto(byTestId(h.root, 'customer-form-pin'), '638001');
  await press(byTestId(h.root, 'customer-form-submit'));
  const created = Object.values(h.store.getState().customers.entities).find(
    c => c?.name === 'Zenith Tools',
  );
  expect(created).toBeDefined();
  // The order now uses the new customer: no error, no create button.
  expect(hasTestId(form, 'order-form-create-customer')).toBe(false);
  await press(byTestId(form, 'order-form-design'));
  await press(byTestId(form, 'order-form-next'));
  expect(allText(form)).not.toContain('Not one of your customers yet.');
  expect(hasTestId(form, 'order-form-step-2')).toBe(true);
});

test('editing keeps the customer: it is shown, not changed', async () => {
  const h = await renderAdmin('Orders');
  await h.navigate('OrderForm', { orderId: '1040' });
  const customer = byTestId(h.root, 'order-form-customer');
  expect(customer.props.value).toBe('Bright Steel Co.');
  expect(customer.props.editable).toBe(false);
  expect(allText(h.root)).toContain('An order keeps its customer.');
});

test('the form keeps its buttons pinned and links back', async () => {
  const h = await renderAdmin('Orders');
  await h.navigate('OrderDetails', { orderId: '1040' });
  await press(byTestId(byTestId(h.root, 'order-details-screen'), 'edit-order'));
  const form = byTestId(h.root, 'order-form-screen');
  // Only the fields scroll; the title, stepper and buttons stay put.
  const scroll = byTestId(form, 'order-form-scroll');
  expect(hasTestId(scroll, 'order-form-step-1')).toBe(true);
  expect(hasTestId(scroll, 'order-stepper')).toBe(false);
  expect(hasTestId(scroll, 'order-form-next')).toBe(false);
  expect(allText(form)).not.toContain('All fields are optional');
  // Opened from the order's details, so Back returns there.
  await press(byTestId(form, 'order-form-back-to-list'));
  expect(h.currentRoute()).toBe('OrderDetails');
});

test('marking raw material arrived requires it; the job card comes with the order', async () => {
  const h = await renderAdmin('Orders');
  await press(byTestId(h.root, 'create-order'));
  const form = byTestId(h.root, 'order-form-screen');
  await typeInto(byTestId(form, 'order-form-customer'), 'Nova Fabrication');
  await press(byTestId(form, 'order-form-design'));
  await press(byTestId(form, 'order-form-next'));
  await fillOrderDetails(form);
  await press(byTestId(form, 'order-form-next'));
  const required = () =>
    allText(form).split('This field is required').length - 1;
  const toggle = () => press(byTestId(form, 'order-form-rm-arrived'));

  // Off: optional. Either way it's plain Create order.
  expect(allText(byTestId(form, 'order-form-submit'))).toBe('Create order');
  await toggle();
  expect(allText(byTestId(form, 'order-form-submit'))).toBe('Create order');
  await press(byTestId(form, 'order-form-submit'));
  expect(required()).toBe(5);
  // Switching off drops the errors again.
  await toggle();
  expect(required()).toBe(0);
  await toggle();

  await press(byLabel(form, 'Bought out'));
  await typeInto(byTestId(form, 'order-form-rm-part-number'), 'RM-77');
  await typeInto(byLabel(form, 'Raw material size'), '25mm dia');
  await typeInto(byLabel(form, 'Heat number'), 'HT-1');
  await typeInto(byLabel(form, 'Raw material grade'), 'EN8');
  await press(byTestId(form, 'order-form-submit'));

  const created = Object.values(h.store.getState().orders.entities).find(
    o => o?.poNumber === 'PO-9001',
  );
  expect(created).toMatchObject({
    materialSource: 'bought_out',
    rawMaterialGrade: 'EN8',
  });
  // createOrder opened its job card; it's in the store already.
  expect(h.store.getState().jobCards.entities[created!.jobCardId]).toBeTruthy();
  expect(h.currentRoute()).toBe('Orders');
  expect(hasTestId(h.root, 'order-form-screen')).toBe(false);
});

test('a pill says there are more fields below until the end', async () => {
  const h = await renderAdmin('Orders');
  await press(byTestId(h.root, 'create-order'));
  const form = byTestId(h.root, 'order-form-screen');
  const scroll = () => byTestId(form, 'order-form-scroll');
  const more = () => hasTestId(form, 'order-form-scroll-more');
  const act = async (fn: () => void) => {
    await ReactTestRenderer.act(async () => fn());
  };
  // Everything fits: no pill.
  await act(() => {
    scroll().props.onLayout({ nativeEvent: { layout: { height: 500 } } });
    scroll().props.onContentSizeChange(800, 400);
  });
  expect(more()).toBe(false);
  // Taller than the window: the pill shows until the end is reached.
  await act(() => scroll().props.onContentSizeChange(800, 1200));
  expect(more()).toBe(true);
  expect(allText(byTestId(form, 'order-form-scroll-more'))).toBe(
    'Scroll for more fields',
  );
  await act(() =>
    scroll().props.onScroll({ nativeEvent: { contentOffset: { y: 700 } } }),
  );
  expect(more()).toBe(false);
});

test('edit from the list returns to the list; from details, to details', async () => {
  // From the list: "Back to orders", and Save returns there.
  let h = await renderAdmin('Orders');
  await press(byLabel(h.root, 'Edit order WO #1042'));
  let form = byTestId(h.root, 'order-form-screen');
  expect(allText(byTestId(form, 'order-form-back-to-list'))).toBe(
    'Back to orders',
  );
  await press(byTestId(form, 'order-step-3'));
  await press(byTestId(form, 'order-form-submit'));
  expect(h.currentRoute()).toBe('Orders');

  // From details: "Back to order", and both Back and Save return there.
  h = await renderAdmin('Orders');
  await h.navigate('OrderDetails', { orderId: '1042' });
  const editFromDetails = async () => {
    await press(
      byTestId(byTestId(h.root, 'order-details-screen'), 'edit-order'),
    );
    return byTestId(h.root, 'order-form-screen');
  };
  form = await editFromDetails();
  expect(allText(byTestId(form, 'order-form-back-to-list'))).toBe(
    'Back to order',
  );
  await press(byTestId(form, 'order-form-back-to-list'));
  expect(h.currentRoute()).toBe('OrderDetails');
  form = await editFromDetails();
  await press(byTestId(form, 'order-step-3'));
  await press(byTestId(form, 'order-form-submit'));
  expect(h.currentRoute()).toBe('OrderDetails');
});

test('saving an edit with a bad earlier step opens that step', async () => {
  const h = await renderAdmin('Orders');
  await h.navigate('OrderForm', { orderId: '1040' });
  const form = byTestId(h.root, 'order-form-screen');
  await press(byTestId(form, 'order-step-2'));
  // Clear the delivery date from its picker.
  await press(byTestId(form, 'order-form-delivery'));
  await press(byTestId(form, 'order-form-delivery-clear'));
  expect(allText(byTestId(form, 'order-form-delivery'))).toBe('DD/MM/YYYY');
  // Going back never checks; jumping straight to the end skips step 2.
  await press(byTestId(form, 'order-step-1'));
  await press(byTestId(form, 'order-step-3'));
  await press(byTestId(form, 'order-form-submit'));
  expect(hasTestId(form, 'order-form-step-2')).toBe(true);
  expect(allText(form)).toContain('This field is required');
  expect(h.currentRoute()).toBe('OrderForm');
});

test('unknown order shows not found on details and form', async () => {
  const h = await renderAdmin('Orders');
  await h.navigate('OrderDetails', { orderId: '9999' });
  expect(allText(h.root)).toContain('This order no longer exists.');
  await h.navigate('OrderForm', { orderId: '9999' });
  expect(allText(byTestId(h.root, 'order-form-screen'))).toContain(
    'This order no longer exists.',
  );
});

test('phone: cards with the table details, actions and step footer', async () => {
  mockWidth = 390;
  const h = await renderAdmin('Orders');
  // No stat tiles on phones.
  expect(hasTestId(h.root, 'stat-open')).toBe(false);
  const card = byTestId(h.root, 'order-card-1042');
  const text = allText(card);
  [
    'WO #1042',
    'Bracket — Job A',
    'Customer',
    'Acme Metalworks',
    'Due date',
    '02 Oct',
    'PO number',
    'PO-8842',
    'RC number',
    'RC-2210',
    'High',
    'In progress',
  ].forEach(part => expect(text).toContain(part));
  // Job card and Edit sit on the card, like the table's actions.
  expect(hasTestId(card, 'job-card-1042')).toBe(true);
  expect(hasTestId(card, 'edit-order-1042')).toBe(true);
  // 1043 has no job card yet: Edit only.
  const noJobCard = byTestId(h.root, 'order-card-1043');
  expect(hasTestId(noJobCard, 'job-card-1043')).toBe(false);
  expect(hasTestId(noJobCard, 'edit-order-1043')).toBe(true);
  await press(byTestId(h.root, 'order-card-1042'));
  expect(allText(byTestId(h.root, 'order-details-screen'))).toContain(
    'Order details',
  );
  await h.navigate('OrderForm');
  const form = byTestId(h.root, 'order-form-screen');
  expect(allText(form)).toContain('Step 1 of 3 · Customer');
  // Phones: Customer opens a sheet with a search box.
  await press(byTestId(form, 'order-form-customer'));
  const sheet = () => byTestId(form, 'order-form-customer-sheet');
  await typeInto(byTestId(sheet(), 'order-form-customer-search'), 'nova');
  expect(allText(sheet())).toContain('Nova Fabrication');
  expect(allText(sheet())).not.toContain('Acme Metalworks');
  await press(byText(sheet(), 'Nova Fabrication'));
  expect(allText(byTestId(form, 'order-form-customer'))).toBe(
    'Nova Fabrication',
  );
  expect(byTestId(form, 'order-form-email').props.value).toBe(
    'orders@novafab.co.in',
  );
  // A name that matches none isn't a customer yet: pick a saved one.
  await press(byTestId(form, 'order-form-customer'));
  await typeInto(
    byTestId(sheet(), 'order-form-customer-search'),
    'Zenith Tools',
  );
  await press(byTestId(sheet(), 'order-form-customer-use-typed'));
  expect(allText(byTestId(form, 'order-form-customer'))).toBe('Zenith Tools');
  await press(byTestId(form, 'order-form-design'));
  await press(byTestId(form, 'order-form-next'));
  expect(allText(form)).toContain('Not one of your customers yet.');
  await press(byTestId(form, 'order-form-customer'));
  await typeInto(byTestId(sheet(), 'order-form-customer-search'), 'Acme');
  await press(byText(sheet(), 'Acme Metalworks'));
  await press(byTestId(form, 'order-form-next'));
  expect(allText(form)).toContain('Step 2 of 3 · Order details');
  // The header's back leaves the form; the footer's Back (last) steps back.
  const backs = form.findAll(
    n => typeof n.type === 'string' && n.props.accessibilityLabel === 'Back',
  );
  await press(backs[backs.length - 1]);
  expect(allText(form)).toContain('Step 1 of 3 · Customer');
});

test('order helpers', () => {
  const [first] = MOCK_ORDERS;
  expect(
    orderTitle({
      partName: '',
      jobName: '',
      description: 'Line one\nline two',
    }),
  ).toBe('Line one');
  // The QR code holds the WO number first, then the entered details.
  const qr = orderQrValue(first);
  expect(qr.split('\n')).toEqual([
    'WO #1042',
    'Customer: Acme Metalworks',
    'Part: Bracket — Job A',
    'Part no: PN-33021',
    'Drawing no: DRW-1187',
    'PO no: PO-8842',
    'Qty: 200',
    'Due: Oct 2, 2026',
  ]);
  // The Scan QR screen reads its first line: the WO number.
  expect(normaliseJobCode(qr)).toBe('WO-1042');
  // Blank details are left out.
  expect(
    orderQrValue({
      ...first,
      customerName: ' ',
      partNumber: '',
      drawingNumber: '',
      poNumber: '',
      quantity: 0,
      dueDate: '',
    }).split('\n'),
  ).toEqual(['WO #1042', 'Part: Bracket — Job A']);
  const undated = { ...first, id: '1', dueDate: '', priority: 'high' as const };
  expect(compareOrders(first, undated)).toBeLessThan(0);
  expect(compareOrders(undated, first)).toBeGreaterThan(0);
  // Undated orders: the newest first.
  expect(
    compareOrders(undated, { ...undated, createdAt: '2099-01-01' }),
  ).toBeGreaterThan(0);
  const values = orderToFormValues(first);
  expect(validateOrderForm({ ...values, designFile: null })).toEqual({
    designFile: 'This field is required',
  });
  const bad = { ...values, customerEmail: 'x', dcDate: '99/99/9999' };
  expect(validateOrderForm(bad)).toEqual({
    customerEmail: 'Enter a valid email address',
    dcDate: 'Use DD/MM/YYYY',
  });
  expect(validateOrderForm({ ...values, customerName: ' ' })).toEqual({
    customerName: 'This field is required',
  });
  // DC no is optional; the server needs a PO number.
  expect(validateOrderForm({ ...values, dcNo: '' })).toEqual({});
  expect(validateOrderForm({ ...values, poNumber: '' })).toEqual({
    poNumber: 'This field is required',
  });
  expect(hasStepErrors(1, bad)).toBe(true);
  expect(hasStepErrors(3, bad)).toBe(false);
  expect(firstStepWithErrors(bad)).toBe(1);
  expect(firstStepWithErrors({ ...bad, customerEmail: '' })).toBe(2);
  expect(firstStepWithErrors(values)).toBe(3);
  const input = formValuesToOrderInput({
    ...orderToFormValues(),
    description: 'New part',
    priority: '',
  });
  expect(input).toMatchObject({
    priority: 'low',
    quantity: 0,
    dueDate: '',
    partName: 'New part',
    documents: [],
  });
});

describe('Orders list actions', () => {
  test('edit opens the order form for that order', async () => {
    const h = await renderAdmin('Orders');
    await press(byLabel(h.root, 'Edit order WO #1042'));
    expect(h.currentRoute()).toBe('OrderForm');
  });

  test('the job card button opens the job card, with Create flow when it has none', async () => {
    const h = await renderAdmin('Orders');
    // 1042 has a route card: open its job card.
    await press(byLabel(h.root, 'Open job card for WO #1042'));
    expect(h.currentRoute()).toBe('JobCardDetails');

    // Back returns to the Orders list (the card was pushed on its stack).
    await press(byTestId(h.root, 'job-card-details-back'));
    expect(h.currentRoute()).toBe('Orders');

    // 1036 has no route card yet: its job card, with Create flow open.
    await press(byLabel(h.root, 'Create job card for WO #1036'));
    expect(h.currentRoute()).toBe('JobCardDetails');
    expect(allText(byTestId(h.root, 'job-card-machining'))).toMatch(
      /^Create flow/,
    );
  });

  test('a new order comes with its job card, so it gets the button', async () => {
    const h = await renderAdmin('Orders');
    // createOrder opens the job card too (no second call).
    await press(byTestId(h.root, 'create-order'));
    await typeInto(byTestId(h.root, 'order-form-customer'), 'Nova Fabrication');
    await press(byTestId(h.root, 'order-form-design'));
    await press(byTestId(h.root, 'order-form-next'));
    await fillOrderDetails(h.root);
    await press(byTestId(h.root, 'order-form-next'));
    await press(byTestId(h.root, 'order-form-submit'));
    await typeInto(
      byLabel(h.root, 'Search by WO #, part or customer'),
      'WO #1045',
    );
    expect(allText(byTestId(h.root, 'orders-table'))).toContain('WO #1045');
    expect(hasTestId(h.root, 'job-card-1045')).toBe(true);
  });
});

test('search finds an order by its work ID in any common form', async () => {
  const { root } = await renderAdmin('Orders');
  const search = byLabel(root, 'Search by WO #, part or customer');
  for (const query of ['1042', 'WO #1042', 'wo1042', 'WO-1042']) {
    await typeInto(search, query);
    const text = allText(byTestId(root, 'orders-table'));
    expect(text).toContain('Showing 1 of 1');
    expect(text).toContain('WO #1042');
  }
});
