/**
 * @format
 */

import { type ReactTestInstance } from 'react-test-renderer';
import LoginScreen from '../screens/LoginScreen';
import { createStore } from '../../../app/store';
import {
  PHONE,
  WIDE,
  allText,
  findText,
  press,
  render,
  type,
} from '../../../shared/testing/render';

const mockNavigation = {
  reset: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  popTo: jest.fn(),
  getParent: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('../../../shared/hooks/useN1Breakpoint', () => ({
  useN1Breakpoint: () => {
    const { width } = jest.requireActual(
      '../../../shared/testing/render',
    ).screenSize;
    return { width, isCompact: width < 768, isDesktop: width >= 1024 };
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigation.canGoBack.mockReturnValue(true);
});

const LOGIN_ID = 'you@company.com or 98765 43210';

// Press the submit button by its ID.
const submitLogin = (root: ReactTestInstance) =>
  press(root.findAll(node => node.props.testID === 'login-submit')[0]);

describe('LoginScreen', () => {
  test('wide layout shows the hero panel and remember me', async () => {
    const text = allText(await render(<LoginScreen />, WIDE));

    expect(text).toContain('Get Started');
    expect(text).toContain(
      'N1 brings your organization, your team, and your data together in one simple workspace. Stay on top of daily operations, keep your team aligned, and get a clear view of your business from one dashboard.',
    );
    expect(text).toContain('Remember me');
    expect(text).toContain('Forgot password?');
    expect(text).not.toContain('Welcome back');
  });

  test.each([WIDE, PHONE])(
    'shows the Create organization entry point (width %i)',
    async width => {
      expect(allText(await render(<LoginScreen />, width))).toContain(
        'Create organization',
      );
    },
  );

  test.each([
    ['admin@n1.com', 'Admin@123', 'admin'],
    ['supervisor@n1.com', 'Supervisor@123', 'supervisor'],
    ['  OPERATOR@n1.com ', 'Operator@123', 'operator'],
    ['qc@n1.com', 'Qc@12345', 'qc'],
    ['9000000001', 'Admin@123', 'admin'],
    ['+91 90000 00003', 'Operator@123', 'operator'],
  ])('%s signs in as %s', async (email, password, role) => {
    const store = createStore();
    const root = await render(<LoginScreen />, PHONE, store);

    await type(root, LOGIN_ID, email);
    await type(root, 'Enter your password', password);
    await submitLogin(root);

    // The root navigator then shows only that role's area.
    expect(store.getState().session.role).toBe(role);
    expect(mockNavigation.reset).not.toHaveBeenCalled();
  });

  test('wrong credentials show an error and stay on Login', async () => {
    const store = createStore();
    const root = await render(<LoginScreen />, PHONE, store);

    await type(root, LOGIN_ID, 'admin@n1.com');
    await type(root, 'Enter your password', 'wrong');
    await submitLogin(root);

    expect(store.getState().session.role).toBeNull();
    expect(allText(root)).toContain('Invalid email, phone number or password.');
  });

  test('empty fields flag both the login ID and password', async () => {
    const store = createStore();
    const root = await render(<LoginScreen />, PHONE, store);

    await submitLogin(root);
    expect(allText(root)).toContain('Email or phone number is required');
    expect(allText(root)).toContain('Password is required');
    expect(allText(root)).not.toContain(
      'Invalid email, phone number or password.',
    );
    expect(store.getState().session.role).toBeNull();

    // A login ID that is neither an email nor a phone is flagged too; typing
    // clears the password error.
    await type(root, LOGIN_ID, 'admin');
    await type(root, 'Enter your password', 'Admin@123');
    await submitLogin(root);
    const text = allText(root);
    expect(text).toContain('Enter a valid email or phone number');
    expect(text).not.toContain('Password is required');
  });

  test('remember me toggles', async () => {
    const root = await render(<LoginScreen />, WIDE);
    const checkbox = () =>
      root.findAll(
        node =>
          typeof node.type === 'string' &&
          node.props.accessibilityRole === 'checkbox',
      )[0];

    expect(checkbox().props.accessibilityState).toMatchObject({
      checked: false,
    });
    await press(findText(root, 'Remember me'));
    expect(checkbox().props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  test('"Forgot password?" opens the forgot password flow', async () => {
    const root = await render(<LoginScreen />, WIDE);

    await press(findText(root, 'Forgot password?'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Auth', {
      screen: 'ForgotPasswordFlow',
      params: { screen: 'ForgotPassword' },
    });
  });
});
