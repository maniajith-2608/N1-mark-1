/**
 * @format
 */

import { type ReactTestInstance } from 'react-test-renderer';
import LoginScreen from '../screens/LoginScreen';
import CreateOrganizationScreen from '../screens/CreateOrganizationScreen';
import { createStore } from '../../../app/store';
import {
  PHONE,
  WIDE,
  allText,
  findText,
  input,
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

describe('CreateOrganizationScreen', () => {
  test('industry is Manufacturing only, picked from the start', async () => {
    const root = await render(<CreateOrganizationScreen />, WIDE);
    expect(allText(root)).toContain('Manufacturing');
    await press(findText(root, 'Manufacturing'));
    const options = root
      .findAll(node => node.props.accessibilityRole === 'menuitem')
      .filter(node => typeof node.type === 'string');
    expect(options.map(node => allText(node).join(''))).toEqual([
      'Manufacturing',
    ]);
  });

  // Fills every required field with valid values.
  const fillForm = async (root: ReactTestInstance, email: string) => {
    await type(root, 'Your full name', 'Kaveri Owner');
    await type(root, 'ABC Engineering Pvt Ltd', 'Kaveri Tools');
    await type(root, 'owner@abcengineering.com', email);
    await type(root, '+91 98765 43210', '+91 98400 12345');
    await type(root, 'e.g. 33ABCDE1234F1Z5', '33abcde1234f1z5');
    await type(root, 'Building, street', '1 Test Road');
    await type(root, 'e.g. Chennai', 'Chennai');
    await press(findText(root, 'Select state'));
    await press(findText(root, 'Tamil Nadu'));
    await type(root, 'e.g. 600001', '600001');
    await type(root, 'Create a password', 'Kaveri2026');
    await type(root, 'Re-enter password', 'Kaveri2026');
  };

  test('every field but GST number and address line 2 is required', async () => {
    const store = createStore();
    const root = await render(<CreateOrganizationScreen />, WIDE, store);
    await press(findText(root, 'Create organization'));
    const text = allText(root);
    expect(text).toContain('Enter your name');
    expect(text).toContain('Enter the organization name');
    expect(text).toContain('Enter a valid email');
    expect(text).toContain('Enter a phone number');
    expect(text).not.toContain('Enter a valid 15-character GST number');
    expect(text).toContain('Enter the address');
    expect(text).toContain('Enter the city');
    expect(text).toContain('Select a state');
    expect(text).toContain('Enter a 6-digit PIN code');
    expect(text).toContain('Password does not meet the rules below');
    expect(text).not.toContain('Select an industry');
    expect(store.getState().session.role).toBeNull();

    // Optional, but a GST number that is given must be valid.
    await type(root, 'e.g. 33ABCDE1234F1Z5', '33ABC');
    expect(allText(root)).toContain('Enter a valid 15-character GST number');
  });

  test('creating the organization signs the new owner in as admin', async () => {
    const store = createStore();
    const root = await render(<CreateOrganizationScreen />, WIDE, store);
    await fillForm(root, 'owner@kaveri.in');
    // The code is the name's letters plus a random number.
    expect(input(root, 'Generated from name').props.value).toMatch(
      /^KAVERI-[1-9][0-9]{3}$/,
    );
    await press(findText(root, 'Create organization'));
    expect(allText(root)).not.toContain('Enter the organization name');
    expect(store.getState().session.role).toBe('admin');
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  test('an already registered email shows the reason and stays put', async () => {
    const store = createStore();
    const root = await render(<CreateOrganizationScreen />, PHONE, store);
    await fillForm(root, 'admin@n1.com');
    await press(findText(root, 'Create organization'));
    expect(allText(root)).toContain(
      'This business email is already registered.',
    );
    expect(store.getState().session.role).toBeNull();
  });
});
