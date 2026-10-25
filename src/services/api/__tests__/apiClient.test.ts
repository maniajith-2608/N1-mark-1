import axios, {
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';
import apiClient, {
  ApiError,
  setAuthTokens,
  setAuthTokensListener,
} from '../apiClient';
import { graphqlRequest } from '../graphql';

function useAdapter(adapter: AxiosAdapter) {
  apiClient.defaults.adapter = adapter;
}

function respond(config: InternalAxiosRequestConfig, status: number) {
  return {
    data: { ok: status < 400 },
    status,
    statusText: '',
    headers: {},
    config,
  };
}

const TOKENS = { accessToken: 'abc', refreshToken: 'r1' };

afterEach(() => {
  setAuthTokens(null);
  setAuthTokensListener(undefined);
});

test('attaches the auth token when set', async () => {
  let sentAuth: unknown;
  useAdapter(async config => {
    sentAuth = config.headers.Authorization;
    return respond(config, 200);
  });

  setAuthTokens(TOKENS);
  await apiClient.get('/me');

  expect(sentAuth).toBe('Bearer abc');
});

test('omits the auth header when no token is set', async () => {
  let sentAuth: unknown = 'unset';
  useAdapter(async config => {
    sentAuth = config.headers.Authorization;
    return respond(config, 200);
  });

  await apiClient.get('/me');

  expect(sentAuth).toBeUndefined();
});

test('turns HTTP errors into ApiError with status', async () => {
  useAdapter(async config => {
    const { AxiosError } = jest.requireActual('axios');
    throw new AxiosError(
      'fail',
      'ERR_BAD_RESPONSE',
      config,
      null,
      respond(config, 404),
    );
  });

  await expect(apiClient.get('/missing')).rejects.toMatchObject({
    name: 'ApiError',
    status: 404,
  });
});

test('turns network failures into ApiError', async () => {
  useAdapter(async config => {
    const { AxiosError } = jest.requireActual('axios');
    throw new AxiosError('down', 'ERR_NETWORK', config);
  });

  await expect(apiClient.get('/x')).rejects.toBeInstanceOf(ApiError);
});

/** An AxiosError for this response, as the HTTP adapter would throw it. */
function httpError(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
) {
  const { AxiosError } = jest.requireActual('axios');
  return new AxiosError('fail', 'ERR_BAD_REQUEST', config, null, {
    ...respond(config, status),
    data,
  });
}

const UNAUTHENTICATED = {
  errors: [
    { message: 'Sign in again.', extensions: { code: 'UNAUTHENTICATED' } },
  ],
};

test('sends the app version on every request', async () => {
  let sentVersion: unknown;
  useAdapter(async config => {
    sentVersion = config.headers['x-app-version'];
    return respond(config, 200);
  });

  await apiClient.get('/me');

  expect(sentVersion).toMatch(/^\d+\.\d+\.\d+$/);
});

test('an expired token is refreshed once and the request replayed', async () => {
  const sent: { auth: unknown; key: unknown }[] = [];
  useAdapter(async config => {
    sent.push({
      auth: config.headers.Authorization,
      key: config.headers['Idempotency-Key'],
    });
    if (config.headers.Authorization === 'Bearer abc') {
      throw httpError(config, 401, UNAUTHENTICATED);
    }
    return { ...respond(config, 200), data: { data: { ok: true } } };
  });
  let refreshBody: unknown;
  axios.defaults.adapter = async config => {
    refreshBody = JSON.parse(config.data);
    return {
      ...respond(config, 200),
      data: { accessToken: 'def', refreshToken: 'r2', expiresIn: 900 },
    };
  };
  const listener = jest.fn();
  setAuthTokensListener(listener);
  setAuthTokens(TOKENS);

  await expect(graphqlRequest('mutation M { m }')).resolves.toEqual({
    ok: true,
  });

  expect(refreshBody).toEqual({ refreshToken: 'r1', client: 'app' });
  expect(sent.map(s => s.auth)).toEqual(['Bearer abc', 'Bearer def']);
  // The replay keeps the Idempotency-Key, so the save can't apply twice.
  expect(sent[0].key).toEqual(expect.any(String));
  expect(sent[1].key).toBe(sent[0].key);
  expect(listener).toHaveBeenCalledWith({
    accessToken: 'def',
    refreshToken: 'r2',
  });
});

test('a refused refresh ends the session', async () => {
  useAdapter(async config => {
    throw httpError(config, 401, UNAUTHENTICATED);
  });
  axios.defaults.adapter = async config => {
    throw httpError(config, 401, { error: { code: 'UNAUTHENTICATED' } });
  };
  const listener = jest.fn();
  setAuthTokensListener(listener);
  setAuthTokens(TOKENS);

  await expect(apiClient.get('/me')).rejects.toMatchObject({
    status: 401,
    code: 'UNAUTHENTICATED',
  });
  expect(listener).toHaveBeenCalledWith(null);
});

test('GraphQL errors become an ApiError with code, requestId and field details', async () => {
  useAdapter(async config =>
    Promise.reject(
      httpError(config, 400, {
        data: null,
        errors: [
          {
            message: 'The request has invalid fields.',
            extensions: {
              code: 'VALIDATION_FAILED',
              requestId: 'req-1',
              details: [
                { path: 'input.initialPassword', message: 'Too short' },
              ],
            },
          },
        ],
      }),
    ),
  );

  await expect(graphqlRequest('mutation M { m }')).rejects.toMatchObject({
    code: 'VALIDATION_FAILED',
    requestId: 'req-1',
    message: 'The request has invalid fields: initialPassword: Too short',
  });
});

test('queries carry no Idempotency-Key', async () => {
  let key: unknown = 'unset';
  useAdapter(async config => {
    key = config.headers['Idempotency-Key'];
    return { ...respond(config, 200), data: { data: { me: {} } } };
  });

  await graphqlRequest('query Q { me { id } }');

  expect(key).toBeUndefined();
});
