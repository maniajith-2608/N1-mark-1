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
import { MOCK_JOB_CARDS } from '../../jobCards/api/mockData';
import { jobCardsApi } from '../../jobCards/api/mockJobCardsApi';
import { QC_STRINGS } from '../constants';
import { machineQc, qcResult, rawMaterialQc } from '../qc';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

type Root = ReactTestRenderer.ReactTestInstance;
let app: ReactTestRenderer.ReactTestRenderer | undefined;

// Only one linked NavigationContainer may be mounted at a time.
afterEach(async () => {
  await ReactTestRenderer.act(() => app?.unmount());
  app = undefined;
});

async function qc() {
  app = await renderAppAs('qc@n1.com', 'Qc@12345');
  return app.root;
}

const card = async (id: string) =>
  (await jobCardsApi.list()).find(c => c.id === id)!;
const rowText = (root: Root, id: string) =>
  allText(byTestId(root, `qc-row-${id}`));
const mock = (id: string) => MOCK_JOB_CARDS.find(c => c.id === id)!;

describe('qc rules', () => {
  test('station titles add QC once', () => {
    expect(QC_STRINGS.station.operationQc('Turning (Lathe)')).toBe(
      'Turning (Lathe) QC',
    );
    expect(QC_STRINGS.station.operationQc('Material QC')).toBe('Material QC');
  });

  test('raw material QC follows the material QC status', () => {
    expect(rawMaterialQc(mock('1039')).status).toBe('pending');
    expect(rawMaterialQc(mock('1042')).status).toBe('passed');
    expect(rawMaterialQc(mock('1041')).status).toBe('failed');
  });

  test('machine QC inspects the last finished operation', () => {
    // 1042: Facing finished and passed; Turning still running.
    expect(machineQc(mock('1042'))).toMatchObject({
      status: 'passed',
      stage: 'In-process QC',
      subject: 'Facing (Lathe) (Lathe-01)',
    });
    // 1039: Material QC finished, not checked yet.
    expect(machineQc(mock('1039')).status).toBe('pending');
    // 1036: no route card yet.
    expect(machineQc(mock('1036')).status).toBe('waiting');
  });

  test('a fail logs the remark and who checked, and rejects raw material', () => {
    const changes = qcResult(
      mock('1039'),
      'rm',
      false,
      'Rusty',
      '2026-10-02',
      'Suresh Babu',
    );
    expect(changes.materialQc).toBe('rejected');
    expect(changes.qcHistory?.at(-1)).toMatchObject({
      stage: 'Material QC',
      result: 'rejected',
      remark: 'Rusty',
      inspector: 'Suresh Babu',
    });
  });
});

test('QC list has Raw Material and Machine QC tabs', async () => {
  const root = await qc();

  let text = allText(root);
  expect(text).toContain('QC');
  expect(text).toContain('2 pending · 5 total');
  expect(rowText(root, '1039')).toContain('Incoming inspection · SS Plate');
  expect(rowText(root, '1039')).toContain('Pending');
  expect(rowText(root, '1041')).toContain('Failed');

  // Swipeable tabs under the header, like Billing on phones.
  expect(hasTestId(root, 'qc-tabs-rm')).toBe(true);
  await press(byTestId(root, 'qc-tabs-machine'));
  expect(hasTestId(root, 'qc-tab-page-machine')).toBe(true);
  text = allText(root);
  expect(rowText(root, '1042')).toContain('In-process QC');
  expect(rowText(root, '1042')).toContain('Passed');
  expect(rowText(root, '1036')).toContain('Waiting');
});

test('passing raw material QC moves the item to Passed', async () => {
  const root = await qc();
  await press(byTestId(root, 'qc-row-1039'));

  const text = allText(root);
  expect(text).toContain('QC Check');
  expect(text).toContain('RM QC');
  expect(text).toContain('Incoming inspection');
  // The same job overview as the operator's Job Detail, not order details.
  expect(text).toContain('Route card & progress');
  expect(text).toContain('Material QC: Pending');
  expect(allText(byTestId(root, 'qc-station'))).toContain('Assigned QC');
  expect(text).not.toContain('Shop order number');

  await press(byTestId(root, 'qc-pass'));

  expect(hasTestId(root, 'qc-list-screen')).toBe(true);
  expect(rowText(root, '1039')).toContain('Passed');
  expect(allText(root)).toContain('1 pending · 5 total');
  expect((await card('1039')).materialQc).toBe('accepted');
});

