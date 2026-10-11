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

let mockWidth = 1280;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 900, scale: 1, fontScale: 1 }),
}));

beforeEach(() => {
  mockWidth = 1280;
});

test('the totals sit in the pagination bar and the table lists machines', async () => {
  const { root } = await renderAdmin('Machines');
  const table = byTestId(root, 'machines-table');
  const text = allText(table);
  // Wide screens: no stat tiles; the totals are in the pagination summary.
  expect(hasTestId(root, 'machine-stats')).toBe(false);
  expect(text).toContain(
    'Showing 10 of 10 machines · 5 running · 3 idle · 2 under maintenance',
  );
  expect(text).toContain('WO #1036 · Coupling — Job G');
  expect(text).toContain('Divya Ramesh');
  expect(text).toContain('CNC Lathe');
  expect(text).toContain('Kirloskar Turnmaster');
  // Title and Add live in the toolbar; only the rows scroll.
  expect(text).toContain('Machines');
  expect(hasTestId(table, 'add-machine')).toBe(true);
  const scroll = byTestId(table, 'machines-table-scroll');
  expect(allText(scroll)).toContain('Turning Center 1');
  expect(allText(scroll)).not.toContain('Showing 10 of 10 machines');
});

test('search and the multi-select status filter narrow the list', async () => {
  const { root } = await renderAdmin('Machines');
  const panel = () => byTestId(root, 'machines-filter-panel');
  const showing = () =>
    allText(byTestId(root, 'machines-table')).match(/Showing \d+ of \d+/)?.[0];

  await typeInto(byLabel(root, 'Search by WO #, machine or code'), 'cnc mill');
  expect(showing()).toBe('Showing 2 of 2');
  await typeInto(byLabel(root, 'Search by WO #, machine or code'), '');

  await press(byTestId(root, 'machines-filter'));
  await press(byLabel(panel(), 'Idle'));
  await press(byLabel(panel(), 'Maintenance'));
  await press(byTestId(root, 'machines-filter-apply'));
  expect(showing()).toBe('Showing 5 of 5');
  expect(allText(root)).not.toContain('Turning Center 1');
  expect(byLabel(root, 'Filter (2)')).toBeTruthy();
});

test('adds a machine with required fields and a unique code', async () => {
  const { root, store } = await renderAdmin('Machines');
  await press(byTestId(root, 'add-machine'));
  await press(byTestId(root, 'machine-form-submit'));
  expect(allText(root).split('This field is required').length - 1).toBe(3);
  await typeInto(byTestId(root, 'machine-form-name'), 'Turning Center 3');
  await typeInto(byTestId(root, 'machine-form-code'), 'cnc-01');
  await typeInto(byTestId(root, 'machine-form-location'), 'Bay 1');
  await press(byTestId(root, 'machine-form-submit'));
  expect(allText(root)).toContain('Another machine already uses this code');
  await typeInto(byTestId(root, 'machine-form-code'), 'cnc-05');
  await press(byTestId(root, 'machine-form-submit'));
  const created = Object.values(store.getState().machines.entities).find(
    m => m.code === 'CNC-05',
  );
  expect(created).toMatchObject({
    name: 'Turning Center 3',
    status: 'running',
    currentWork: null,
  });
  // The total in the pagination bar counts the new machine (and it's running).
  expect(allText(byTestId(root, 'machines-table'))).toContain(
    'of 11 machines · 6 running',
  );
});

test('edits a machine status in the dialog; its own code is allowed', async () => {
  const { root, store } = await renderAdmin('Machines');
  await press(byLabel(root, 'Edit Milling Center 1'));
  expect(hasTestId(root, 'machine-details-screen')).toBe(false);
  expect(allText(root)).toContain("Update Milling Center 1's details.");
  expect(byTestId(root, 'machine-form-code').props.value).toBe('CNC-03');
  await choose(root, 'machine-form-status', 'Idle');
  await press(byTestId(root, 'machine-form-submit'));
  expect(store.getState().machines.entities['MCH-3']).toMatchObject({
    code: 'CNC-03',
    status: 'idle',
  });
});

test('clicking a row opens the machine details, locked until Edit', async () => {
  const { root } = await renderAdmin('Machines');
  await press(byText(root, 'Milling Center 1'));
  expect(hasTestId(root, 'machine-details-screen')).toBe(true);
  expect(hasTestId(root, 'machine-form')).toBe(false);
  // Wide screens: the heading sits outside the scrolling content.
  const scroll = byTestId(root, 'machine-details-scroll');
  expect(hasTestId(scroll, 'machine-details-heading')).toBe(false);
  expect(hasTestId(scroll, 'machine-form-notes')).toBe(true);
  expect(allText(root)).toContain('CNC-03 · CNC Mill');
  expect(byTestId(root, 'machine-form-code').props.value).toBe('CNC-03');
  expect(byTestId(root, 'machine-form-code').props.editable).toBe(false);
  expect(byTestId(root, 'machine-form-notes').props.value).toBe(
    'Spindle bearing replacement scheduled this week.',
  );
});

