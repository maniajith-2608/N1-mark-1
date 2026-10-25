import { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import {
  allText,
  byLabel,
  byText,
  byTestId,
  choose,
  hasTestId,
  press,
  renderAdmin,
  typeInto,
} from '../../../shared/testing/testUtils';
import { MOCK_ORDERS } from '../../orders/api/mockData';
import type { WorkOrder } from '../../orders/types';
import { jobCardsApi } from '../api/mockJobCardsApi';
import { jobCardActions } from '../store/jobCardsSlice';
import { MOCK_JOB_CARDS } from '../api/mockData';
import type { JobCard, JobOperation } from '../types';
import {
  canPauseOrComplete,
  canStart,
  completeOperation,
  currentOperation,
  flowSteps,
  initialFlowSteps,
  jobCardFromOrder,
  jobCardStage,
  stageMeta,
  startBlockedReason,
  jobProgress,
  nextJobCardNumber,
  reopenOperation,
  routeInput,
  optionsFrom,
  pauseOperation,
  progressTone,
  startOperation,
  statusFor,
  stepStatus,
} from '../utils';

let mockWidth = 1280;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 900, scale: 1, fontScale: 1 }),
}));

beforeEach(() => {
  mockWidth = 1280;
});
afterEach(() => jest.restoreAllMocks());

const cardById = (id: string) =>
  MOCK_JOB_CARDS.find(c => c.id === id) as JobCard;

const op = (
  status: JobOperation['status'],
  name = 'Drilling',
): JobOperation => ({
  id: `${name}-${status}`,
  name,
  machine: 'M-1',
  operator: 'Ravi Kumar',
  status,
  startedAt: status === 'pending' ? null : '2026-09-25T09:00:00',
  completedAt: status === 'completed' ? '2026-09-25T10:00:00' : null,
});

describe('job card rules', () => {
  test('progress counts completed steps fully and a started step half', () => {
    expect(jobProgress(cardById('1040'))).toBe(90);
    expect(jobProgress(cardById('1035'))).toBe(100);
    expect(jobProgress(cardById('1036'))).toBe(0);
    expect(progressTone(30)).toBe('warning');
    expect(progressTone(65)).toBe('info');
    expect(progressTone(100)).toBe('success');
  });

  test('status follows the operations', () => {
    expect(statusFor([])).toBe('not_started');
    expect(statusFor([op('pending')])).toBe('not_started');
    expect(statusFor([op('completed'), op('pending')])).toBe('in_progress');
    expect(statusFor([op('completed'), op('paused')])).toBe('paused');
    expect(statusFor([op('running')])).toBe('in_progress');
    expect(statusFor([op('completed')])).toBe('completed');
  });

  test('current operation is the started step, else the next, else the last', () => {
    expect(currentOperation(cardById('1042'))?.name).toBe('Turning (Lathe)');
    expect(currentOperation(cardById('1035'))?.name).toBe('Packing');
    expect(currentOperation(cardById('1036'))).toBeUndefined();
  });

  test('start, pause, resume and complete move through the route', () => {
    const now = '2026-10-01T11:00:00';
    let card: JobCard = { ...cardById('1042') };
    expect(canStart(card)).toBe(false);
    expect(canPauseOrComplete(card)).toBe(true);

    card = { ...card, ...pauseOperation(card) };
    expect(card.status).toBe('paused');
    expect(canStart(card)).toBe(true);

    card = { ...card, ...startOperation(card, now) };
    const turning = card.operations[2];
    expect(turning.status).toBe('running');
    // Resuming keeps the original start time.
    expect(turning.startedAt).toBe('2026-09-25T10:25:00');

    card = { ...card, ...completeOperation(card, now) };
    expect(card.operations[2]).toMatchObject({
      status: 'completed',
      completedAt: now,
    });
    expect(card.status).toBe('in_progress');

    card = { ...card, ...startOperation(card, now) };
    expect(card.operations[3]).toMatchObject({
      name: 'Deburring',
      status: 'running',
      startedAt: now,
    });
  });

  test('completing the last step completes the card', () => {
    const card: JobCard = {
      ...cardById('1042'),
      operations: [op('completed'), op('running', 'Packing')],
    };
    expect(completeOperation(card, 'now').status).toBe('completed');
  });

  test('saving a flow keeps progress on unchanged and started steps', () => {
    const card = cardById('1042');
    const steps = initialFlowSteps(card, 3);
    expect(steps).toHaveLength(6);
    expect(stepStatus(steps[0], true)).toBe('completed');
    expect(stepStatus(steps[2], true)).toBe('current');
    expect(stepStatus(steps[3], true)).toBe('upcoming');
    expect(stepStatus(steps[3], false)).toBe('draft');

    const edited = [
      ...steps.slice(0, 2),
      { ...steps[2], name: 'CNC Turning' },
      { ...steps[3], name: 'Drilling' },
      { key: 'x', name: 'Packing' },
    ];
    // Saved steps keep their ids; the server keeps their progress.
    const steps2 = flowSteps(edited);
    expect(steps2[0]).toEqual({ id: '1042-op1', name: 'Cutting' });
    expect(steps2[4]).toEqual({ name: 'Packing' });
    const { operations, status } = routeInput(card, steps2);
    expect(operations[0]).toEqual(card.operations[0]);
    expect(operations[2]).toMatchObject({
      name: 'CNC Turning',
      status: 'running',
      machine: 'CNC-02',
    });
    expect(operations[3]).toMatchObject({
      id: '1042-op4',
      name: 'Drilling',
      status: 'pending',
    });
    expect(operations[4]).toMatchObject({ name: 'Packing', status: 'pending' });
    expect(status).toBe('in_progress');
  });

  test('a card without a flow starts with blank steps', () => {
    const steps = initialFlowSteps(cardById('1036'), 3);
    expect(steps.map(s => s.name)).toEqual(['', '', '']);
  });

  test('filter options are distinct and sorted after "All"', () => {
    expect(optionsFrom(['b', 'a', 'b', ''], 'All').map(o => o.label)).toEqual([
      'All',
      'a',
      'b',
    ]);
  });
});

test('a new job card takes the order’s material source', () => {
  const order = MOCK_ORDERS.find(o => o.id === '1042') as WorkOrder;
  expect(
    jobCardFromOrder({ ...order, materialSource: 'in_house' }),
  ).toMatchObject({ materialSource: 'in_house' });
  expect(
    jobCardFromOrder({ ...order, materialSource: '' }).materialSource,
  ).toBe('');
});

