import ReactTestRenderer from 'react-test-renderer';
import {
  allText,
  byLabel,
  byTestId,
  logIn as fillLogin,
  press,
  renderAppAs,
} from '../../../shared/testing/testUtils';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

let app: ReactTestRenderer.ReactTestRenderer | undefined;

// Only one linked NavigationContainer may be mounted at a time, or React
// Navigation logs a warning from a timer that can outlive the test file.
afterEach(async () => {
  await ReactTestRenderer.act(() => app?.unmount());
  app = undefined;
});

async function logIn(email: string, password: string) {
  app = await renderAppAs(email, password);
  return app.root;
}

/** The home header's initials open Profile. */
const openProfile = (root: ReactTestRenderer.ReactTestInstance) =>
  press(byTestId(root, 'open-profile'));

test.each([
  [
    'supervisor@n1.com',
    'Supervisor@123',
    'Supervisor',
    'Priya Sharma',
    'My Jobs',
  ],
  [
    'operator@n1.com',
    'Operator@123',
    'Operator',
    'Ravi Kumar',
    '4 in progress · 5 total',
  ],
  ['qc@n1.com', 'Qc@12345', 'QC', 'Suresh Babu', '2 pending · 5 total'],
])(
  '%s lands on the %s jobs under the home header, and opens their profile',
  async (email, password, role, name, jobsText) => {
    const root = await logIn(email, password);

    // No tab bar.
    expect(() => byLabel(root, 'Profile')).toThrow();
    const initials = name
      .split(' ')
      .map(w => w[0])
      .join('');
    // The jobs screen's name in the middle, between the logo and initials.
    const title = role === 'QC' ? 'QC' : 'My Jobs';
    expect(allText(byTestId(root, 'employee-home-header'))).toBe(
      `${title}|${initials}`,
    );
    expect(allText(root)).toContain(jobsText);

    await openProfile(root);
    const text = allText(byTestId(root, 'employee-profile-screen'));
    expect(text).toContain(name);
    expect(text).toContain(role);

    // Back returns to the jobs.
    await press(byLabel(byTestId(root, 'employee-profile-screen'), 'Back'));
    expect(allText(root)).toContain(jobsText);
    expect(() => byTestId(root, 'employee-profile-screen')).toThrow();
  },
);

test('profile shows the design fields for the machine operator', async () => {
  const root = await logIn('operator@n1.com', 'Operator@123');
  await openProfile(root);

  const text = allText(root);
  for (const value of [
    'EMP-1042',
    'Machining',
    'Morning (6 AM – 2 PM)',
    '14 Mar 2023',
    '+91 98765 43210',
    'ravi.kumar@abceng.com',
    'Log out',
  ]) {
    expect(text).toContain(value);
  }
});

test('the profile is read-only: no way to edit it', async () => {
  const root = await logIn('operator@n1.com', 'Operator@123');
  await openProfile(root);
  const profile = byTestId(root, 'employee-profile-screen');

  // The black header's title, the big initials, name and role, the tags and
  // stats, then the work and contact details; Log out at the bottom.
  expect(allText(profile)).toMatch(
    /^My profile\|RK\|Ravi Kumar\|Operator\|Machining\|EMP-1042\|Joined 14 Mar 2023\|Morning \(6 AM – 2 PM\)\|Work details\|EMP-1042\|Employee ID\|Machining\|Department\|.*\|Shift\|Contact\|\+91 98765 43210\|Phone\|ravi\.kumar@abceng\.com\|Email\|Log out/,
  );
  expect(() => byLabel(root, 'Edit profile')).toThrow();
  expect(() => byTestId(root, 'employee-form-name')).toThrow();
});

test('log out asks first, then returns to login; next role loads its own profile', async () => {
  const root = await logIn('operator@n1.com', 'Operator@123');
  await openProfile(root);
  await press(byTestId(root, 'employee-logout'));
  expect(allText(root)).toContain('Log out?');

  // The dialog's Log out confirms.
  await press(byLabel(byTestId(root, 'employee-logout-dialog'), 'Log out'));
  expect(allText(root)).toContain('Welcome back');

  await fillLogin(root, 'qc@n1.com', 'Qc@12345');
  await openProfile(root);

  const profile = byTestId(root, 'employee-profile-screen');
  expect(allText(profile)).toContain('Suresh Babu');
  expect(allText(profile)).not.toContain('Ravi Kumar');
});
