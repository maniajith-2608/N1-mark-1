import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { runSaga } from 'redux-saga';
import type { UnknownAction } from '@reduxjs/toolkit';
import {
  allText,
  flush,
  byLabel,
  byTestId,
  choose,
  hasTestId,
  press,
  render,
  renderAdmin,
  resetMockApis,
  typeInto,
} from '../../../shared/testing/testUtils';
import RootNavigator from '../../../app/navigation/RootNavigator';
import { createStore } from '../../../app/store';
import { N1ThemeProvider } from '../../../shared/components';
import { MOCK_WRONG_PASSWORD, profileApi } from '../api/mockProfileApi';
import {
  changePassword,
  fetchSession,
  updateProfile,
} from '../store/profileSaga';
import { profileActions } from '../store/profileSlice';

const SAFE_AREA = {
  frame: { x: 0, y: 0, width: 1280, height: 900 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let mockWidth = 1280;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 900, scale: 1, fontScale: 1 }),
}));

beforeEach(() => {
  mockWidth = 1280;
});
afterEach(() => jest.restoreAllMocks());

test('summary card on the left, Account settings tab first', async () => {
  const h = await renderAdmin('MyProfile');
  const summary = allText(byTestId(h.root, 'profile-summary'));
  for (const value of [
    'Koushik Dasarathan',
    'Founder & Administrator',
    'Admin',
    'Active',
    'ABC Engineering Pvt Ltd',
    'ABC001',
    'Member since',
  ]) {
    expect(summary).toContain(value);
  }
  // Log out lives in the sidebar, not on the page; no activity tab either.
  expect(summary).not.toContain('Log out');
  expect(hasTestId(h.root, 'profile-tab-activity')).toBe(false);
  // Account settings: locked fields until Edit.
  expect(byTestId(h.root, 'profile-form-name').props.value).toBe(
    'Koushik Dasarathan',
  );
  expect(byTestId(h.root, 'profile-form-name').props.editable).toBe(false);
  expect(byTestId(h.root, 'profile-form-email').props.value).toBe(
    'kousigaratchagan.pd@foodhub.com',
  );
});

test('Edit unlocks the fields, validates the email and saves', async () => {
  const h = await renderAdmin('MyProfile');
  await press(byTestId(h.root, 'edit-profile'));
  expect(byTestId(h.root, 'profile-form-name').props.editable).toBe(true);
  // The phone number is the sign-in and stays locked.
  expect(byTestId(h.root, 'profile-form-phone').props.editable).toBe(false);
  expect(byTestId(h.root, 'profile-form-email').props.editable).toBe(true);
  await typeInto(byTestId(h.root, 'profile-form-email'), 'not-an-email');
  await press(byTestId(h.root, 'profile-form-submit'));
  expect(allText(h.root)).toContain('Enter a valid email address');
  await typeInto(byTestId(h.root, 'profile-form-email'), 'koushik@abc.com');
  await typeInto(byTestId(h.root, 'profile-form-name'), 'Koushik D');
  await press(byTestId(h.root, 'profile-form-submit'));
  expect(h.store.getState().profile.profile).toMatchObject({
    name: 'Koushik D',
    email: 'koushik@abc.com',
  });
  // Saved: locked again, and the summary and shell follow the new name.
  expect(byTestId(h.root, 'profile-form-name').props.editable).toBe(false);
  expect(allText(byTestId(h.root, 'profile-summary'))).toContain('Koushik D');
});

test('Account settings: address details, locked until Edit, PIN code checked', async () => {
  const h = await renderAdmin('MyProfile');
  const field = (key: string) => byTestId(h.root, `profile-form-${key}`);
  expect(allText(byTestId(h.root, 'profile-form'))).toContain('Address');
  expect(field('address').props.value).toBe('12, 3rd Cross Street, Anna Nagar');
  expect(field('city').props.value).toBe('Chennai');
  expect(allText(field('state'))).toBe('Tamil Nadu');
  expect(field('pinCode').props.value).toBe('600040');
  expect(allText(field('country'))).toBe('India');
  expect(field('address').props.editable).toBe(false);

  await press(byTestId(h.root, 'edit-profile'));
  await typeInto(field('pinCode'), '0123');
  await press(byTestId(h.root, 'profile-form-submit'));
  expect(allText(h.root)).toContain('Enter a 6-digit PIN code');

  await typeInto(field('address'), '  45, MG Road ');
  await typeInto(field('city'), 'Bengaluru');
  await choose(h.root, 'profile-form-state', 'Karnataka');
  await typeInto(field('pinCode'), '560001');
  // Country is picked from a list too.
  await choose(h.root, 'profile-form-country', 'Singapore');
  await press(byTestId(h.root, 'profile-form-submit'));
  expect(h.store.getState().profile.profile).toMatchObject({
    address: '45, MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560001',
    country: 'Singapore',
  });
  expect(field('city').props.editable).toBe(false);
});