describe('job card stage', () => {
  const step = (id: string, status: JobOperation['status']): JobOperation => ({
    id,
    name: id,
    machine: '',
    operator: '',
    status,
    startedAt: null,
    completedAt: null,
  });
  const qc = (operationId: string, result: 'passed' | 'failed') => ({
    id: `qc-${operationId}-${result}`,
    stage: 'QC',
    result,
    remark: '',
    at: '2026-09-25',
    operationId,
  });
  const card = (changes: Partial<JobCard>): JobCard => ({
    ...cardById('1042'),
    materialQc: 'accepted',
    billing: 'not_invoiced',
    qcHistory: [],
    operations: [],
    ...changes,
  });
  const flow = (...ops: JobOperation[]) => ({ operations: ops });
  const twoDone = flow(
    step('Turning', 'completed'),
    step('Drilling', 'completed'),
  );
  const firstDone = flow(
    step('Turning', 'completed'),
    step('Drilling', 'pending'),
  );

  test.each<[string, Partial<JobCard>]>([
    ['RM received', { materialQc: 'pending' }],
    ['RM QC failed', { materialQc: 'rejected' }],
    ['RM QC passed', {}],
    [
      'Yet to start',
      flow(step('Turning', 'pending'), step('Drilling', 'pending')),
    ],
    ['Turning', flow(step('Turning', 'running'), step('Drilling', 'pending'))],
    ['Turning (paused)', flow(step('Turning', 'paused'))],
    ['Turning QC', firstDone],
    [
      'Turning QC failed',
      { ...firstDone, qcHistory: [qc('Turning', 'failed')] },
    ],
    [
      'Drilling (up next)',
      { ...firstDone, qcHistory: [qc('Turning', 'passed')] },
    ],
    ['Final QC', twoDone],
    [
      'Ready to dispatch',
      { ...twoDone, qcHistory: [qc('Drilling', 'passed')] },
    ],
    ['Done', { ...twoDone, billing: 'invoiced' }],
  ])('%s', (expected, changes) => {
    expect(stageMeta(jobCardStage(card(changes))).label).toBe(expected);
  });

  test('the next step waits for RM QC and the last step’s QC', () => {
    const waiting = card(firstDone);
    expect(canStart(waiting)).toBe(false);
    expect(startBlockedReason(waiting)).toBe('Waiting for Turning QC');
    expect(canStart({ ...waiting, qcHistory: [qc('Turning', 'passed')] })).toBe(
      true,
    );
    expect(
      startBlockedReason(
        card({ materialQc: 'pending', ...flow(step('Turning', 'pending')) }),
      ),
    ).toBe('Waiting for RM QC');
    // A paused step can always resume.
    expect(
      canStart(
        card(flow(step('Turning', 'completed'), step('Drilling', 'paused'))),
      ),
    ).toBe(true);
  });
});

describe('job card numbers', () => {
  test('seeded cards are JOB1, JOB2…; a new card gets the next number', async () => {
    expect(MOCK_JOB_CARDS.map(c => c.code).slice(0, 3)).toEqual([
      'JOB1',
      'JOB2',
      'JOB3',
    ]);
    expect(nextJobCardNumber([{ code: 'JOB2' }, { code: 'JOB9' }])).toBe(10);
    expect(nextJobCardNumber([])).toBe(1);

    jobCardsApi.reset();
    const created = await jobCardsApi.create({
      ...cardById('1042'),
      id: '2001',
      code: '',
    });
    expect(created.code).toBe(`JOB${MOCK_JOB_CARDS.length + 1}`);
    jobCardsApi.reset();
  });
});

