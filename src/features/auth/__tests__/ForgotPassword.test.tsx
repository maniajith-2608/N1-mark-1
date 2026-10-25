/**
 * @format
 */

import { useState } from 'react';
import * as RN from 'react-native';
import ReactTestRenderer, { type ReactTestInstance } from 'react-test-renderer';
import { authApi, MOCK_RESET_CODE } from '../api/mockAuthApi';
import CodeInput from '../components/CodeInput';
import {
  ForgotPasswordProvider,
  useForgotPassword,
} from '../context/ForgotPasswordContext';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import VerifyCodeScreen from '../screens/VerifyCodeScreen';
import {
  PHONE,
  WIDE,
  allText,
  findText,
  press,
  render,
  type,
} from '../../../shared/testing/render';

const mockParent = { popTo: jest.fn() };
const mockNavigation = {
  navigate: jest.fn(),
  popTo: jest.fn(),
  getParent: jest.fn(() => mockParent),
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

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

function digitBoxes(root: ReactTestInstance) {
  return root.findAll(
    node =>
      node.type === RN.TextInput &&
      String(node.props.accessibilityLabel).startsWith('Digit'),
  );
}

async function typeInBox(root: ReactTestInstance, index: number, text: string) {
  await ReactTestRenderer.act(() => {
    digitBoxes(root)[index].props.onChangeText(text);
  });
}

describe('ForgotPasswordScreen', () => {
  const renderScreen = (width = WIDE) =>
    render(
      <ForgotPasswordProvider>
        <ForgotPasswordScreen />
      </ForgotPasswordProvider>,
      width,
    );

  test('shows the tagline on wide screens only', async () => {
    const tagline =
      'N1 brings your organization, your team, and your data together in one simple workspace. Stay on top of daily operations, keep your team aligned, and get a clear view of your business from one dashboard.';
    expect(allText(await renderScreen(WIDE))).toContain(tagline);
    expect(allText(await renderScreen(PHONE))).not.toContain(tagline);
  });

  test('an invalid email shows an error and does not continue', async () => {
    const root = await renderScreen();

    await type(root, 'you@company.com', 'not-an-email');
    await press(findText(root, 'Send code'));

    expect(allText(root)).toContain('Enter a valid email');
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  test('a valid email sends the code and moves on to the code step', async () => {
    const spy = jest.spyOn(authApi, 'forgotPassword');
    const root = await renderScreen();

    await type(root, 'you@company.com', ' owner@abc.com ');
    await press(findText(root, 'Send code'));

    expect(spy).toHaveBeenCalledWith('owner@abc.com');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('VerifyCode');
  });

  test('a failed send shows why and stays put', async () => {
    jest
      .spyOn(authApi, 'forgotPassword')
      .mockRejectedValue(new Error('Too many requests'));
    const root = await renderScreen();

    await type(root, 'you@company.com', 'owner@abc.com');
    await press(findText(root, 'Send code'));

    expect(allText(root)).toContain('Too many requests');
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  test('"Back to log in" returns to Login in the auth stack', async () => {
    const root = await renderScreen(PHONE);

    await press(findText(root, 'Back to log in'));

    expect(mockParent.popTo).toHaveBeenCalledWith('Login');
  });
});

describe('VerifyCodeScreen', () => {
  const renderScreen = (width = WIDE) =>
    render(
      <ForgotPasswordProvider>
        <VerifyCodeScreen />
      </ForgotPasswordProvider>,
      width,
    );

  test('shows the email entered on the previous step', async () => {
    const root = await render(
      <ForgotPasswordProvider>
        <ForgotPasswordScreen />
        <VerifyCodeScreen />
      </ForgotPasswordProvider>,
      WIDE,
    );

    await type(root, 'you@company.com', 'owner@abc.com');
    await press(findText(root, 'Send code'));

    expect(allText(root)).toContain('owner@abc.com');
  });

  test('falls back to "your email" when opened directly', async () => {
    expect(allText(await renderScreen())).toContain('your email');
  });

  test('an incomplete code shows an error and does not continue', async () => {
    const root = await renderScreen();

    await typeInBox(root, 0, '123');
    await press(findText(root, 'Verify code'));

    expect(allText(root)).toContain('Enter the ');
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  test('the right code is checked and moves on to set a new password', async () => {
    const spy = jest.spyOn(authApi, 'verifyResetCode');
    const root = await renderScreen(PHONE);

    await typeInBox(root, 0, MOCK_RESET_CODE);
    await press(findText(root, 'Verify code'));

    expect(spy).toHaveBeenCalledWith('', MOCK_RESET_CODE);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ResetPassword');
  });

  test('a wrong code says so and stays put', async () => {
    const root = await renderScreen();

    await typeInBox(root, 0, '000000');
    await press(findText(root, 'Verify code'));

    expect(allText(root)).toContain(
      'That code is not right or has expired. Ask for a new one.',
    );
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  test('resend asks for a new code, clears the boxes and confirms', async () => {
    const spy = jest.spyOn(authApi, 'forgotPassword');
    const root = await renderScreen();

    await typeInBox(root, 0, '12');
    await press(findText(root, 'Resend code'));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(allText(root)).toContain('A new code is on its way.');
    expect(digitBoxes(root).map(box => box.props.value)).toEqual([
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  });

  test('"Back" and "Use a different email" return to the email step', async () => {
    const root = await renderScreen();

    await press(findText(root, 'Back'));
    await press(findText(root, 'Use a different email'));

    expect(mockNavigation.popTo).toHaveBeenCalledTimes(2);
    expect(mockNavigation.popTo).toHaveBeenCalledWith('ForgotPassword');
  });
});

describe('ResetPasswordScreen', () => {
  /** The email and code as the earlier steps leave them. */
  function Verified({ email = 'owner@abc.com', code = MOCK_RESET_CODE }) {
    const flow = useForgotPassword();
    const [ready, setReady] = useState(false);
    if (!ready) {
      flow.setEmail(email);
      flow.setCode(code);
      setReady(true);
    }
    return ready ? <ResetPasswordScreen /> : null;
  }
  const renderScreen = (width = WIDE, code = MOCK_RESET_CODE) =>
    render(
      <ForgotPasswordProvider>
        <Verified code={code} />
      </ForgotPasswordProvider>,
      width,
    );

  test('"Back to log in" returns to Login without saving', async () => {
    const root = await renderScreen(PHONE);

    await press(findText(root, 'Back to log in'));

    expect(mockParent.popTo).toHaveBeenCalledWith('Login');
  });

  test('weak or mismatched passwords show errors and stay put', async () => {
    const root = await renderScreen();

    await type(root, 'Create a new password', 'short');
    await type(root, 'Re-enter new password', 'other');
    await press(findText(root, 'Confirm new password'));

    expect(allText(root)).toContain('Password does not meet the rules below');
    expect(allText(root)).toContain('Passwords do not match');
    expect(mockParent.popTo).not.toHaveBeenCalled();
  });

  test('a valid new password is saved with the email and code, then Login', async () => {
    const spy = jest.spyOn(authApi, 'resetPassword');
    const root = await renderScreen();

    await type(root, 'Create a new password', 'newpass123');
    await type(root, 'Re-enter new password', 'newpass123');
    await press(findText(root, 'Confirm new password'));

    expect(spy).toHaveBeenCalledWith(
      'owner@abc.com',
      MOCK_RESET_CODE,
      'newpass123',
    );
    expect(mockParent.popTo).toHaveBeenCalledWith('Login');
  });

  test('an expired code shows the error and stays put', async () => {
    const root = await renderScreen(WIDE, '999999');

    await type(root, 'Create a new password', 'newpass123');
    await type(root, 'Re-enter new password', 'newpass123');
    await press(findText(root, 'Confirm new password'));

    expect(allText(root)).toContain(
      'That code is not right or has expired. Ask for a new one.',
    );
    expect(mockParent.popTo).not.toHaveBeenCalled();
  });

  test('opened without a code: back to the email step', async () => {
    const root = await render(
      <ForgotPasswordProvider>
        <ResetPasswordScreen />
      </ForgotPasswordProvider>,
      WIDE,
    );

    await type(root, 'Create a new password', 'newpass123');
    await type(root, 'Re-enter new password', 'newpass123');
    await press(findText(root, 'Confirm new password'));

    expect(mockNavigation.popTo).toHaveBeenCalledWith('ForgotPassword');
  });
});

describe('CodeInput', () => {
  function Harness({ initial = '' }: { initial?: string }) {
    const [code, setCode] = useState(initial);
    return (
      <>
        <CodeInput value={code} onChange={setCode} />
        <RN.Text testID="code">{code}</RN.Text>
      </>
    );
  }
  const codeOf = (root: ReactTestInstance) =>
    root.findByProps({ testID: 'code' }).props.children;

  test('typing a digit fills the box and ignores non-digits', async () => {
    const root = await render(<Harness />, WIDE);

    await typeInBox(root, 0, '7');
    await typeInBox(root, 1, 'a');

    expect(codeOf(root)).toBe('7');
  });

  test('pasting spreads digits from the box onwards and caps at 6', async () => {
    const root = await render(<Harness initial="12" />, WIDE);

    await typeInBox(root, 2, '3456789');

    expect(codeOf(root)).toBe('123456');
  });

  test('clearing a box drops it and everything after it', async () => {
    const root = await render(<Harness initial="123456" />, WIDE);

    await typeInBox(root, 3, '');

    expect(codeOf(root)).toBe('123');
  });

  test('Backspace on an empty box removes the previous digit', async () => {
    const root = await render(<Harness initial="12" />, WIDE);

    await ReactTestRenderer.act(() => {
      digitBoxes(root)[2].props.onKeyPress({
        nativeEvent: { key: 'Backspace' },
      });
    });

    expect(codeOf(root)).toBe('1');
  });

  test('each box is labelled for screen readers', async () => {
    const root = await render(<Harness />, WIDE);
    expect(digitBoxes(root).map(box => box.props.accessibilityLabel)).toEqual(
      [1, 2, 3, 4, 5, 6].map(n => `Digit ${n} of 6`),
    );
  });
});
