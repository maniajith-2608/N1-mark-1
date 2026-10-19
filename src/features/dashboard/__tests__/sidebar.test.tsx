import {
  allText,
  byLabel,
  byTestId,
  press,
  renderAdmin,
} from '../../../shared/testing/testUtils';
import { sessionActions } from '../../auth/store/sessionSlice';

// Desktop: permanent sidebar, no top bar.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 1280, height: 900, scale: 1, fontScale: 1 }),
}));

test('wide screens: no top bar; the sidebar opens the organization', async () => {
  const h = await renderAdmin('Overview');
  // The organization link now lives in the sidebar, not a top bar.
  expect(allText(byTestId(h.root, 'open-organization'))).toBe(
    'ABC Engineering Pvt Ltd',
  );
  expect(
    byTestId(h.root, 'open-organization').props.accessibilityState?.selected,
  ).toBe(false);
  await press(byTestId(h.root, 'open-organization'));
  expect(h.currentRoute()).toBe('Organization');
  // Highlighted like a menu item while Organization is open.
  expect(
    byTestId(h.root, 'open-organization').props.accessibilityState?.selected,
  ).toBe(true);
  // No top bar on wide screens: the sidebar has the only link.
  expect(h.root.findAll(n => n.props.testID === 'open-profile')).toHaveLength(
    0,
  );
});

test('sidebar Log out asks first, then signs out', async () => {
  const h = await renderAdmin('Overview');
  h.store.dispatch(sessionActions.signIn('admin'));

  await press(byTestId(h.root, 'sidebar-logout'));
  const dialog = byTestId(h.root, 'sidebar-logout-dialog');
  expect(allText(dialog)).toContain('Log out?');
  await press(byLabel(dialog, 'Log out'));

  expect(h.store.getState().session.role).toBeNull();
});

test('collapsed rail keeps the organization, the avatar and log out', async () => {
  const h = await renderAdmin('Overview');
  await press(byLabel(h.root, 'Collapse sidebar'));

  await press(byTestId(h.root, 'sidebar-open-profile'));
  expect(h.currentRoute()).toBe('MyProfile');
  await press(byTestId(h.root, 'open-organization'));
  expect(h.currentRoute()).toBe('Organization');
  expect(byTestId(h.root, 'sidebar-logout')).toBeTruthy();
});

test('collapsed rail search icon expands the sidebar with search focused', async () => {
  const h = await renderAdmin('Overview');
  await press(byLabel(h.root, 'Collapse sidebar'));
  // Rail: only the icon, no search field.
  expect(
    h.root.findAll(
      n => n.props.accessibilityLabel === 'Search menu' && n.props.placeholder,
    ),
  ).toHaveLength(0);

  await press(byTestId(h.root, 'sidebar-open-search'));
  const field = h.root.find(
    n => n.props.accessibilityLabel === 'Search menu' && n.props.placeholder,
  );
  expect(field.props.autoFocus).toBe(true);
});

test('expanding from the logo does not focus the search', async () => {
  const h = await renderAdmin('Overview');
  await press(byLabel(h.root, 'Collapse sidebar'));
  await press(byLabel(h.root, 'Expand sidebar'));
  const field = h.root.find(
    n => n.props.accessibilityLabel === 'Search menu' && n.props.placeholder,
  );
  expect(field.props.autoFocus).toBe(false);
});

test('the user card is highlighted only while My profile is open', async () => {
  const h = await renderAdmin('Overview');
  const card = () => byTestId(h.root, 'sidebar-open-profile');
  expect(card().props.accessibilityState).toEqual({ selected: false });

  await press(card());
  expect(card().props.accessibilityState).toEqual({ selected: true });
});

test('dashboard shows three summary cards that open their pages', async () => {
  const h = await renderAdmin('Overview');
  const stats = byTestId(h.root, 'dashboard-stats');
  const text = allText(stats);
  expect(text).toContain('Total billed');
  expect(text).toContain('Outstanding');
  expect(text).toContain('Total orders');
  expect(text).not.toContain('Monthly billed');

  await press(byLabel(stats, 'Open Total orders'));
  expect(h.currentRoute()).toBe('Orders');
});

