import axios, {
  AxiosHeaders,
  type AxiosResponseHeaders,
  type InternalAxiosRequestConfig,
  type RawAxiosHeaders,
  type RawAxiosResponseHeaders,
} from 'axios';
import { API_BASE_URL } from '../../config';

/** Set by the backend's proxy while the server is asleep. */
export const WAKING_HEADER = 'x-n1-waking';
const WAKING_STATUSES = [502, 503, 504];
export const WAKE_STATUS_PATH = '/__wake/status';
export const WAKE_POLL_MS = 3000;
export const WAKE_TIMEOUT_MS = 120000;
const WAKE_PROBE_TIMEOUT_MS = 10000;

export const BACKEND_WAKING_CODE = 'BACKEND_WAKING';
export const PLEASE_RETRY_MESSAGE = 'Please check and try again';

export type BackendWakeState =
  | { status: 'idle' }
  | { status: 'waking' }
  | { status: 'timeout' };

/**
 * Thrown from the response transform, before the body is parsed, so an HTML
 * error page from a sleeping server never reaches JSON.parse.
 */
export class BackendWakingError extends Error {
  readonly config: InternalAxiosRequestConfig;

  constructor(config: InternalAxiosRequestConfig) {
    super('Backend is waking up');
    this.name = 'BackendWakingError';
    this.config = config;
  }
}

/** True for the backend's waking header, or a 502/503/504 HTML page from the proxy. */
export function isWakingResponse(
  status: number | undefined,
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders,
): boolean {
  const read = AxiosHeaders.from(headers as unknown as RawAxiosHeaders);
  if (String(read.get(WAKING_HEADER) ?? '').trim() === '1') {
    return true;
  }
  const contentType = String(read.get('content-type') ?? '').toLowerCase();
  return (
    status !== undefined &&
    WAKING_STATUSES.includes(status) &&
    contentType.includes('text/html')
  );
}

/** Only exactly {"ready": true} counts; anything else keeps waiting. */
export function isReadyBody(data: unknown): boolean {
  let body = data;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return false;
    }
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return false;
  }
  return (
    Object.keys(body).length === 1 &&
    (body as { ready?: unknown }).ready === true
  );
}

type Deferred = { promise: Promise<void>; resolve: () => void };

let state: BackendWakeState = { status: 'idle' };
const listeners = new Set<() => void>();
// Everyone waiting on the same wake-up shares this one promise.
let waiter: Deferred | null = null;
// Bumped to invalidate in-flight probes and timers.
let generation = 0;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let deadlineTimer: ReturnType<typeof setTimeout> | undefined;

function setState(next: BackendWakeState) {
  state = next;
  listeners.forEach(listener => listener());
}

export function getBackendWakeState(): BackendWakeState {
  return state;
}

export function subscribeBackendWake(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function probeReady(): Promise<boolean> {
  try {
    const { data } = await axios.get<unknown>(
      `${API_BASE_URL}${WAKE_STATUS_PATH}`,
      { responseType: 'text', timeout: WAKE_PROBE_TIMEOUT_MS },
    );
    return isReadyBody(data);
  } catch {
    return false;
  }
}

function clearTimers() {
  clearTimeout(pollTimer);
  pollTimer = undefined;
}

function finish() {
  generation++;
  clearTimers();
  clearTimeout(deadlineTimer);
  deadlineTimer = undefined;
  const pending = waiter;
  waiter = null;
  setState({ status: 'idle' });
  pending?.resolve();
}

function onDeadline() {
  generation++;
  clearTimers();
  deadlineTimer = undefined;
  setState({ status: 'timeout' });
}

function enterWaking() {
  if (state.status === 'waking') {
    return;
  }
  setState({ status: 'waking' });
  deadlineTimer = setTimeout(onDeadline, WAKE_TIMEOUT_MS);
}

async function probe(gen: number) {
  const ready = await probeReady();
  if (gen !== generation) {
    return;
  }
  if (ready) {
    finish();
    return;
  }
  enterWaking();
  pollTimer = setTimeout(() => probe(gen), WAKE_POLL_MS);
}

function startProbing() {
  generation++;
  clearTimers();
  void probe(generation);
}

/**
 * Resolves once GET /__wake/status reports ready. The first probe runs at
 * once, so a live server resolves without showing the waiting screen. Shared
 * by API retries and WebSocket reconnects.
 */
export function waitForBackendReady(): Promise<void> {
  if (!waiter) {
    let resolve: () => void = () => {};
    const promise = new Promise<void>(done => {
      resolve = done;
    });
    waiter = { promise, resolve };
    startProbing();
  }
  return waiter.promise;
}

/** After a timeout, starts another 120 s window on the same waiters. */
export function retryBackendWake() {
  if (state.status === 'timeout' && waiter) {
    startProbing();
  }
}