test('Cancel or another tab drops unsaved edits', async () => {
  const h = await renderAdmin('MyProfile');
  const name = () => byTestId(h.root, 'profile-form-name');
  await press(byTestId(h.root, 'edit-profile'));
  await typeInto(name(), 'Draft');
  await press(byLabel(byTestId(h.root, 'profile-form'), 'Cancel'));
  expect(name().props.value).toBe('Koushik Dasarathan');

  await press(byTestId(h.root, 'edit-profile'));
  await typeInto(name(), 'Draft');
  await press(byTestId(h.root, 'profile-tab-security'));
  await press(byTestId(h.root, 'profile-tab-account'));
  expect(name().props.value).toBe('Koushik Dasarathan');
  expect(name().props.editable).toBe(false);
});

test('the photo is picked from the avatar and saved straight away', async () => {
  const h = await renderAdmin('MyProfile');
  await press(byTestId(h.root, 'profile-photo'));
  expect(h.store.getState().profile.profile?.photo).toEqual(
    expect.objectContaining({ name: 'photo.png' }),
  );
});

test('Security: the current password shows as set; Update password reveals the new one', async () => {
  const spy = jest.spyOn(profileApi, 'changePassword');
  const h = await renderAdmin('MyProfile');
  await press(byTestId(h.root, 'profile-tab-security'));
  // Shown as set (dots), locked; no new-password fields yet.
  const current = byTestId(h.root, 'password-form-current');
  expect(current.props.value).toBe('••••••••');
  expect(current.props.editable).toBe(false);
  expect(() => byLabel(h.root, 'New password')).toThrow();

  // changeMyPassword needs the current password.
  await press(byTestId(h.root, 'password-form-start'));
  const newPassword = byLabel(h.root, 'New password');
  const confirm = byLabel(h.root, 'Confirm password');
  await typeInto(newPassword, 'newpass123');
  await typeInto(confirm, 'newpass123');
  await press(byTestId(h.root, 'password-form-submit'));
  expect(spy).not.toHaveBeenCalled();
  expect(allText(h.root)).toContain('This field is required');
  await typeInto(byLabel(h.root, 'Current password'), 'oldpass123');
  await typeInto(confirm, 'different1');
  await press(byTestId(h.root, 'password-form-submit'));
  expect(spy).not.toHaveBeenCalled();
  await typeInto(confirm, 'newpass123');
  await press(byTestId(h.root, 'password-form-submit'));
  expect(spy).toHaveBeenCalledWith({
    currentPassword: 'oldpass123',
    newPassword: 'newpass123',
  });
  // Saved: locked again and confirmed.
  expect(allText(byTestId(h.root, 'password-form-changed'))).toBe(
    'Password updated',
  );
  expect(() => byLabel(h.root, 'New password')).toThrow();
});

test('Security: Cancel clears and locks again', async () => {
  const h = await renderAdmin('MyProfile');
  await press(byTestId(h.root, 'profile-tab-security'));
  await press(byTestId(h.root, 'password-form-start'));
  await typeInto(byLabel(h.root, 'New password'), 'newpass123');
  await press(byTestId(h.root, 'password-form-cancel'));
  expect(() => byLabel(h.root, 'New password')).toThrow();
  await press(byTestId(h.root, 'password-form-start'));
  expect(byLabel(h.root, 'New password').props.value).toBe('');
});

