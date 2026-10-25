import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS, APP_VERSION } from '../../config';

/** One wrong field from a VALIDATION_FAILED error. */
export type ApiErrorDetail = { path: string; message: string };

// Uniform error shape so sagas and screens never deal with raw AxiosErrors.
export class ApiError extends Error {
  status?: number;
  data?: unknown;
  /** The backend's error code, e.g. "VALIDATION_FAILED" or "UNAUTHENTICATED". */
  code?: string;
  /** Quote it in bug reports; the backend team finds the exact call by it. */
  requestId?: string;
  details?: ApiErrorDetail[];

  constructor(
    message: string,
    status?: number,
    data?: unknown,
    extra: Pick<ApiError, 'code' | 'requestId' | 'details'> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = extra.code;
    this.requestId = extra.requestId;
    this.details = extra.details;
  }
}

type BackendError = {
  code?: string;
  message?: string;
  requestId?: string;
  details?: ApiErrorDetail[];
};

/**
 * The error in a backend response body: REST routes send
 * `{ error: { code, message, requestId } }`, GraphQL sends
 * `{ errors: [{ message, extensions: { code, requestId, details } }] }`.
 */
export function readBackendError(data: unknown): BackendError | undefined {
  const body = data as {
    error?: BackendError;
    errors?: { message?: string; extensions?: BackendError }[];
  } | null;
  if (body?.error) {
    return body.error;
  }
  const first = body?.errors?.[0];
  return first ? { message: first.message, ...first.extensions } : undefined;
}

/** "The request has invalid fields: initialPassword: Too small…" */
export function toApiError(status: number | undefined, data: unknown) {
  const backend = readBackendError(data);
  const message = backend?.message ?? `Request failed with status ${status}`;
  const details = (backend?.details ?? [])
    .map(d => `${d.path.replace(/^input\./, '')}: ${d.message}`)
    .join('; ');
  return new ApiError(
    details ? `${message.replace(/\.$/, '')}: ${details}` : message,
    status,
    data,
    backend,
  );
}

export type AuthTokens = { accessToken: string; refreshToken: string };

let authTokens: AuthTokens | null = null;
let tokensListener: ((tokens: AuthTokens | null) => void) | undefined;

// Call after login/logout; the request interceptor picks it up.
export function setAuthTokens(tokens: AuthTokens | null) {
  authTokens = tokens;
}

export function getAuthTokens() {
  return authTokens;
}

/** Told when a refresh renews the tokens, or ends the session (null). */
export function setAuthTokensListener(
  listener: ((tokens: AuthTokens | null) => void) | undefined,
) {
  tokensListener = listener;
}

const BASE_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'x-app-version': APP_VERSION,
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: BASE_HEADERS,
});

apiClient.interceptors.request.use(config => {
  if (authTokens) {
    config.headers.Authorization = `Bearer ${authTokens.accessToken}`;
  }
  return config;
});

type RefreshResponse = AuthTokens & { expiresIn: number };

// Concurrent 401s share one refresh, since each refresh token works once.
let refreshing: Promise<AuthTokens | null> | null = null;

/**
 * Swaps the refresh token for new tokens. Resolves null when the session is
 * over (the listener is told), or the old tokens when the network failed.
 */
function refreshTokens(): Promise<AuthTokens | null> {
  const current = authTokens;
  if (!current) {
    tokensListener?.(null);
    return Promise.resolve(null);
  }
  refreshing ??= axios
    .post<RefreshResponse>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken: current.refreshToken, client: 'app' },
      { timeout: API_TIMEOUT_MS, headers: BASE_HEADERS },
    )
    .then(
      ({ data }) => {
        authTokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        };
        tokensListener?.(authTokens);
        return authTokens;
      },
      (error: AxiosError) => {
        if (!error.response) {
          return current;
        }
        authTokens = null;
        tokensListener?.(null);
        return null;
      },
    )
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type RetriableConfig = InternalAxiosRequestConfig & { retried?: boolean };

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    // An expired access token: refresh once and replay the request with the
    // same headers (so a save keeps its Idempotency-Key).
    if (
      error.response?.status === 401 &&
      config &&
      !config.retried &&
      !config.url?.startsWith('/auth/')
    ) {
      config.retried = true;
      const tokens = await refreshTokens();
      if (tokens) {
        return apiClient(config);
      }
    }
    if (error.response) {
      return Promise.reject(
        toApiError(error.response.status, error.response.data),
      );
    }
    if (error.code === AxiosError.ECONNABORTED) {
      return Promise.reject(new ApiError('Request timed out'));
    }
    return Promise.reject(new ApiError('Network error, please try again'));
  },
);

export default apiClient;
