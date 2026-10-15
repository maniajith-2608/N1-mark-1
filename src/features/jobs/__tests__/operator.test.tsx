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

async function operator() {
  app = await renderAppAs('operator@n1.com', 'Operator@123');
  return app.root;
}

async function importCode(root: Root, code: string) {
  await press(byTestId(root, 'import-job'));
  await press(byText(root, 'Enter code manually'));
  await typeInto(byTestId(root, 'job-code-input'), code);
  await press(byTestId(root, 'job-code-submit'));
}

const card = async (id: string) =>
  (await jobCardsApi.list()).find(c => c.id === id)!;

test("My Jobs shows the operator's jobs as cards", async () => {
  const root = await operator();

  expect(allText(root)).toContain('4 in progress · 5 total');
  // The part's letter, name and customer, where it is, chips, then the
  // operator and progress. The whole card opens the job.
  expect(allText(byTestId(root, 'job-row-1034'))).toBe(
    'H|Housing — Job I|Silverline Industries|Deburring · Bench 2|Deburring (paused)|WO #1034|#JOB8|Medium priority|55 pcs|Due 16 Oct 2026|RK|Ravi Kumar|Operator|70%|done',
  );
  // No View button or flow edit for operators.
  expect(allText(root)).not.toContain('View');
  expect(hasTestId(root, 'job-row-1040')).toBe(false);

  await press(byTestId(root, 'job-row-1034'));
  expect(allText(root)).toContain('Job Detail');
  expect(allText(root)).toContain('Resume');
});

test('importing a job adds it and opens its Job Detail', async () => {
  const root = await operator();
  await importCode(root, 'WO-1040');

  let text = allText(root);
  expect(text).toContain('Job Detail');
  expect(text).toContain('WO #1040 · Bracket — Job B');
  expect(text).toContain('Active station');
  expect(text).toContain('Route card & progress');

  await press(byLabel(root, 'Back'));
  text = allText(root);
  expect(text).toContain('5 in progress · 6 total');
  expect(text.indexOf('WO #1040')).toBeLessThan(text.indexOf('WO #1042'));
});

test('a job without a route card cannot be imported', async () => {
  const root = await operator();
  await importCode(root, '1036');

  expect(allText(root)).toContain(
    'WO #1036 has no route card yet. Ask an admin to create its flow.',
  );
});

test('pause, resume, complete, then start the next step on a machine', async () => {
  const root = await operator();
  await press(byTestId(root, 'job-row-1042'));

  // Turning is running: Pause and Complete.
  expect(byTestId(root, 'active-station')).toBeTruthy();
  expect(allText(root)).toContain('Running');
  await press(byTestId(root, 'pause-operation'));
  expect(allText(root)).toContain('Paused');

  await press(byTestId(root, 'resume-operation'));
  await press(byTestId(root, 'complete-operation'));
  expect((await card('1042')).operations[2].status).toBe('completed');

  // Next step (Deburring) waits for a machine.
  let text = allText(root);
  expect(text).toContain('Next operation');
  expect(text).toContain('Deburring');
  await press(byTestId(root, 'start-operation'));

  expect(allText(root)).toContain('Assign Machine');
  // Busy machines can't be picked; Confirm waits for a choice.
  expect(
    byTestId(root, 'machine-CNC-02').props.accessibilityState,
  ).toMatchObject({ disabled: true });
  expect(
    byTestId(root, 'confirm-start').props.accessibilityState,
  ).toMatchObject({ disabled: true });
  await press(byTestId(root, 'machine-LATHE-01'));
  await press(byTestId(root, 'confirm-start'));

  // Back on Job Detail, running on the chosen machine by this operator.
  text = allText(root);
  expect(text).toContain('Job Detail');
  expect(text).toContain('LATHE-01');
  expect(text).toContain('Ravi Kumar');
  expect(hasTestId(root, 'pause-operation')).toBe(true);
  expect(hasTestId(root, 'complete-operation')).toBe(true);
  expect((await card('1042')).operations[3]).toMatchObject({
    name: 'Deburring',
    status: 'running',
    machine: 'LATHE-01',
    operator: 'Ravi Kumar',
  });
});

test('View Details opens the order full screen, and closes back to the job', async () => {
  const root = await operator();
  await press(byTestId(root, 'job-row-1042'));
  await press(byTestId(root, 'view-order-details'));

  const modal = byTestId(root, 'order-details-modal');
  const text = allText(modal);
  expect(text).toContain('Order Details');
  expect(text).toContain('Acme Metalworks');
  expect(text).toContain('Shop order number');
  expect(text).toContain('HT-99213');

  await press(byLabel(modal, 'Close'));
  expect(hasTestId(root, 'order-details-modal')).toBe(false);
  expect(allText(root)).toContain('Job Detail');
});

test('1037 is ready to start: Start opens Assign Machine', async () => {
  const root = await operator();
  await press(byTestId(root, 'job-row-1037'));

  // Cutting passed its QC, so Welding can start right away.
  const start = byTestId(root, 'start-operation');
  expect(allText(start)).toBe('Start');
  expect(start.props.accessibilityState).toMatchObject({ disabled: false });
  await press(start);
  expect(hasTestId(root, 'assign-machine-screen')).toBe(true);
});

test('the station’s drawing opens the Drawing screen', async () => {
  const root = await operator();
  await press(byTestId(root, 'job-row-1037'));
  await press(byTestId(root, 'station-drawing'));

  const drawing = byTestId(root, 'drawing-screen');
  expect(allText(drawing)).toMatch(/^Drawing\|DRW-1182\|WO #1037/);
  await press(byLabel(drawing, 'Close'));
  expect(hasTestId(root, 'operator-job-screen')).toBe(true);
});