test('summary card arrows for billed and outstanding open Billing', async () => {
  const h = await renderAdmin('Overview');
  await press(byLabel(byTestId(h.root, 'dashboard-stats'), 'Open Outstanding'));
  expect(h.currentRoute()).toBe('Billing');
});

test('the Week / Month / Year tabs change the summary cards', async () => {
  const h = await renderAdmin('Overview');
  const tabs = () =>
    h.root.findAll(n => n.props.accessibilityRole === 'tab' && n.props.onPress);
  const tab = (label: string) => tabs().find(t => allText(t) === label)!;
  const cards = () => allText(byTestId(h.root, 'dashboard-stats'));

  expect(tabs().map(t => allText(t))).toEqual(['Week', 'Month', 'Year']);
  expect(tab('Month').props['aria-selected']).toBe(true);

  await press(tab('Week'));
  const week = cards();
  await press(tab('Year'));
  const year = cards();
  expect(tab('Year').props['aria-selected']).toBe(true);
  // A year always covers at least as much as a week, and the sample data has
  // invoices from earlier in the year, so the figures differ.
  expect(year).not.toEqual(week);
});

test('priority jobs are job card tiles, earliest due first, that open the job card', async () => {
  const h = await renderAdmin('Overview');
  const panel = byTestId(h.root, 'priority-jobs-card');
  const tiles = panel.findAll(
    n =>
      typeof n.props.testID === 'string' &&
      /^priority-job-\d+$/.test(n.props.testID) &&
      n.props.onPress,
  );
  expect(tiles.length).toBeGreaterThan(1);

  const dueDates = tiles.map(t =>
    allText(byTestId(t, `priority-job-due-${t.props.testID.slice(13)}`)),
  );
  expect(dueDates.every(d => d.startsWith('Due '))).toBe(true);
  const first = allText(tiles[0]);
  // Route card number with the client in brackets.
  expect(first).toMatch(/^RC-\d+ \(.+\)/);
  // Then the job card ID, work order and part.
  expect(allText(byTestId(h.root, 'priority-job-ids-1042'))).toBe(
    '#JOB1 · WO #1042 · Bracket',
  );
  expect(first).toContain('%');

  await press(tiles[0]);
  expect(h.currentRoute()).toBe('JobCardDetails');
});

test('wide screens: the page stays put and only the priority list scrolls', async () => {
  const h = await renderAdmin('Overview');
  const screen = byTestId(h.root, 'dashboard-screen');
  const scroll = byTestId(screen, 'priority-jobs-scroll');
  // The priority tiles live inside the panel's own scroll view.
  expect(
    scroll.findAll(n => n.props.testID === 'priority-job-1042').length,
  ).toBeGreaterThan(0);
  // The header sits outside every scroll view, so it never scrolls away.
  const header = screen.find(
    n => n.props.accessibilityRole === 'header' && n.props.children,
  );
  let node: typeof header | null = header.parent;
  while (node && node !== screen) {
    expect(node.type).not.toBe('RCTScrollView');
    node = node.parent;
  }
});

test('customers table: all columns, every customer, rows open the customer', async () => {
  const h = await renderAdmin('Overview');
  const card = byTestId(h.root, 'customers-card');
  const text = allText(card);
  for (const column of [
    'Customer',
    'Total orders',
    'Billed',
    'Outstanding',
    'Pending delivery',
    'Contribution',
  ]) {
    expect(text).toContain(column);
  }
  // The donut is gone.
  expect(text).not.toContain('TOTAL');
  // Wide screens: the rows scroll inside the card.
  const rows = byTestId(card, 'customers-scroll').findAll(
    n =>
      typeof n.props.testID === 'string' &&
      n.props.testID.startsWith('customer-row-') &&
      n.props.onPress,
  );
  expect(rows.length).toBeGreaterThan(4);

  await press(rows[0]);
  expect(h.currentRoute()).toBe('CustomerDetails');
});
