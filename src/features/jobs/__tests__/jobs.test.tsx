import { Linking } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {
  allText,
  byLabel,
  byTestId,
  byText,
  hasTestId,
  press,
  renderAppAs,
  typeInto,
} from '../../../shared/testing/testUtils';
import { jobCardsApi } from '../../jobCards/api/jobCardsApi';
import { MOCK_ORDERS } from '../../orders/api/mockData';
import { ordersApi } from '../../orders/api/ordersApi';
import { isRawMaterialMissing, parseJobCode } from '../utils';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

let app: ReactTestRenderer.ReactTestRenderer | undefined;

// Only one linked NavigationContainer may be mounted at a time.
afterEach(async () => {
  await ReactTestRenderer.act(() => app?.unmount());
  app = undefined;
});

async function secondAdmin() {
  app = await renderAppAs('supervisor@n1.com', 'Supervisor@123');
  return app.root;
}

/** Import Job → Enter code manually → type the code → Import Job. */
async function importCode(
  root: ReactTestRenderer.ReactTestInstance,
  code: string,
) {
  await press(byTestId(root, 'import-job'));
  expect(allText(root)).toContain('Align the QR code within the frame');
  await press(byText(root, 'Enter code manually'));
  await typeInto(byTestId(root, 'job-code-input'), code);
  await press(byTestId(root, 'job-code-submit'));
}

describe('utils', () => {
  test('parseJobCode reads the work order number from any code format', () => {
    expect(parseJobCode('WO-01042')).toBe('1042');
    expect(parseJobCode('wo #1042')).toBe('1042');
    expect(parseJobCode(' 1042 ')).toBe('1042');
    expect(parseJobCode('WO-')).toBe('');
    // An order QR code: only the first line counts, not the details under it.
    expect(parseJobCode('WO #1042\nPart no: PN-33021\nQty: 200')).toBe('1042');
  });

  test('isRawMaterialMissing flags any blank raw material detail', () => {
    const [order] = MOCK_ORDERS;
    expect(isRawMaterialMissing(order)).toBe(false);
    expect(isRawMaterialMissing({ ...order, materialSource: '' })).toBe(true);
    expect(isRawMaterialMissing({ ...order, heatNumber: ' ' })).toBe(true);
  });
});

test("My Jobs lists the user's jobs with counts and search", async () => {
  const root = await secondAdmin();

  const text = allText(root);
  expect(text).toContain('My Jobs');
  expect(text).toContain('5 active · 6 total');
  expect(hasTestId(root, 'job-card-1042')).toBe(true);
  // Job cards that were never imported stay off the list.
  expect(hasTestId(root, 'job-card-1036')).toBe(false);

  // The black header: the N1 logo, "My Jobs" in the middle and the initials,
  // then the search, filter and QR scanner (Import Job).
  const header = byTestId(root, 'employee-home-header');
  expect(allText(header)).toMatch(/^My Jobs\|[A-Z]{1,2}$/);
  expect(hasTestId(header, 'employee-home-logo')).toBe(true);
  expect(hasTestId(header, 'my-jobs-search')).toBe(true);
  expect(hasTestId(header, 'my-jobs-filter')).toBe(true);
  expect(hasTestId(header, 'import-job')).toBe(true);

  const settle = () =>
    ReactTestRenderer.act(
      () => new Promise(resolve => setTimeout(resolve, 400)),
    );
  await typeInto(byTestId(root, 'my-jobs-search'), 'Housing');
  await settle();
  expect(hasTestId(root, 'job-card-1034')).toBe(true);
  expect(hasTestId(root, 'job-card-1042')).toBe(false);

  await typeInto(byTestId(root, 'my-jobs-search'), '');
  await settle();
  expect(hasTestId(root, 'job-card-1042')).toBe(true);
});

test("My Jobs' filter shows only the jobs at the picked stage", async () => {
  const root = await secondAdmin();
  const stages = () =>
    root
      .findAll(
        n =>
          typeof n.type === 'string' &&
          String(n.props.testID ?? '').startsWith('job-card-stage-'),
      )
      .map(n => allText(n));
  const all = stages();
  const picked = allText(byTestId(root, 'job-card-stage-1042'));
  expect(new Set(all).size).toBeGreaterThan(1);

  await press(byTestId(root, 'my-jobs-filter'));
  const panel = byTestId(root, 'my-jobs-filter-panel');
  await press(byLabel(panel, picked));
  await press(byTestId(root, 'my-jobs-filter-apply'));

  expect(hasTestId(root, 'job-card-1042')).toBe(true);
  expect(stages().every(stage => stage === picked)).toBe(true);
  expect(stages().length).toBeLessThan(all.length);
});

test('job codes that are blank or unknown show an error', async () => {
  const root = await secondAdmin();
  await importCode(root, '');
  expect(allText(root)).toContain('This field is required');

  await typeInto(byTestId(root, 'job-code-input'), 'WO-9999');
  await press(byTestId(root, 'job-code-submit'));
  expect(allText(root)).toContain('No work order found for WO-9999');
});