test('Security: no password yet: empty field and Set password', async () => {
  const h = await renderAdmin('MyProfile');
  await ReactTestRenderer.act(() => {
    h.store.dispatch(
      profileActions.updateProfileSuccess({
        ...h.store.getState().profile.profile!,
        hasPassword: false,
      }),
    );
  });
  await press(byTestId(h.root, 'profile-tab-security'));
  const current = byTestId(h.root, 'password-form-current');
  expect(current.props.value).toBe('');
  expect(current.props.placeholder).toBe('No password set');
  expect(allText(byTestId(h.root, 'password-form-start'))).toBe('Set password');
  await press(byTestId(h.root, 'password-form-start'));
  await typeInto(byLabel(h.root, 'Current password'), 'oldpass123');
  await typeInto(byLabel(h.root, 'New password'), 'newpass123');
  await typeInto(byLabel(h.root, 'Confirm password'), 'newpass123');
  await press(byTestId(h.root, 'password-form-submit'));
  // Now it has one.
  expect(byTestId(h.root, 'password-form-current').props.value).toBe(
    '••••••••',
  );
});

test('Security: a wrong current password says so and stays open', async () => {
  const h = await renderAdmin('MyProfile');
  await press(byTestId(h.root, 'profile-tab-security'));
  await press(byTestId(h.root, 'password-form-start'));
  await typeInto(byLabel(h.root, 'Current password'), MOCK_WRONG_PASSWORD);
  await typeInto(byLabel(h.root, 'New password'), 'newpass123');
  await typeInto(byLabel(h.root, 'Confirm password'), 'newpass123');
  await press(byTestId(h.root, 'password-form-submit'));
  expect(allText(h.root)).toContain('Your current password is not right.');
  expect(byLabel(h.root, 'New password')).toBeTruthy();
});

test('autofill: the browser never fills the password fields or the menu search', async () => {
  const h = await renderAdmin('MyProfile');
  await press(byTestId(h.root, 'profile-tab-security'));
  expect(byTestId(h.root, 'password-form-current').props.autoComplete).toBe(
    'off',
  );
  await press(byTestId(h.root, 'password-form-start'));
  for (const label of ['New password', 'Confirm password']) {
    expect(byLabel(h.root, label).props.autoComplete).toBe('new-password');
  }
  const search = byLabel(h.root, 'Search menu');
  expect(search.props.autoComplete).toBe('off');
  expect(search.props.keyboardType).toBe('web-search');
});

test('log out asks first, then returns to the login screen', async () => {
  resetMockApis();
  const store = createStore();
  const app = await render(
    <Provider store={store}>
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <N1ThemeProvider>
          <RootNavigator />
        </N1ThemeProvider>
      </SafeAreaProvider>
    </Provider>,
  );
  const root = app.root;
  const logInAsAdmin = async () => {
    const [email, password] = root.findAll(
      n => typeof n.type === 'string' && n.props.placeholder !== undefined,
    );
    await typeInto(email, 'admin@n1.com');
    await typeInto(password, 'Admin@123');
    await press(byLabel(root, 'Log in'));
    // Signing in is a request now; let it finish.
    await flush();
  };
  await logInAsAdmin();
  await press(byLabel(root, 'Open my profile'));
  await press(byTestId(root, 'sidebar-logout'));
  expect(allText(root)).toContain('Log out?');
  await press(byLabel(byTestId(root, 'sidebar-logout-dialog'), 'Log out'));
  expect(store.getState().profile.signedOut).toBe(true);
  expect(allText(root)).toContain('Get Started');
  expect(allText(root)).not.toContain('Koushik Dasarathan');

  // Signing in again reloads the session.
  await logInAsAdmin();
  await press(byLabel(root, 'Open my profile'));
  expect(store.getState().profile.status).toBe('succeeded');
  expect(allText(byTestId(root, 'profile-summary'))).toContain(
    'Koushik Dasarathan',
  );
});

test('phone layout: a menu instead of the summary and tabs', async () => {
  mockWidth = 390;
  const h = await renderAdmin('MyProfile');
  expect(hasTestId(h.root, 'profile-summary')).toBe(false);
  expect(hasTestId(h.root, 'profile-tab-account')).toBe(false);
  const menu = allText(byTestId(h.root, 'profile-menu'));
  for (const value of [
    'Koushik Dasarathan',
    'Organization details',
    'Account settings',
    'Security',
    'Address details',
    'Log out',
  ]) {
    expect(menu).toContain(value);
  }
});

