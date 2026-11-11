import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';
import apiClient, { ApiError } from '../apiClient';
import { graphqlRequest } from '../graphql';
import {
  BACKEND_WAKING_CODE,
  WAKE_POLL_MS,
  WAKE_STATUS_PATH,
  WAKE_TIMEOUT_MS,
  getBackendWakeState,
  isWakingResponse,
  retryBackendWake,
  waitForBackendReady,
} from '../wakeup';

type Reply = { status: number; contentType?: string; body: unknown; headers?: Record<string, string> };

let backendReady = true;
let handler: (config: InternalAxiosRequestConfig) => Reply;

function reply(config: InternalAxiosRequestConfig, r: Reply) {
  const headers = new AxiosHeaders({
    'content-type': r.contentType ?? 'application/json',
    ...r.headers,
  });
  const response = { data: r.body, status: r.status, statusText: '', headers, config };
  if (r.status >= 400) {
    throw new AxiosError('failed', 'ERR_BAD_RESPONSE', config, null, response);
  }
  return response;
}

// Routes both the API client and the plain axios probe through one fake backend.
const router: AxiosAdapter = async config => {
  if (String(config.url).endsWith(WAKE_STATUS_PATH)) {
    return {
      data: backendReady ? '{"ready": true}' : '{"ready": false}',
      status: 200,
      statusText: '',
      headers: {},
      config,
    };
  }
  return reply(config, handler(config));
};

const WAKING_HTML: Reply = {
  status: 503,
  contentType: 'text/html; charset=utf-8',
  body: '<html>Waking up</html>',
};

