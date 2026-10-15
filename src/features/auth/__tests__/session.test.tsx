import ReactTestRenderer from 'react-test-renderer';
import { createStore } from '../../../app/store';
import {
  allText,
  byLabel,
  byTestId,
  press,
  renderAppAs,
} from '../../../shared/testing/testUtils';
import { sessionActions } from '../store/sessionSlice';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

let app: ReactTestRenderer.ReactTestRenderer | undefined;

afterEach(async () => {
  await ReactTestRenderer.act(() => app?.unmount());
  app = undefined;
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

/** A tiny in-memory stand-in for the browser's localStorage. */
function fakeLocalStorage() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage;
  return data;
}

test('a shop-floor role only gets its own area, never the admin dashboard', async () => {
  app = await renderAppAs('supervisor@n1.com', 'Supervisor@123');
  const text = allText(app.root);

  expect(text).toContain('My Jobs');
  // The admin sidebar (and its modules) isn't registered for this role.
  expect(text).not.toContain('Job Cards');
});

test('signing out shows the login screen again', async () => {
  app = await renderAppAs('operator@n1.com', 'Operator@123');
  // The home header's initials open Profile.
  await press(byTestId(app.root, 'open-profile'));
  await press(byTestId(app.root, 'employee-logout'));
  // The dialog's Log out confirms.
  await press(byLabel(byTestId(app.root, 'employee-logout-dialog'), 'Log out'));

  expect(allText(app.root)).toContain('Welcome back');
  expect(() => byTestId(app!.root, 'employee-home-header')).toThrow();
});

test('the session is saved on web and restored by a new store', async () => {
  const saved = fakeLocalStorage();

  const store = createStore();
  store.dispatch(sessionActions.signIn('qc'));
  expect(saved.get('n1.session.role')).toBe('qc');

  // A page refresh builds a new store, which reads the saved role.
  expect(createStore().getState().session.role).toBe('qc');

  store.dispatch(sessionActions.signOut());
  expect(saved.has('n1.session.role')).toBe(false);
  expect(createStore().getState().session.role).toBeNull();
});