test('failing needs remarks, then marks the item failed', async () => {
  const root = await qc();
  await press(byText(root, 'Machine QC'));
  await press(byTestId(root, 'qc-row-1039'));

  // QC station: what is checked and who is assigned, no timer.
  const station = allText(byTestId(root, 'qc-station'));
  expect(station).toContain('In-process QC');
  expect(station).toContain('Material QC');
  expect(station).not.toContain('Material QC QC');
  expect(station).toContain('Assigned QC');
  expect(station).toContain('Suresh Babu');
  expect(station).not.toContain('Started at');
  expect(allText(root)).not.toContain('Elapsed time');
  await press(byTestId(root, 'qc-fail'));
  expect(allText(root)).toContain('Fail Remarks');
  // No voice notes in phase 1: remarks are typed.
  expect(() => byLabel(root, 'Voice note')).toThrow();
  expect(hasTestId(root, 'qc-rejected-grade')).toBe(false);

  await press(byTestId(root, 'qc-submit-fail'));
  expect(allText(root)).toContain('This field is required');

  await typeInto(byTestId(root, 'qc-remarks'), 'Bore out of tolerance');
  await press(byTestId(root, 'qc-submit-fail'));

  // Back on the list (Machine QC tab kept). The failed check reopened the
  // step as rework, so there's nothing to check until it's done again.
  expect(hasTestId(root, 'qc-list-screen')).toBe(true);
  expect(rowText(root, '1039')).not.toContain('Pending');
  const failed = await card('1039');
  expect(failed.qcHistory.at(-1)).toMatchObject({
    kind: 'machine',
    result: 'failed',
    remark: 'Bore out of tolerance',
    operationId: '1039-op1',
  });
  expect(failed.operations[0]).toMatchObject({
    status: 'pending',
    isRework: true,
  });

  await press(byTestId(root, 'qc-row-1039'));
  expect(hasTestId(root, 'qc-pass')).toBe(false);
});

test('a supporting document can be attached to a fail, and is kept as its report', async () => {
  const root = await qc();
  await press(byText(root, 'Machine QC'));
  await press(byTestId(root, 'qc-row-1039'));
  await press(byTestId(root, 'qc-fail'));

  // Optional: not attaching one doesn't block Submit Fail.
  const upload = byTestId(root, 'qc-fail-document');
  expect(allText(root)).toContain('Supporting document');
  expect(allText(upload)).toBe('Upload a photo, PDF or report');
  await press(upload);
  expect(allText(byTestId(root, 'qc-fail-document'))).toMatch(
    /^qc-fail-report\.pdf\|.+KB/,
  );

  await typeInto(byTestId(root, 'qc-remarks'), 'Surface defect');
  await press(byTestId(root, 'qc-submit-fail'));
  expect((await card('1039')).qcHistory.at(-1)).toMatchObject({
    result: 'failed',
    remark: 'Surface defect',
    report: { name: 'qc-fail-report.pdf', kind: 'QC report' },
  });
});

test('failing raw material QC also records the rejected material', async () => {
  const root = await qc();
  await press(byTestId(root, 'qc-row-1039'));
  await press(byTestId(root, 'qc-fail'));
  expect(allText(root)).toContain('Rejected material');

  // Remarks and all three material fields are required.
  await typeInto(byTestId(root, 'qc-remarks'), 'Wrong grade received');
  await press(byTestId(root, 'qc-submit-fail'));
  expect(allText(root).split('This field is required').length - 1).toBe(3);
  await typeInto(byTestId(root, 'qc-rejected-grade'), 'EN1A');
  await typeInto(byTestId(root, 'qc-rejected-heatNumber'), 'HT-12345');
  await typeInto(byTestId(root, 'qc-rejected-size'), '24mm dia x 200mm');
  await press(byTestId(root, 'qc-submit-fail'));

  expect(rowText(root, '1039')).toContain('Failed');
  expect((await card('1039')).qcHistory.at(-1)).toMatchObject({
    result: 'rejected',
    remark: 'Wrong grade received',
    rejectedMaterial: {
      grade: 'EN1A',
      heatNumber: 'HT-12345',
      size: '24mm dia x 200mm',
    },
  });

  // The check lists them with the remark.
  await press(byTestId(root, 'qc-row-1039'));
  const text = allText(root);
  expect(text).toContain('Wrong grade received');
  expect(text).toContain('HT-12345');
});

test('importing a job opens its check in the current tab', async () => {
  const root = await qc();
  await press(byText(root, 'Machine QC'));
  await press(byTestId(root, 'import-job'));
  await press(byText(root, 'Enter code manually'));
  await typeInto(byTestId(root, 'job-code-input'), 'WO-1040');
  await press(byTestId(root, 'job-code-submit'));

  const text = allText(root);
  expect(text).toContain('QC Check');
  expect(text).toContain('Machine QC');
  expect(text).toContain('WO #1040 · Bracket — Job B');

  await press(byLabel(root, 'Back'));
  expect(allText(root)).toContain('6 total');
  expect(hasTestId(root, 'qc-row-1040')).toBe(true);
});

test('View Details opens the order behind a QC check', async () => {
  const root = await qc();
  await press(byTestId(root, 'qc-row-1042'));
  await press(byTestId(root, 'view-order-details'));

  // The job view: no prices or client details.
  const text = allText(byTestId(root, 'order-details-modal'));
  expect(text).toContain('Order Details');
  expect(text).toContain('PO number');
  expect(text).not.toContain('PO amount');
});