/** Fires the mocked camera's barcode callback with one QR value. */
async function scan(root: ReactTestRenderer.ReactTestInstance, value: string) {
  const camera = byTestId(root, 'qr-camera');
  await ReactTestRenderer.act(async () =>
    camera.props.outputs[0].onBarcodeScanned([{ rawValue: value }]),
  );
}

describe('Scan QR code', () => {
  const permission = jest.requireMock('react-native-vision-camera')
    .__permission as { status: string };
  afterEach(() => {
    permission.status = 'authorized';
  });

  test('a scanned job code imports the order', async () => {
    const root = await secondAdmin();
    await press(byTestId(root, 'import-job'));
    expect(byTestId(root, 'qr-camera').props.isActive).toBe(true);

    await scan(root, 'WO-01036');
    expect(allText(root)).toContain('WO #1036 · Coupling — Job G');
  });

  test('a bad code shows its error once, and the flash toggles', async () => {
    const root = await secondAdmin();
    await press(byTestId(root, 'import-job'));

    await scan(root, 'WO-9999');
    expect(allText(root)).toContain('No work order found for WO-9999');
    // The same code stays in view; it isn't reported again.
    await scan(root, 'WO-9999');
    await scan(root, 'https://example.com');
    expect(allText(root)).toContain(
      'No work order found for https://example.com',
    );

    expect(byTestId(root, 'qr-camera').props.torchMode).toBe('off');
    await press(byLabel(root, 'Turn on flash'));
    expect(byTestId(root, 'qr-camera').props.torchMode).toBe('on');
    expect(hasTestId(root, 'scan-flash')).toBe(true);
    byLabel(root, 'Turn off flash');
  });

  test('without camera access it offers Settings and manual entry', async () => {
    permission.status = 'denied';
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    const root = await secondAdmin();
    await press(byTestId(root, 'import-job'));

    expect(hasTestId(root, 'qr-camera')).toBe(false);
    expect(hasTestId(root, 'scan-flash')).toBe(false);
    expect(allText(root)).toContain('Camera access needed');
    await press(byText(root, 'Open settings'));
    expect(openSettings).toHaveBeenCalled();

    await press(byText(root, 'Enter code manually'));
    expect(hasTestId(root, 'job-code-input')).toBe(true);
  });
});

