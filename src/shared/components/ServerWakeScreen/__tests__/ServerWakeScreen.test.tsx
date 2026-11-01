import axios, { type AxiosAdapter } from 'axios';
import { ActivityIndicator, Modal } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {
  WAKE_POLL_MS,
  WAKE_TIMEOUT_MS,
  retryBackendWake,
  waitForBackendReady,
} from '../../../../services/api/wakeup';
import { ServerWakeScreen } from '../ServerWakeScreen';

const { act } = ReactTestRenderer;

let ready = false;
const statusAdapter: AxiosAdapter = async config => ({
  data: ready ? '{"ready": true}' : '{"ready": false}',
  status: 200,
  statusText: '',
  headers: {},
  config,
});

function modalVisible(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findByType(Modal).props.visible;
}

function screenText(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(renderer.toJSON());
}

function findRetryButton(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node => node.props.testID === 'server-wake-retry' && typeof node.props.onPress === 'function',
  )[0];
}

beforeEach(() => {
  jest.useFakeTimers();
  ready = false;
  axios.defaults.adapter = statusAdapter;
});

afterEach(async () => {
  // Let any pending wake-up wait finish so it does not leak into the next test.
  ready = true;
  await act(async () => {
    retryBackendWake();
    await jest.advanceTimersByTimeAsync(WAKE_POLL_MS);
  });
  jest.useRealTimers();
});

test('stays hidden while the backend is awake', async () => {
  ready = true;
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<ServerWakeScreen />);
    await waitForBackendReady();
  });

  expect(modalVisible(renderer)).toBe(false);
});

test('shows the "Getting ready" screen with a spinner while waking', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<ServerWakeScreen />);
    void waitForBackendReady();
    await jest.advanceTimersByTimeAsync(0);
  });

  expect(modalVisible(renderer)).toBe(true);
  expect(screenText(renderer)).toContain('Getting ready');
  expect(screenText(renderer)).not.toContain('Taking longer than usual');
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(1);
});

test('after 120 s shows "Taking longer than usual" with a Retry button', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<ServerWakeScreen />);
    void waitForBackendReady();
    await jest.advanceTimersByTimeAsync(WAKE_TIMEOUT_MS + WAKE_POLL_MS);
  });

  expect(modalVisible(renderer)).toBe(true);
  expect(screenText(renderer)).toContain('Taking longer than usual');
  expect(findRetryButton(renderer)).toBeDefined();
});

test('Retry restarts the wait and hides the screen once ready', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<ServerWakeScreen />);
    void waitForBackendReady();
    await jest.advanceTimersByTimeAsync(WAKE_TIMEOUT_MS + WAKE_POLL_MS);
  });

  ready = true;
  await act(async () => {
    findRetryButton(renderer).props.onPress();
    await jest.advanceTimersByTimeAsync(WAKE_POLL_MS);
  });

  expect(modalVisible(renderer)).toBe(false);
});