test('clicking a row opens its details with the current work', async () => {
  const { root } = await renderAdmin('Machines');
  await press(byText(root, 'Turning Center 1'));
  expect(allText(byTestId(root, 'machine-current-work'))).toContain(
    'WO #1036 · Coupling — Job G',
  ); // No notes: the locked field says so.
  expect(byTestId(root, 'machine-form-notes').props.value).toBe(
    'No notes added',
  );
});

test('edits a machine in place on its details', async () => {
  const { root, store } = await renderAdmin('Machines');
  await press(byText(root, 'Milling Center 1'));
  await press(byTestId(root, 'edit-machine'));
  expect(byTestId(root, 'machine-form-code').props.editable).toBe(true);
  await choose(root, 'machine-form-status', 'Idle');
  await press(byTestId(root, 'machine-form-submit'));
  expect(store.getState().machines.entities['MCH-3']).toMatchObject({
    code: 'CNC-03',
    status: 'idle',
  });
  // Saved: the fields lock again.
  expect(byTestId(root, 'machine-form-code').props.editable).toBe(false);
});

test('details edit rejects a code another machine uses; Cancel drops it', async () => {
  const { root, store } = await renderAdmin('Machines');
  await press(byText(root, 'Milling Center 1'));
  await press(byTestId(root, 'edit-machine'));
  await typeInto(byTestId(root, 'machine-form-code'), 'cnc-01');
  await press(byTestId(root, 'machine-form-submit'));
  expect(allText(root)).toContain('Another machine already uses this code');
  await press(byLabel(root, 'Cancel'));
  expect(byTestId(root, 'machine-form-code').props.value).toBe('CNC-03');
  expect(store.getState().machines.entities['MCH-3']?.code).toBe('CNC-03');
});

test('Back on the details returns to the list', async () => {
  const h = await renderAdmin('Machines');
  await h.navigate('MachineDetails', { machineId: 'MCH-1' });
  await press(byTestId(h.root, 'machine-details-back'));
  expect(h.currentRoute()).toBe('Machines');
});

test('unknown machine shows not found', async () => {
  const h = await renderAdmin('Machines');
  await h.navigate('MachineDetails', { machineId: 'MCH-404' });
  expect(allText(h.root)).toContain('This machine could not be found.');
});

test('phone lists machine cards with titled values and an edit button', async () => {
  mockWidth = 390;
  const { root } = await renderAdmin('Machines');
  expect(hasTestId(root, 'machine-stats')).toBe(false);
  const row = allText(byTestId(root, 'machine-card-MCH-1'));
  expect(row).toContain('Turning Center 1');
  expect(row).toContain('CNC-01');
  expect(row).toContain('CNC Lathe');
  expect(row).toContain('Bay 1');
  expect(row).toContain('Running');
  expect(row).toContain('WO #1036 · Coupling — Job G');
  expect(row).toContain('Divya Ramesh');
  // Each value carries its title.
  ['Type', 'Location', 'Current work', 'Operator'].forEach(title =>
    expect(row).toContain(title),
  );
  // The pencil opens the Edit dialog, not the details.
  await press(byLabel(root, 'Edit Turning Center 1'));
  expect(allText(root)).toContain('Edit machine');
  expect(hasTestId(root, 'machine-details-screen')).toBe(false);
});

test('phone details sit on a white page; the header Edit slides up the edit sheet', async () => {
  mockWidth = 390;
  const { root, store } = await renderAdmin('Machines');
  await press(byText(root, 'Milling Center 1'));
  expect(hasTestId(root, 'machine-details-screen')).toBe(true);
  expect(hasTestId(root, 'machine-form')).toBe(false);
  // One Edit, in the header; none on the Machine info section.
  expect(allText(byTestId(root, 'machine-details-form'))).not.toContain('Edit');
  await press(byTestId(root, 'edit-machine'));
  const sheet = byTestId(root, 'machine-form');
  expect(allText(sheet)).toContain("Update Milling Center 1's details.");
  await choose(sheet, 'machine-form-status', 'Idle');
  await press(byTestId(sheet, 'machine-form-submit'));
  expect(store.getState().machines.entities['MCH-3']).toMatchObject({
    code: 'CNC-03',
    status: 'idle',
  });
  // Saved: the sheet closes, back on the details.
  expect(hasTestId(root, 'machine-form')).toBe(false);
  expect(hasTestId(root, 'machine-details-screen')).toBe(true);
});

test('search finds the machine running a work order', async () => {
  const { root } = await renderAdmin('Machines');
  await typeInto(byLabel(root, 'Search by WO #, machine or code'), 'WO #1039');
  const text = allText(byTestId(root, 'machines-table'));
  expect(text).toContain('Showing 1 of 1');
  expect(text).toContain('Turning Center 2');
});