test('phone menu rows open their own screens', async () => {
  mockWidth = 390;
  const h = await renderAdmin('MyProfile');

  await press(byTestId(h.root, 'profile-menu-address'));
  expect(hasTestId(h.root, 'profile-section-address')).toBe(true);
  // Address only: the personal details are under Account settings.
  expect(hasTestId(h.root, 'profile-form-city')).toBe(true);
  expect(hasTestId(h.root, 'profile-form-name')).toBe(false);
});

test('phone menu: role and status chips, and the photo opens the picker', async () => {
  mockWidth = 390;
  const h = await renderAdmin('MyProfile');
  const menu = allText(byTestId(h.root, 'profile-menu'));
  expect(menu).toContain('Admin');
  expect(menu).toContain('Active');

  await press(byTestId(h.root, 'profile-photo'));
  expect(h.store.getState().profile.profile?.photo).toEqual(
    expect.objectContaining({ name: 'photo.png' }),
  );
});

test('phone Organization details lists the organization, not its page', async () => {
  mockWidth = 390;
  const h = await renderAdmin('MyProfile');

  await press(byTestId(h.root, 'profile-menu-organization'));
  expect(hasTestId(h.root, 'organization-screen')).toBe(false);
  const facts = allText(byTestId(h.root, 'profile-organization'));
  for (const value of [
    'Organization',
    'ABC Engineering Pvt Ltd',
    'Organization code',
    'ABC001',
    'Member since',
  ]) {
    expect(facts).toContain(value);
  }
});

test('phone account settings leave the address out', async () => {
  mockWidth = 390;
  const h = await renderAdmin('MyProfile');

  await press(byTestId(h.root, 'profile-menu-account'));
  expect(hasTestId(h.root, 'profile-form-name')).toBe(true);
  expect(hasTestId(h.root, 'profile-form-city')).toBe(false);
});

async function record(saga: (a: never) => Generator, action?: UnknownAction) {
  const out: UnknownAction[] = [];
  await runSaga(
    { dispatch: (a: UnknownAction) => out.push(a) },
    saga as (...args: unknown[]) => Generator,
    action,
  ).toPromise();
  return out;
}

test('profile sagas report failures', async () => {
  jest.spyOn(profileApi, 'fetchSession').mockRejectedValue(new Error('down'));
  jest.spyOn(profileApi, 'updateProfile').mockRejectedValue('x');
  jest
    .spyOn(profileApi, 'changePassword')
    .mockRejectedValue(new Error('wrong password'));
  expect(await record(fetchSession)).toEqual([
    profileActions.fetchSessionFailure('down'),
  ]);
  expect(
    await record(
      updateProfile,
      profileActions.updateProfileRequest({
        name: 'a',
        designation: '',
        phone: '',
      }),
    ),
  ).toEqual([
    profileActions.updateProfileFailure('Failed to save your profile'),
  ]);
  expect(
    await record(
      changePassword,
      profileActions.changePasswordRequest({
        currentPassword: 'a',
        newPassword: 'b',
      }),
    ),
  ).toEqual([profileActions.changePasswordFailure('wrong password')]);
});

test('the user in the top bar opens My profile; back returns', async () => {
  const h = await renderAdmin('Billing');
  await press(byLabel(h.root, 'Open my profile'));
  expect(h.currentRoute()).toBe('MyProfile');
  expect(hasTestId(h.root, 'profile-summary')).toBe(true);
  await press(byLabel(h.root, 'Back'));
  expect(h.currentRoute()).toBe('Billing');
});

test('phone: the avatar and the menu user card open My profile', async () => {
  mockWidth = 390;
  // Job Cards has no Add action, so the top bar shows the initials.
  const h = await renderAdmin('JobCards');
  await press(byTestId(h.root, 'open-profile'));
  expect(h.currentRoute()).toBe('MyProfile');
  await h.navigate('JobCards');
  await press(byTestId(h.root, 'sidebar-open-profile'));
  expect(h.currentRoute()).toBe('MyProfile');
});