describe('Job Cards list', () => {
  test('table shows each card with its status and progress', async () => {
    const { root } = await renderAdmin('JobCards');
    const text = allText(byTestId(root, 'job-cards-table'));
    // Status, not the current operation, after the part name.
    expect(text).toMatch(/Part name\|Status\|Assigned machine/);
    expect(text).not.toContain('Current operation');
    expect(allText(byTestId(root, 'job-card-stage-1036'))).toBe('RM received');
    expect(allText(byTestId(root, 'job-card-stage-1035'))).toBe('Done');
    expect(text).toContain('WO #1042');
    expect(text).toContain('Bracket — Job A');
    expect(text).toContain('Turning (Lathe)');
    expect(text).toContain('CNC-02');
    expect(text).toContain('Arun Prakash');
    expect(allText(byTestId(root, 'progress-1040'))).toContain('90%');
    expect(allText(root)).toContain('Showing 10 of 10 job cards');
    // Completed work sorts last.
    expect(text.indexOf('WO #1035')).toBeGreaterThan(text.indexOf('WO #1034'));
  });

  test('multi-select filter by operation, operator and machine, and search', async () => {
    const { root } = await renderAdmin('JobCards');
    const panel = () => byTestId(root, 'job-cards-filter-panel');
    const tab = (label: string) =>
      panel().find(
        n =>
          n.props.accessibilityRole === 'tab' &&
          n.props.onPress &&
          allText(n).startsWith(label),
      );
    const filter = async (group: string, options: string[]) => {
      await press(byTestId(root, 'job-cards-filter'));
      await press(byText(panel(), 'Clear all'));
      await press(tab(group));
      for (const option of options) {
        await press(byLabel(panel(), option));
      }
      await press(byTestId(root, 'job-cards-filter-apply'));
    };

    await filter('Operation', ['QC Inspection']);
    expect(allText(root)).toContain('Showing 2 of 2 job cards');
    // Two operations at once.
    await filter('Operation', ['QC Inspection', 'Welding']);
    expect(allText(root)).toContain('Showing 4 of 4 job cards');
    await filter('Operator', ['Karthik Iyer']);
    expect(allText(root)).toContain('Showing 1 of 1 job cards');
    await filter('Assigned machine', ['CNC-02']);
    let text = allText(byTestId(root, 'job-cards-table'));
    expect(text).toContain('Showing 2 of 2 job cards');
    expect(text).toContain('WO #1042');
    expect(text).toContain('WO #1039');
    await filter('Operator', []);
    await typeInto(
      byLabel(root, 'Search by job ID, WO #, part or operator'),
      'coupling',
    );
    expect(allText(byTestId(root, 'job-cards-table'))).toContain('WO #1036');
    expect(allText(root)).toContain('Showing 1 of 1 job cards');
  });

  test('wide screens: only the rows scroll; title and pagination stay', async () => {
    const { root } = await renderAdmin('JobCards');
    const table = byTestId(root, 'job-cards-table');
    const scroll = byTestId(table, 'job-cards-table-scroll');
    expect(allText(scroll)).toContain('WO #1042');
    expect(allText(scroll)).not.toContain('Showing 10 of 10 job cards');
    expect(allText(table)).toContain('Showing 10 of 10 job cards');
    expect(allText(table)).toContain('Job Cards');
  });

  test('the diagram button opens the full drawing', async () => {
    const { root } = await renderAdmin('JobCards');
    await press(byLabel(root, 'Open drawing for WO #1042'));
    // Numbered by the order's drawing number.
    expect(allText(root)).toContain('Drawing DRW-1187');
    await press(byLabel(root, 'Close'));
    expect(allText(root)).not.toContain('Drawing DRW-1187');
  });

  test('plus opens the job card with Create flow open', async () => {
    const h = await renderAdmin('JobCards');
    await press(byLabel(h.root, 'Create flow for WO #1036'));
    expect(h.currentRoute()).toBe('JobCardDetails');
    expect(allText(byTestId(h.root, 'job-card-machining'))).toMatch(
      /^Create flow/,
    );
  });

  test('pencil opens the job card with Edit flow open', async () => {
    const h = await renderAdmin('JobCards');
    await press(byLabel(h.root, 'Edit flow for WO #1042'));
    expect(h.currentRoute()).toBe('JobCardDetails');
    expect(allText(byTestId(h.root, 'job-card-machining'))).toMatch(
      /^Edit flow/,
    );
  });

  test('phone shows cards with the table details, drawing thumbnail and actions', async () => {
    mockWidth = 390;
    const h = await renderAdmin('JobCards');
    // No stat tiles on phones.
    expect(hasTestId(h.root, 'stat-active')).toBe(false);
    const card = byTestId(h.root, 'job-card-1042');
    const text = allText(card);
    [
      '#JOB1',
      'Bracket — Job A',
      'WO #1042',
      'Assigned machine',
      'CNC-02',
      'Operator',
      'Arun Prakash',
      'Progress',
      '42%',
      'Turning (Lathe)',
      'High',
    ].forEach(part => expect(text).toContain(part));
    // RM QC failed shows once: it's the status itself.
    const failed = allText(byTestId(h.root, 'job-card-1041'));
    expect(failed.split('RM QC failed').length - 1).toBe(1);
    // No View button: the card opens it; flow and Delete as in the table.
    expect(() => byLabel(card, 'View job card WO #1042')).toThrow();
    expect(byLabel(card, 'Edit flow for WO #1042')).toBeTruthy();
    expect(byLabel(card, 'Cancel job card WO #1042')).toBeTruthy();
    // The thumbnail opens the drawing.
    await press(byLabel(card, 'Open drawing for WO #1042'));
    expect(h.currentRoute()).toBe('JobCards');
    await press(card);
    expect(hasTestId(h.root, 'job-card-details-screen')).toBe(true);
  });

  test('phone details: tabs, Dispatch in the header, sticky operation bar', async () => {
    mockWidth = 390;
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1042' });
    const screen = byTestId(h.root, 'job-card-details-screen');
    // Swipeable tabs, Machining first.
    expect(h.currentRoute()).toBe('machining');
    expect(hasTestId(screen, 'job-card-tab-qc')).toBe(true);
    expect(hasTestId(screen, 'job-card-tab-order')).toBe(true);
    // The bottom bar, not the tab, holds two buttons: Pause while a step
    // runs (Start otherwise), and Complete.
    const bar = () => byTestId(screen, 'job-card-operation-bar');
    expect(allText(bar())).toBe('Pause|Complete');
    const machining = byTestId(screen, 'job-card-tab-page-machining');
    expect(hasTestId(machining, 'pause-operation')).toBe(false);
    await press(byTestId(bar(), 'pause-operation'));
    await press(byLabel(byTestId(h.root, 'pause-step-dialog'), 'Break'));
    await press(byTestId(h.root, 'pause-step-submit'));
    expect(
      h.store
        .getState()
        .jobCards.entities['1042'].operations.some(o => o.status === 'paused'),
    ).toBe(true);
    expect(allText(bar())).toBe('Start|Complete');
    // Generate Dispatch is the header's only action.
    const dispatch = screen.findAll(
      n => typeof n.type === 'string' && n.props.testID === 'generate-dispatch',
    );
    expect(dispatch).toHaveLength(1);
    expect(dispatch[0].props.accessibilityLabel).toBe('Generate Dispatch');
    await press(byTestId(h.root, 'job-card-tab-qc'));
    expect(h.currentRoute()).toBe('qc');
  });
});