beforeEach(() => {
  backendReady = true;
  handler = () => ({ status: 200, body: { ok: true } });
  apiClient.defaults.adapter = router;
  axios.defaults.adapter = router;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('isWakingResponse', () => {
  test('detects the X-N1-Waking header', () => {
    expect(isWakingResponse(200, { 'x-n1-waking': '1' })).toBe(true);
  });

  test('ignores the header when its value is not 1', () => {
    expect(isWakingResponse(200, { 'x-n1-waking': '0' })).toBe(false);
  });

  test('detects an HTML 503 from the proxy', () => {
    expect(isWakingResponse(503, { 'content-type': 'text/html' })).toBe(true);
  });

  test('detects HTML 502 and 504 too', () => {
    expect(isWakingResponse(502, { 'content-type': 'text/html' })).toBe(true);
    expect(isWakingResponse(504, { 'content-type': 'text/html' })).toBe(true);
  });

  test('a JSON 503 is not a waking response', () => {
    expect(isWakingResponse(503, { 'content-type': 'application/json' })).toBe(false);
  });

  test('an HTML 500 is not a waking response', () => {
    expect(isWakingResponse(500, { 'content-type': 'text/html' })).toBe(false);
  });
});

describe('wake-up in the shared API client', () => {
  test('a GET is retried automatically once the backend is ready', async () => {
    let calls = 0;
    handler = () => {
      calls++;
      return calls === 1 ? WAKING_HTML : { status: 200, body: { name: 'ada' } };
    };

    const response = await apiClient.get('/me');

    expect(response.data).toEqual({ name: 'ada' });
    expect(calls).toBe(2);
    expect(getBackendWakeState().status).toBe('idle');
  });

  test('a waking response that carries the header is also retried', async () => {
    let calls = 0;
    handler = () => {
      calls++;
      return calls === 1
        ? { status: 200, body: 'not json', headers: { 'x-n1-waking': '1' } }
        : { status: 200, body: { ok: 1 } };
    };

    await expect(apiClient.get('/me')).resolves.toMatchObject({ data: { ok: 1 } });
    expect(calls).toBe(2);
  });

  test('a GraphQL mutation is never replayed automatically', async () => {
    const seenKeys: unknown[] = [];
    handler = config => {
      seenKeys.push(config.headers['Idempotency-Key']);
      return WAKING_HTML;
    };

    const error = await graphqlRequest(
      'mutation Save { save { id } }',
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: BACKEND_WAKING_CODE,
      message: 'Please check and try again',
    });
    expect(seenKeys).toHaveLength(1);
  });

  test('a manual retry of a mutation reuses the same Idempotency-Key', async () => {
    const seenKeys: unknown[] = [];
    let calls = 0;
    handler = config => {
      calls++;
      seenKeys.push(config.headers['Idempotency-Key']);
      return calls === 1 ? WAKING_HTML : { status: 200, body: { data: { save: { id: '1' } } } };
    };

    const error = (await graphqlRequest('mutation Save { save { id } }').catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(error.retry).toBeDefined();

    await expect(error.retry?.()).resolves.toEqual({ save: { id: '1' } });
    expect(seenKeys).toHaveLength(2);
    expect(seenKeys[0]).toBeTruthy();
    expect(seenKeys[1]).toBe(seenKeys[0]);
  });

  test('a GraphQL query is retried automatically after the wake-up', async () => {
    let calls = 0;
    handler = () => {
      calls++;
      return calls === 1 ? WAKING_HTML : { status: 200, body: { data: { me: { id: '1' } } } };
    };

    await expect(graphqlRequest('query Me { me { id } }')).resolves.toEqual({
      me: { id: '1' },
    });
    expect(calls).toBe(2);
  });

  test('a mutation sent over REST is never replayed automatically', async () => {
    let calls = 0;
    handler = () => {
      calls++;
      return WAKING_HTML;
    };

    await expect(apiClient.post('/orders', { a: 1 })).rejects.toMatchObject({
      code: BACKEND_WAKING_CODE,
    });
    expect(calls).toBe(1);
  });

  test('a JSON 503 keeps its normal error and does not wake the app', async () => {
    handler = () => ({
      status: 503,
      contentType: 'application/json',
      body: { error: { code: 'DB_DOWN', message: 'down' } },
    });

    await expect(apiClient.get('/me')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      code: 'DB_DOWN',
    });
    expect(getBackendWakeState().status).toBe('idle');
  });

  test('a normal JSON 404 is unchanged', async () => {
    handler = () => ({
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'missing' } },
    });

    await expect(apiClient.get('/x')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('wake-up timeout and retry', () => {
  test('after 120 s the state becomes timeout, and retry resumes the request', async () => {
    jest.useFakeTimers();
    backendReady = false;
    let calls = 0;
    handler = () => {
      calls++;
      return calls === 1 ? WAKING_HTML : { status: 200, body: { ok: true } };
    };

    const pending = apiClient.get('/me');
    await jest.advanceTimersByTimeAsync(WAKE_TIMEOUT_MS + WAKE_POLL_MS);
    expect(getBackendWakeState().status).toBe('timeout');

    backendReady = true;
    retryBackendWake();
    await jest.advanceTimersByTimeAsync(WAKE_POLL_MS);

    await expect(pending).resolves.toMatchObject({ data: { ok: true } });
    expect(getBackendWakeState().status).toBe('idle');
  });

  test('the waiting state polls /__wake/status every 3 s', async () => {
    jest.useFakeTimers();
    backendReady = false;
    const probes: number[] = [];
    const counting: AxiosAdapter = async config => {
      if (String(config.url).endsWith(WAKE_STATUS_PATH)) {
        probes.push(Date.now());
        return router(config);
      }
      return router(config);
    };
    axios.defaults.adapter = counting;

    const ready = waitForBackendReady();
    await jest.advanceTimersByTimeAsync(WAKE_POLL_MS * 3);
    expect(probes.length).toBeGreaterThanOrEqual(4);

    backendReady = true;
    await jest.advanceTimersByTimeAsync(WAKE_POLL_MS);
    await expect(ready).resolves.toBeUndefined();
  });
});

describe('waitForBackendReady (shared with WebSocket reconnects)', () => {
  test('resolves at once when the backend is already awake', async () => {
    await expect(waitForBackendReady()).resolves.toBeUndefined();
    expect(getBackendWakeState().status).toBe('idle');
  });
});