test('order → raw material modal → job added to My Jobs → job card', async () => {
  const root = await secondAdmin();
  await importCode(root, 'WO-01036');

  // Order screen.
  let text = allText(root);
  expect(text).toContain('WO #1036 · Coupling — Job G');
  expect(text).toContain('Bright Steel Co.');
  expect(text).toContain('Shop order number');
  await press(byTestId(root, 'create-job-card'));

  // Raw Material Details: known values kept, every field required.
  expect(allText(root)).toContain('A few details are missing');
  expect(byTestId(root, 'raw-material-heatNumber').props.value).toBe(
    'HT-99207',
  );
  await typeInto(byTestId(root, 'raw-material-heatNumber'), ' ');
  await press(byTestId(root, 'raw-material-submit'));
  expect(allText(root).split('This field is required').length - 1).toBe(2);
  await typeInto(byTestId(root, 'raw-material-heatNumber'), 'HT-55555');
  await press(byLabel(root, 'In-house'));
  await press(byTestId(root, 'raw-material-submit'));

  // Straight to the new job's job card.
  text = allText(root);
  expect(text).toContain('Job card');
  expect(text).toMatch(/#JOB\d+ · Bright Steel Co\./);
  expect(allText(byTestId(root, 'job-card-wo'))).toBe('WO #1036');
  expect(hasTestId(root, 'job-card-tab-machining')).toBe(true);
  expect(text).not.toContain('Raw Material Details');
  const order = (await ordersApi.list()).find(o => o.id === '1036');
  expect(order).toMatchObject({
    materialSource: 'in_house',
    heatNumber: 'HT-55555',
  });

  // Back lands on My Jobs, with the job added at the top.
  await press(byLabel(root, 'Back'));
  text = allText(root);
  expect(text).toContain('6 active · 7 total');
  expect(text.indexOf('WO #1036')).toBeLessThan(text.indexOf('WO #1041'));
});

test('the order keeps its heading and drawing pinned; the thumbnail opens the Drawing screen', async () => {
  const root = await secondAdmin();
  await importCode(root, '1043');

  const tile = byTestId(root, 'order-summary-tile');
  expect(allText(tile)).toContain('Drawing');
  // Pinned above the scrolling details, not inside them.
  const screen = byTestId(root, 'import-order-screen');
  const [scroll] = screen.findAll(n => n.props.contentContainerStyle);
  expect(() => byTestId(scroll, 'order-summary-tile')).toThrow();
  expect(allText(scroll)).toContain('Shop order number');
  // Overview, Dispatch and Raw material, the same fields as the admin order.
  expect(allText(byTestId(scroll, 'order-info-overview'))).toMatch(
    /^Overview\|Quantity\|150 pcs\|Due date\|.*\|Part name\|Spindle\|.*PO amount\|₹65,000/,
  );
  expect(allText(byTestId(scroll, 'order-info-dispatch'))).toContain('DC-5562');
  expect(allText(byTestId(scroll, 'order-info-material'))).toContain(
    'Material source',
  );

  // The thumbnail opens the Drawing screen; close returns to the order.
  await press(byTestId(tile, 'order-drawing-thumb'));
  const drawing = byTestId(root, 'drawing-screen');
  expect(allText(drawing)).toContain('DRW-1188');
  expect(hasTestId(drawing, 'drawing-print')).toBe(true);
  await press(byLabel(drawing, 'Close'));
  expect(hasTestId(root, 'drawing-screen')).toBe(false);
  expect(hasTestId(root, 'import-order-screen')).toBe(true);
});

test('closing the raw material modal keeps the order open', async () => {
  const root = await secondAdmin();
  await importCode(root, '1039');
  await press(byTestId(root, 'create-job-card'));

  expect(allText(root)).toContain('Raw Material Details');
  await press(byLabel(root, 'Close'));

  expect(allText(root)).not.toContain('Raw Material Details');
  expect(allText(root)).toContain('Create Job Card');
});

test('a job already on My Jobs opens its job card from the order', async () => {
  const root = await secondAdmin();
  await importCode(root, '1042');

  expect(allText(root)).toContain('View Job Card');
  await press(byTestId(root, 'create-job-card'));

  await press(byTestId(root, 'job-card-tab-machining'));
  expect(allText(root)).toContain('Route card & progress');
  await press(byText(root, 'Edit'));
  expect(allText(root)).toContain('Edit flow');
});

test('the list’s pencil edits the flow in a sheet; closing it stays on the list', async () => {
  const root = await secondAdmin();
  await press(byTestId(root, 'flow-action-1042'));

  expect(hasTestId(root, 'flow-sheet')).toBe(true);
  expect(hasTestId(root, 'job-card-details-screen')).toBe(false);
  await press(byText(byTestId(root, 'flow-sheet'), 'Cancel'));

  expect(hasTestId(root, 'flow-sheet')).toBe(false);
  expect(hasTestId(root, 'my-jobs-screen')).toBe(true);
  expect(hasTestId(root, 'job-card-details-screen')).toBe(false);
});

test('an order without a job card gets one created', async () => {
  // A new work order; it gets the next number, 1045.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, status, statusHistory, createdAt, ...input } = MOCK_ORDERS[0];
  app = await renderAppAs('supervisor@n1.com', 'Supervisor@123', () =>
    ordersApi.create(input),
  );
  const root = app.root;

  await importCode(root, 'WO-1045');
  await press(byTestId(root, 'create-job-card'));
  // Every detail is already there, so the modal asks to confirm them.
  expect(allText(root)).toContain('Check the raw material details');
  await press(byTestId(root, 'raw-material-submit'));

  expect(hasTestId(root, 'job-card-details-screen')).toBe(true);
  const created = (await jobCardsApi.list()).find(c => c.id === '1045');
  expect(created).toMatchObject({ status: 'not_started', operations: [] });
});

test('supervisor re-initiates RM QC with new material after a rejection', async () => {
  const root = await secondAdmin();
  // My Jobs flags the job whose material RM QC rejected.
  expect(allText(byTestId(root, 'rm-qc-failed-1041'))).toContain(
    'RM QC failed',
  );
  expect(hasTestId(root, 'rm-qc-failed-1042')).toBe(false);
  await press(byLabel(root, 'View job card WO #1041'));

  // The job card's QC tab shows what RM QC rejected, and offers Re-initiate.
  await press(byTestId(root, 'job-card-tab-qc'));
  const rejected = allText(byTestId(root, 'rejected-material'));
  expect(rejected).toContain('AL6061');
  expect(rejected).toContain('HT-99212');
  expect(rejected).toContain('24.6mm dia x 200mm');
  expect(rejected).toContain('Billet diameter under tolerance');
  await press(byTestId(root, 'reinitiate-rm-qc'));

  // Same raw material form, for the replacement: a new heat number is needed.
  expect(allText(root)).toContain('Replacement material');
  expect(byTestId(root, 'raw-material-heatNumber').props.value).toBe('');
  await press(byLabel(root, 'Bought out'));
  await press(byTestId(root, 'raw-material-submit'));
  expect(allText(root)).toContain('This field is required');
  await typeInto(byTestId(root, 'raw-material-heatNumber'), 'HT-70001');
  await press(byTestId(root, 'raw-material-submit'));

  // Back on the job card: RM QC is pending again, nothing left to re-initiate.
  expect(hasTestId(root, 'job-card-details-screen')).toBe(true);
  expect(hasTestId(root, 'reinitiate-rm-qc')).toBe(false);
  expect(hasTestId(root, 'rejected-material')).toBe(false);
  expect((await jobCardsApi.get('1041')).materialQc).toBe('pending');
  expect((await ordersApi.get('1041')).heatNumber).toBe('HT-70001');

  // And the My Jobs flag is gone.
  await press(byLabel(root, 'Back'));
  expect(hasTestId(root, 'rm-qc-failed-1041')).toBe(false);
});