describe('Job Cards list actions', () => {
  test('rows have flow and delete buttons, not view', async () => {
    const h = await renderAdmin('JobCards');
    expect(() => byLabel(h.root, 'View job card WO #1042')).toThrow();
    expect(byLabel(h.root, 'Edit flow for WO #1042')).toBeTruthy();
    expect(byLabel(h.root, 'Create flow for WO #1036')).toBeTruthy();
    expect(byLabel(h.root, 'Cancel job card WO #1042')).toBeTruthy();
  });

  test('cancel (no deleting) asks first, and only before any step starts', async () => {
    const h = await renderAdmin('JobCards');
    // Work has begun on 1042: it can't be cancelled.
    expect(
      byLabel(h.root, 'Cancel job card WO #1042').props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await press(byLabel(h.root, 'Cancel job card WO #1036'));
    expect(allText(h.root)).toContain('Cancel job card?');

    // Cancel keeps it.
    const cancel = h.root.findAll(
      n =>
        typeof n.type === 'string' && n.props.accessibilityLabel === 'Cancel',
    );
    await press(cancel[cancel.length - 1]);
    expect(allText(h.root)).toContain('WO #1036');

    await press(byLabel(h.root, 'Cancel job card WO #1036'));
    const confirm = h.root.findAll(
      n =>
        typeof n.type === 'string' &&
        n.props.accessibilityLabel === 'Cancel job card',
    );
    await press(confirm[confirm.length - 1]);
    expect(allText(h.root)).not.toContain('WO #1036');
    // Confirming doesn't count as a row click.
    expect(h.currentRoute()).not.toBe('JobCardDetails');
  });
});

describe('Job card details', () => {
  test('one card: back, title and actions on top; Machining, QC and Order details tabs', async () => {
    const h = await renderAdmin('JobCards');
    // Clicking anywhere on the row opens the job card.
    await press(byText(h.root, 'Bracket — Job A'));
    const screen = byTestId(h.root, 'job-card-details-screen');
    const text = allText(screen);
    // The job card number leads; the work order sits small beneath it.
    expect(text).toContain('#JOB1 · Acme Metalworks');
    expect(allText(byTestId(screen, 'job-card-wo'))).toBe('WO #1042');
    // Its status is the step under way.
    expect(allText(byTestId(screen, 'job-card-stage-1042'))).toBe(
      'Turning (Lathe)',
    );
    // Generate Dispatch is the only action; no Print Job Card.
    expect(text).toContain('Generate Dispatch');
    expect(text).not.toContain('Print Job Card');
    // Machining, QC, then Order details; Machining opens first.
    expect(text).toMatch(/\|Machining\|QC\|Order details\|/);
    expect(
      byTestId(screen, 'job-card-tab-machining').props.accessibilityState,
    ).toMatchObject({ selected: true });
    // The priority sits by the title.
    expect(allText(byTestId(screen, 'job-card-wo'))).toBe('WO #1042');
    expect(text).toMatch(/WO #1042\|High priority\|Turning \(Lathe\)/);

    // Machining: the drawing and Order QR, then all the job's details, above
    // the route card.
    const overview = byTestId(screen, 'job-card-overview');
    expect(allText(overview)).toMatch(/Drawing\|.*DRW-1187.*\|Order QR/);
    expect(byLabel(overview, 'QR code for WO #1042')).toBeTruthy();
    expect(allText(byTestId(screen, 'job-card-facts'))).toBe(
      [
        'Part|Bracket',
        'Due date|02 Oct 2026',
        'Quantity|200 pcs',
        'Material QC|Accepted',
        'Design approval|Approved',
      ].join('|'),
    );
    // The drawing opens full size.
    await press(byLabel(screen, 'View drawing DRW-1187'));
    expect(allText(h.root)).toContain('Drawing DRW-1187');
    await press(byLabel(h.root, 'Close'));

    // Order details: only the order, as one card.
    await press(byTestId(screen, 'job-card-tab-order'));
    expect(hasTestId(screen, 'job-card-overview')).toBe(false);
    expect(allText(byTestId(screen, 'job-card-order-tab'))).toMatch(
      /^Order\|WO #1042/,
    );
    expect(allText(byTestId(screen, 'job-card-order'))).toBe(
      'WO #1042 · Bracket — Job A|Acme Metalworks · PO-8842 · Due 02 Oct 2026|In progress',
    );
    expect(text).not.toContain('DC-5561');
    expect(hasTestId(screen, 'overall-progress')).toBe(false);
    expect(hasTestId(screen, 'qc-history')).toBe(false);

    await press(byTestId(screen, 'job-card-tab-machining'));
    expect(allText(byTestId(screen, 'overall-progress'))).toContain('42%');

    // Every step is listed; only the current one starts open (and highlighted).
    const step = (id: string) => byTestId(screen, `operation-1042-${id}`);
    expect(allText(step('op1'))).toContain('Cutting');
    expect(allText(step('op1'))).not.toContain('Saw-01');
    expect(step('op1').props.accessibilityState).toMatchObject({
      selected: false,
      expanded: false,
    });
    expect(step('op3').props.accessibilityState).toMatchObject({
      selected: true,
      expanded: true,
    });

    // Each step opens and closes on its own.
    for (const id of ['op1', 'op4', 'op5']) {
      await press(step(id));
    }
    expect(step('op1').props.accessibilityState).toMatchObject({
      expanded: true,
    });
    await press(step('op3'));
    expect(step('op3').props.accessibilityState).toMatchObject({
      selected: true,
      expanded: false,
    });
    await press(step('op3'));
    expect(allText(byTestId(screen, 'operation-1042-op1'))).toContain(
      'Saw-01 · Meena Lakshmi',
    );
    expect(allText(byTestId(screen, 'operation-1042-op1'))).toContain(
      'Completed at: 09:45 AM',
    );
    expect(allText(byTestId(screen, 'operation-1042-op3'))).toContain(
      'Started at: 10:25 AM',
    );
    expect(allText(byTestId(screen, 'operation-1042-op4'))).toContain(
      'Next operation',
    );
    expect(allText(byTestId(screen, 'operation-1042-op5'))).toContain(
      'Upcoming',
    );

    await press(byTestId(screen, 'job-card-tab-qc'));
    expect(hasTestId(screen, 'overall-progress')).toBe(false);
    expect(allText(byTestId(screen, 'job-card-material-qc'))).toContain(
      'Accepted',
    );
    const qc = allText(byTestId(screen, 'qc-history'));
    expect(qc).toContain('Facing - QC');
    expect(qc).toContain('Passed');
    expect(qc).toContain('Voice + text note');
  });

  test('QC history has a Report column: open an uploaded report, or upload one', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1042' });
    const screen = () => byTestId(h.root, 'job-card-details-screen');
    await press(byTestId(screen(), 'job-card-tab-qc'));
    const table = () => allText(byTestId(screen(), 'qc-history'));
    expect(table()).toMatch(/Stage\|Result\|Remark\|QC by\|Date\|Report/);
    // Who did each check.
    expect(table()).toContain(
      'Material QC|Accepted|Voice + text note|Suresh Babu',
    );
    expect(table()).toContain('Facing - QC|Passed|—|Divya Rao');

    // Material QC already has its report; it opens from the row.
    expect(allText(byTestId(screen(), 'qc-report-qc1'))).toBe(
      'material-qc-report.pdf',
    );
    await press(byTestId(screen(), 'qc-report-qc1'));
    expect(alert).toHaveBeenCalledTimes(1);

    // Facing - QC has none yet: Upload attaches the picked file.
    expect(hasTestId(screen(), 'qc-report-qc2')).toBe(false);
    await press(byLabel(screen(), 'Upload QC report for Facing - QC'));
    const qc2 = h.store
      .getState()
      .jobCards.entities['1042'].qcHistory.find(e => e.id === 'qc2');
    expect(qc2?.report).toMatchObject({
      name: 'qc-report.pdf',
      kind: 'QC report',
    });
    expect(allText(byTestId(screen(), 'qc-report-qc2'))).toBe('qc-report.pdf');
    expect(hasTestId(screen(), 'qc-report-upload-qc2')).toBe(false);
  });

  test('phone: tapping a QC report shows its details in a sheet', async () => {
    mockWidth = 390;
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1042' });
    const screen = () => byTestId(h.root, 'job-card-details-screen');
    await press(byTestId(screen(), 'job-card-tab-qc'));
    await press(byTestId(screen(), 'qc-report-qc1'));

    // The file, then the check it belongs to.
    const sheet = byTestId(h.root, 'qc-report-sheet');
    expect(allText(sheet)).toMatch(
      /^QC report\|material-qc-report\.pdf\|QC report · .+\|Stage\|Material QC\|Result\|Accepted\|QC by\|Suresh Babu\|Date\|.+\|Remark\|Voice \+ text note$/,
    );
    // Phones can't open files yet, so there's no Open button.
    expect(hasTestId(sheet, 'qc-report-open')).toBe(false);
  });

  test('quick actions pause (with a reason), resume, then complete the running step', async () => {
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1042' });
    const screen = () => byTestId(h.root, 'job-card-details-screen');
    const disabled = (id: string) =>
      byTestId(screen(), id).props.accessibilityState.disabled;
    await press(byTestId(screen(), 'job-card-tab-machining'));
    // A step is already running, so only Pause and Complete apply.
    expect(disabled('start-operation')).toBe(true);
    expect(disabled('pause-operation')).toBe(false);
    expect(disabled('complete-operation')).toBe(false);

    // Pause asks why; "Other" needs the details.
    await press(byTestId(screen(), 'pause-operation'));
    const pauseDialog = () => byTestId(h.root, 'pause-step-dialog');
    await press(byTestId(pauseDialog(), 'pause-step-submit'));
    expect(allText(pauseDialog())).toContain('This field is required');
    await press(byLabel(pauseDialog(), 'Tool change'));
    await press(byTestId(pauseDialog(), 'pause-step-submit'));
    expect(h.store.getState().jobCards.entities['1042'].status).toBe('paused');
    expect(allText(byTestId(screen(), 'operation-1042-op3'))).toContain(
      'Paused',
    );
    // Start resumes it on its machine; nothing to complete while paused.
    expect(disabled('start-operation')).toBe(false);
    expect(disabled('complete-operation')).toBe(true);
    await press(byTestId(screen(), 'start-operation'));
    expect(
      h.store.getState().jobCards.entities['1042'].operations[2].status,
    ).toBe('running');

    // Complete accounts for every piece the step started with.
    await press(byTestId(screen(), 'complete-operation'));
    const dialog = () => byTestId(h.root, 'complete-step-dialog');
    expect(allText(dialog())).toContain('Account for all 200 pieces');
    await typeInto(byTestId(dialog(), 'complete-step-scrap'), '5');
    await press(byTestId(dialog(), 'complete-step-submit'));
    expect(allText(dialog())).toContain(
      'These add up to 205; they must add up to 200.',
    );
    await typeInto(byTestId(dialog(), 'complete-step-good'), '195');
    await press(byTestId(dialog(), 'complete-step-submit'));
    const ops = h.store.getState().jobCards.entities['1042'].operations;
    expect(ops[2].status).toBe('completed');
    expect(ops[3].status).toBe('pending');
    // Only that step: the next one waits for its QC check.
    expect(allText(byTestId(screen(), 'job-card-stage-1042'))).toBe(
      'Turning (Lathe) QC',
    );
    expect(disabled('start-operation')).toBe(true);
    expect(disabled('complete-operation')).toBe(true);
  });

  test('a step that failed its QC is redone: Redo starts it again on a machine', async () => {
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1042' });
    // Turning finished, then failed its QC check: the server reopens it.
    const card = h.store.getState().jobCards.entities['1042'];
    const done = { ...card, ...completeOperation(card, '2026-09-25T11:00:00') };
    await act(async () => {
      h.store.dispatch(
        jobCardActions.saveSuccess({
          ...done,
          ...reopenOperation(done, '1042-op3'),
          qcHistory: [
            ...card.qcHistory,
            {
              id: 'qc3',
              kind: 'machine',
              stage: 'Turning - QC',
              result: 'failed',
              remark: 'Oversize',
              at: '2026-09-25',
              operationId: '1042-op3',
            },
          ],
        }),
      );
    });
    const screen = () => byTestId(h.root, 'job-card-details-screen');
    expect(allText(byTestId(screen(), 'job-card-stage-1042'))).toBe(
      'Redo Turning (Lathe)',
    );
    expect(
      h.store.getState().jobCards.entities['1042'].operations[2],
    ).toMatchObject({ status: 'pending', isRework: true });

    // Redo picks the operator and an idle machine, then starts it.
    await press(byTestId(screen(), 'redo-operation'));
    const dialog = () => byTestId(h.root, 'start-step-dialog');
    expect(allText(dialog())).toContain('Start Turning (Lathe)');
    await choose(h.root, 'start-step-operator', 'Ravi Kumar');
    await choose(h.root, 'start-step-machine', 'Manual Lathe 1 · LATHE-01');
    await press(byTestId(dialog(), 'start-step-submit'));
    expect(
      h.store.getState().jobCards.entities['1042'].operations[2],
    ).toMatchObject({
      status: 'running',
      machine: 'LATHE-01',
      operator: 'Ravi Kumar',
    });
  });

  test('dispatch asks to confirm, then bills the job from its operations', async () => {
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1042' });
    const billed = () =>
      Object.values(h.store.getState().billing.invoices.entities).find(
        i => i?.jobId === 'WO-01042',
      );

    // Just a confirmation: no quotes to pick from.
    await press(byTestId(h.root, 'generate-dispatch'));
    const modal = allText(byTestId(h.root, 'dispatch-modal'));
    expect(modal).toContain('Dispatch this order?');
    expect(modal).toContain(
      'WO-01042 goes to billing as a new invoice for Acme Metalworks',
    );
    expect(modal).not.toContain('QT-2026-0040');
    expect(modal).not.toContain('No quote');

    // Cancel bills nothing.
    await press(byText(byTestId(h.root, 'dispatch-modal'), 'Cancel'));
    expect(billed()).toBeUndefined();

    await press(byTestId(h.root, 'generate-dispatch'));
    await press(byText(byTestId(h.root, 'dispatch-modal'), 'Dispatch'));

    // The new invoice opens in edit mode to fill in the rates.
    expect(h.currentRoute()).toBe('InvoiceDetails');
    expect(hasTestId(h.root, 'save-invoice')).toBe(true);
    expect(billed()).toMatchObject({
      customerName: 'Acme Metalworks',
      quoteId: null,
      status: 'new',
      quantity: 200,
      // The order's PO amount, fixed on the invoice.
      poAmount: h.store.getState().orders.entities['1042'].poAmount,
    });
    expect(billed()?.poAmount).not.toBeNull();
    expect(billed()?.lineItems.length).toBeGreaterThan(0);
    // No quote is attached to the order.
    expect(
      h.store.getState().billing.quotes.entities['QT-2026-0040']?.orderId,
    ).toBeFalsy();
    // Dispatched: the job card is Done; Back returns to it.
    expect(h.store.getState().jobCards.entities['1042'].billing).toBe(
      'invoiced',
    );
    expect(allText(byTestId(h.root, 'invoice-back'))).toBe('Back to job card');
    await press(byTestId(h.root, 'invoice-back'));
    expect(h.currentRoute()).toBe('JobCardDetails');
  });

  test('dispatch lists the job’s operations to price; a billed job opens its invoice', async () => {
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1039' });
    await press(byTestId(h.root, 'generate-dispatch'));
    await press(byText(byTestId(h.root, 'dispatch-modal'), 'Dispatch'));

    expect(h.currentRoute()).toBe('InvoiceDetails');
    const invoice = Object.values(
      h.store.getState().billing.invoices.entities,
    ).find(i => i?.jobId === 'WO-01039');
    expect(invoice).toMatchObject({ quoteId: null, gstRate: 18 });
    expect(invoice?.lineItems.map(l => l.operation)).toEqual([
      'Cutting',
      'CNC Milling',
      'Drilling',
      'Deburring',
      'QC Inspection',
    ]);

    // Dispatching again offers the same invoice instead of a second one.
    await h.navigate('JobCardDetails', { jobCardId: '1039' });
    await press(byTestId(h.root, 'generate-dispatch'));
    const modal = byTestId(h.root, 'dispatch-modal');
    expect(allText(modal)).toContain(`already billed on ${invoice?.id}`);
    await press(byText(modal, 'Open invoice'));
    expect(h.currentRoute()).toBe('InvoiceDetails');
  });

  test('a card without a flow offers Create flow', async () => {
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1036' });
    const screen = byTestId(h.root, 'job-card-details-screen');
    await press(byTestId(screen, 'job-card-tab-machining'));
    expect(allText(screen)).toContain('No process flow yet');
    expect(allText(screen)).toContain('RM received');
    await press(byTestId(screen, 'open-flow'));
    expect(h.currentRoute()).toBe('JobCardDetails');
    expect(hasTestId(h.root, 'flow-editor')).toBe(true);
  });

  test('a rejected material shows what RM QC rejected; only supervisors re-initiate', async () => {
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1041' });
    const screen = byTestId(h.root, 'job-card-details-screen');
    await press(byTestId(screen, 'job-card-tab-qc'));
    const rejected = allText(byTestId(screen, 'rejected-material'));
    expect(rejected).toContain('Rejected material');
    expect(rejected).toContain('HT-99212');
    expect(hasTestId(screen, 'reinitiate-rm-qc')).toBe(false);
  });

  test('an unknown card says it no longer exists', async () => {
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: 'nope' });
    expect(allText(h.root)).toContain('This job card no longer exists.');
  });

  test('order details open this work order’s job card', async () => {
    const h = await renderAdmin('Orders');
    await h.navigate('OrderDetails', { orderId: '1042' });
    // Its Job card details tab lists the job card.
    await press(byTestId(h.root, 'order-tab-jobCard'));
    await press(byTestId(h.root, 'order-job-card-1042'));
    expect(h.currentRoute()).toBe('JobCardDetails');
    expect(allText(byTestId(h.root, 'job-card-details-screen'))).toContain(
      '#JOB1 · Acme Metalworks',
    );
  });
});

