import { Platform } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { N1DatePicker } from '..';
import { PHONE, WIDE, press, render } from '../../testing/render';
import {
  allText,
  byLabel,
  byTestId,
  byText,
  hasTestId,
} from '../../testing/testUtils';

const os = Platform.OS;
afterEach(() => {
  Platform.OS = os;
});
/** The web's calendar; phones use the native picker. */
const onWeb = () => {
  Platform.OS = 'web';
};

const pad2 = (n: number) => String(n).padStart(2, '0');

test('web: opens on the chosen month, picks a day and moves between months', async () => {
  onWeb();
  const onChange = jest.fn();
  const root = await render(
    <N1DatePicker
      label="DC date"
      value="15/10/2026"
      onChange={onChange}
      testID="dc"
    />,
    WIDE,
  );
  expect(allText(byTestId(root, 'dc'))).toBe('15/10/2026');
  await press(byTestId(root, 'dc'));
  expect(allText(byTestId(root, 'dc-month'))).toBe('October 2026');
  expect(
    byLabel(root, '15 October 2026').props.accessibilityState.selected,
  ).toBe(true);
  await press(byLabel(root, 'Next month'));
  expect(allText(byTestId(root, 'dc-month'))).toBe('November 2026');
  await press(byLabel(root, '3 November 2026'));
  expect(onChange).toHaveBeenCalledWith('03/11/2026');
});

test('web: Today and Clear; an empty field shows the placeholder', async () => {
  onWeb();
  const onChange = jest.fn();
  const root = await render(
    <N1DatePicker value="" onChange={onChange} testID="due" />,
    WIDE,
  );
  expect(allText(byTestId(root, 'due'))).toBe('DD/MM/YYYY');
  await press(byTestId(root, 'due'));
  await press(byText(byTestId(root, 'due-calendar'), 'Today'));
  const now = new Date();
  expect(onChange).toHaveBeenLastCalledWith(
    `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`,
  );
  await press(byTestId(root, 'due'));
  await press(byText(byTestId(root, 'due-calendar'), 'Clear'));
  expect(onChange).toHaveBeenLastCalledWith('');
});

test('iOS: the date wheels slide up in a sheet; Done picks, Clear empties', async () => {
  Platform.OS = 'ios';
  const onChange = jest.fn();
  const root = await render(
    <N1DatePicker
      label="DC date"
      value="15/10/2026"
      onChange={onChange}
      testID="dc"
    />,
    PHONE,
  );
  await press(byTestId(root, 'dc'));
  // No calendar: the native wheels, starting on the chosen date.
  expect(hasTestId(root, 'dc-calendar')).toBe(false);
  const wheels = byTestId(root, 'dc-wheels');
  expect(wheels.props.display).toBe('spinner');
  expect(wheels.props.value).toEqual(new Date(2026, 9, 15));
  // Turning the wheels picks nothing until Done.
  await ReactTestRenderer.act(() =>
    wheels.props.onValueChange({}, new Date(2026, 10, 3)),
  );
  expect(onChange).not.toHaveBeenCalled();
  await press(byTestId(root, 'dc-done'));
  expect(onChange).toHaveBeenCalledWith('03/11/2026');
  await press(byTestId(root, 'dc'));
  await press(byTestId(root, 'dc-clear'));
  expect(onChange).toHaveBeenLastCalledWith('');
});

test('Android: opens the system date dialog', async () => {
  Platform.OS = 'android';
  const open = DateTimePickerAndroid.open as jest.Mock;
  open.mockClear();
  const onChange = jest.fn();
  const root = await render(
    <N1DatePicker value="" onChange={onChange} testID="due" />,
    PHONE,
  );
  await press(byTestId(root, 'due'));
  expect(open).toHaveBeenCalledTimes(1);
  const options = open.mock.calls[0][0];
  expect(options.mode).toBe('date');
  await ReactTestRenderer.act(() =>
    options.onValueChange({}, new Date(2026, 0, 9)),
  );
  expect(onChange).toHaveBeenCalledWith('09/01/2026');
});