describe('Back returns to where the job card was opened from', () => {
  const back = (h: Awaited<ReturnType<typeof renderAdmin>>) =>
    byTestId(h.root, 'job-card-details-back');

  test('Job Cards list → Back to the list', async () => {
    const h = await renderAdmin('JobCards');
    await press(byText(h.root, 'Bracket — Job A'));
    expect(allText(back(h))).toBe('Back');
    await press(back(h));
    expect(h.currentRoute()).toBe('JobCards');
  });

  test('Dashboard → Back to dashboard', async () => {
    const h = await renderAdmin('Overview');
    await press(byTestId(h.root, 'priority-job-1042'));
    expect(h.currentRoute()).toBe('JobCardDetails');
    expect(allText(back(h))).toBe('Back to dashboard');
    await press(back(h));
    expect(h.currentRoute()).toBe('Dashboard');
    // The sidebar's Job Cards then opens on the list, not that card.
    await press(byLabel(h.root, 'Job Cards'));
    expect(h.currentRoute()).toBe('JobCards');
  });

  test('Orders list → Back to the Orders list, with or without a flow', async () => {
    const h = await renderAdmin('Orders');
    await press(byTestId(h.root, 'job-card-1042'));
    expect(h.currentRoute()).toBe('JobCardDetails');
    expect(allText(back(h))).toBe('Back');
    await press(back(h));
    expect(h.currentRoute()).toBe('Orders');

    // No flow yet: the job card opens with Create flow open; Back returns to
    // the Orders list too.
    await press(byLabel(h.root, 'Create job card for WO #1036'));
    expect(h.currentRoute()).toBe('JobCardDetails');
    expect(hasTestId(h.root, 'flow-editor')).toBe(true);
    await press(back(h));
    expect(h.currentRoute()).toBe('Orders');
  });

  test('Order details → Back to that order', async () => {
    const h = await renderAdmin('Orders');
    await h.navigate('OrderDetails', { orderId: '1042' });
    await press(byTestId(h.root, 'order-tab-jobCard'));
    await press(byTestId(h.root, 'order-job-card-1042'));
    expect(allText(back(h))).toBe('Back to order');
    await press(back(h));
    expect(h.currentRoute()).toBe('OrderDetails');
    expect(allText(byTestId(h.root, 'order-details-screen'))).toContain(
      'WO #1042',
    );
  });

  test('the order card opens the order; its Back returns to the job card', async () => {
    const h = await renderAdmin('JobCards');
    await press(byText(h.root, 'Bracket — Job A'));
    await press(byTestId(h.root, 'job-card-tab-order'));
    await press(byLabel(h.root, 'Open order WO #1042'));
    expect(h.currentRoute()).toBe('OrderDetails');
    // Slid in on the Job Cards stack: no jump to Orders.
    const stack = () =>
      h
        .navState()
        .routes.find(r => r.name === 'JobCards')
        ?.state?.routes.map(r => r.name);
    expect(stack()).toEqual(['JobCardsList', 'JobCardDetails', 'OrderDetails']);
    // Its job card link steps back rather than stacking another copy.
    await press(byTestId(h.root, 'order-tab-jobCard'));
    await press(byTestId(h.root, 'order-job-card-1042'));
    expect(stack()).toEqual(['JobCardsList', 'JobCardDetails']);
    await press(byTestId(h.root, 'job-card-tab-order'));
    await press(byLabel(h.root, 'Open order WO #1042'));
    const orderBack = byTestId(h.root, 'order-details-back');
    expect(allText(orderBack)).toBe('Back to job card');
    await press(orderBack);
    expect(h.currentRoute()).toBe('JobCardDetails');
    expect(allText(byTestId(h.root, 'job-card-details-screen'))).toContain(
      '#JOB1 · Acme Metalworks',
    );
  });

  test('Employee work history → Back to that employee’s work history', async () => {
    const h = await renderAdmin('Users');
    await h.navigate('UserDetails', { userId: 'USR-6' });
    await press(byTestId(h.root, 'user-section-work'));
    await press(byTestId(h.root, 'user-work-1042'));
    expect(allText(back(h))).toBe('Back to employee');
    await press(back(h));
    expect(h.currentRoute()).toBe('UserDetails');
    expect(hasTestId(h.root, 'user-work-history')).toBe(true);
  });
});

describe('Create / Edit flow, in place on the job card', () => {
  // Opens the job card and its flow editor, the way the lists' + / pencil do.
  const openEditor = async (jobCardId: string) => {
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId, editFlow: true });
    const screen = () => byTestId(h.root, 'job-card-details-screen');
    return { h, screen };
  };

  test('create needs every step chosen, then saves the flow', async () => {
    const { h, screen } = await openEditor('1036');
    // Same screen: the job card's header stays, Save sits at the top.
    expect(allText(screen())).toContain('#JOB7 · Bright Steel Co.');
    expect(allText(byTestId(screen(), 'job-card-machining'))).toMatch(
      /^Create flow\|Cancel\|Create\|/,
    );
    expect(hasTestId(screen(), 'flow-step-3')).toBe(true);

    await press(byTestId(screen(), 'flow-submit'));
    expect(allText(screen()).split('This field is required').length - 1).toBe(
      3,
    );

    await press(byLabel(screen(), 'Remove step 3'));
    await choose(h.root, 'flow-step-1-operation', 'Cutting');
    await choose(h.root, 'flow-step-2-operation', 'CNC Turning');
    await press(byTestId(screen(), 'add-process'));
    await choose(h.root, 'flow-step-3-operation', 'Packing');
    await press(byTestId(screen(), 'flow-submit'));

    const card = h.store.getState().jobCards.entities['1036'];
    expect(card.operations.map(o => o.name)).toEqual([
      'Cutting',
      'CNC Turning',
      'Packing',
    ]);
    expect(card.operations.every(o => o.status === 'pending')).toBe(true);
    // Opened from the list to edit: saving returns straight to the list.
    expect(h.currentRoute()).toBe('JobCards');
  });

  test('removing every step asks for at least one', async () => {
    const { h, screen } = await openEditor('1036');
    for (let i = 3; i >= 1; i -= 1) {
      await press(byLabel(screen(), `Remove step ${i}`));
    }
    await press(byTestId(screen(), 'flow-submit'));
    expect(allText(screen())).toContain('Add at least one operation');
    expect(h.store.getState().jobCards.entities['1036'].operations).toEqual([]);
  });

  test('Edit flow shows saved step names that are not in the operation list', async () => {
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1042' });
    // The server's default route names steps like "Finishing".
    const card = h.store.getState().jobCards.entities['1042'];
    const operations = card.operations.map((o, i, all) =>
      i === all.length - 1 ? { ...o, name: 'Finishing' } : o,
    );
    await act(async () => {
      h.store.dispatch(jobCardActions.saveSuccess({ ...card, operations }));
    });
    const screen = () => byTestId(h.root, 'job-card-details-screen');
    await press(byTestId(screen(), 'open-flow'));
    const last = byTestId(screen(), `flow-step-${operations.length}`);
    expect(allText(last)).toContain('Finishing');
    expect(allText(last)).not.toContain('Select operation');
  });

  test('Edit flow on the Machining tab locks completed steps and saves the rest', async () => {
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1042' });
    const screen = () => byTestId(h.root, 'job-card-details-screen');
    await press(byTestId(screen(), 'open-flow'));
    const text = allText(screen());
    expect(text).toMatch(/Edit flow\|Cancel\|Save changes/);
    expect(text).toContain('Steps already started are locked.');
    expect(text).toContain('In progress');
    expect(text).toContain('Upcoming');
    expect(byLabel(byTestId(screen(), 'flow-step-1'), 'Locked')).toBeTruthy();

    await press(byLabel(screen(), 'Remove step 6'));
    await choose(h.root, 'flow-step-5-operation', 'Packing');
    await press(byTestId(screen(), 'flow-submit'));

    const ops = h.store.getState().jobCards.entities['1042'].operations;
    expect(ops.map(o => o.name)).toEqual([
      'Cutting',
      'Facing (Lathe)',
      'Turning (Lathe)',
      'Deburring',
      'Packing',
    ]);
    expect(ops[0].status).toBe('completed');
    expect(ops[2].status).toBe('running');
    expect(hasTestId(screen(), 'flow-editor')).toBe(false);
  });

  test('cancel leaves the flow unchanged and returns straight to the list', async () => {
    const { h, screen } = await openEditor('1042');
    await press(byLabel(screen(), 'Remove step 6'));
    await press(byTestId(screen(), 'flow-cancel'));
    expect(
      h.store.getState().jobCards.entities['1042'].operations,
    ).toHaveLength(6);
    expect(h.currentRoute()).toBe('JobCards');
  });

  test('opened on the job card itself, cancel shows the route card again', async () => {
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1042' });
    const screen = () => byTestId(h.root, 'job-card-details-screen');
    await press(byLabel(screen(), 'Edit flow'));
    await press(byTestId(screen(), 'flow-cancel'));
    expect(h.currentRoute()).toBe('JobCardDetails');
    expect(hasTestId(screen(), 'flow-editor')).toBe(false);
    expect(allText(byTestId(screen(), 'overall-progress'))).toContain('42%');
  });

  test('the list’s + and pencil open the job card with the editor open', async () => {
    const h = await renderAdmin('JobCards');
    await press(byLabel(h.root, 'Create flow for WO #1036'));
    expect(h.currentRoute()).toBe('JobCardDetails');
    expect(hasTestId(h.root, 'flow-editor')).toBe(true);
    await press(byTestId(h.root, 'job-card-details-back'));
    await press(byLabel(h.root, 'Edit flow for WO #1042'));
    expect(allText(byTestId(h.root, 'job-card-machining'))).toMatch(
      /^Edit flow/,
    );
  });

  test('wide screens: the Machining tab scrolls as one; the flow editor keeps Save on top and Add process at the bottom', async () => {
    const h = await renderAdmin('JobCards');
    await h.navigate('JobCardDetails', { jobCardId: '1042' });
    const pane = () => byTestId(h.root, 'job-card-machining');
    const scroll = () => byTestId(h.root, 'job-card-machining-scroll');
    // Drawing, QR, facts and route card all scroll together in the tab.
    const tabScroll = byTestId(h.root, 'job-card-details-scroll');
    expect(hasTestId(tabScroll, 'job-card-overview')).toBe(true);
    expect(hasTestId(tabScroll, 'open-flow')).toBe(true);
    expect(hasTestId(tabScroll, 'overall-progress')).toBe(true);
    expect(hasTestId(h.root, 'job-card-machining-scroll')).toBe(false);

    // Editing: title, Cancel and Save above the scrolling steps.
    await press(byTestId(pane(), 'open-flow'));
    expect(hasTestId(pane(), 'flow-submit')).toBe(true);
    expect(hasTestId(scroll(), 'flow-submit')).toBe(false);
    expect(hasTestId(scroll(), 'flow-cancel')).toBe(false);
    expect(hasTestId(scroll(), 'flow-step-1')).toBe(true);
    // Add process stays pinned below the steps, and still adds one.
    expect(hasTestId(pane(), 'add-process')).toBe(true);
    expect(hasTestId(scroll(), 'add-process')).toBe(false);
    await press(byTestId(pane(), 'add-process'));
    expect(hasTestId(scroll(), 'flow-step-7')).toBe(true);
  });

  test('phone: + on the list slides up the flow sheet right there', async () => {
    mockWidth = 390;
    const h = await renderAdmin('JobCards');
    expect(hasTestId(h.root, 'flow-sheet')).toBe(false);
    await press(byLabel(h.root, 'Create flow for WO #1036'));
    // Still on the list: only the flow editor, under the job card in small.
    expect(h.currentRoute()).toBe('JobCards');
    const sheet = () => byTestId(h.root, 'flow-sheet');
    expect(allText(sheet())).toMatch(/^Create flow\|WO #1036\|/);
    expect(allText(byTestId(sheet(), 'flow-sheet-job-card'))).toBe(
      '#JOB7|Coupling — Job G|WO #1036|Medium',
    );
    expect(hasTestId(sheet(), 'route-card')).toBe(false);
    // Every step needs an operation; then Create saves and closes it.
    await press(byLabel(sheet(), 'Remove step 3'));
    await press(byLabel(sheet(), 'Remove step 2'));
    await choose(h.root, 'flow-step-1-operation', 'Cutting');
    await press(byTestId(sheet(), 'flow-submit'));
    expect(
      h.store.getState().jobCards.entities['1036'].operations.map(o => o.name),
    ).toEqual(['Cutting']);
    expect(hasTestId(h.root, 'flow-sheet')).toBe(false);
  });

  test('phone: Edit flow on the job card opens the same sheet', async () => {
    mockWidth = 390;
    const { h, screen } = await openEditor('1042');
    // The page stays as it is; the editor is in the sheet over it.
    expect(allText(byTestId(screen(), 'job-card-machining'))).toMatch(
      /^Route card & progress/,
    );
    const sheet = byTestId(h.root, 'flow-sheet');
    expect(allText(sheet)).toMatch(/^Edit flow\|WO #1042\|/);
    // Cancel closes it without saving.
    const cancel = sheet.findAll(
      n =>
        typeof n.type === 'string' && n.props.accessibilityLabel === 'Cancel',
    );
    await press(cancel[cancel.length - 1]);
    expect(hasTestId(h.root, 'flow-sheet')).toBe(false);
  });
});

test('search finds a job card by its work ID', async () => {
  const { root } = await renderAdmin('JobCards');
  await typeInto(
    byLabel(root, 'Search by job ID, WO #, part or operator'),
    'WO #1039',
  );
  const text = allText(byTestId(root, 'job-cards-table'));
  expect(text).toContain('Showing 1 of 1');
  expect(text).toContain('WO #1039');
});

test('the first column is the job ID, with the work order small beneath', async () => {
  const { root } = await renderAdmin('JobCards');
  const table = allText(byTestId(root, 'job-cards-table'));
  expect(table).toMatch(/^.*Job ID\|Part name/);
  expect(table).toContain('#JOB1|WO #1042|Bracket — Job A');

  // Search finds a card by its job ID too.
  await typeInto(
    byLabel(root, 'Search by job ID, WO #, part or operator'),
    'JOB3',
  );
  const found = allText(byTestId(root, 'job-cards-table'));
  expect(found).toContain('Showing 1 of 1');
  expect(found).toContain('#JOB3|WO #1037');
});
