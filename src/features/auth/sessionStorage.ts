import type { AuthTokens } from '../../services/api';
import { USER_ROLES, type UserRole } from './constants';

const KEY = 'n1.session.role';
const TOKENS_KEY = 'n1.session.tokens';

/** The part of the browser's localStorage used here. */
type KeyValueStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};
const ROLES = Object.values(USER_ROLES) as string[];

// Web keeps the signed-in role across refreshes; native (and tests) have no
// localStorage, so the session lasts until the app closes.
function storage(): KeyValueStorage | null {
  try {
    return (
      (globalThis as { localStorage?: KeyValueStorage }).localStorage ?? null
    );
  } catch {
    return null;
  }
}

export function loadSessionRole(): UserRole | null {
  try {
    const value = storage()?.getItem(KEY) ?? null;
    return value && ROLES.includes(value) ? (value as UserRole) : null;
  } catch {
    return null;
  }
}

export function saveSessionRole(role: UserRole | null) {
  try {
    if (role) {
      storage()?.setItem(KEY, role);
    } else {
      storage()?.removeItem(KEY);
    }
  } catch {
    // Storage blocked (private mode): the session just won't survive a refresh.
  }
}

// The sign-in tokens, so a page refresh stays signed in. A saved role without
// them ends at the first API call (the client finds nothing to refresh with).
export function loadSessionTokens(): AuthTokens | null {
  try {
    const value = storage()?.getItem(TOKENS_KEY);
    const tokens = value ? (JSON.parse(value) as Partial<AuthTokens>) : null;
    return tokens?.accessToken && tokens.refreshToken
      ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
      : null;
  } catch {
    return null;
  }
}

export function saveSessionTokens(tokens: AuthTokens | null) {
  try {
    if (tokens) {
      storage()?.setItem(TOKENS_KEY, JSON.stringify(tokens));
    } else {
      storage()?.removeItem(TOKENS_KEY);
    }
  } catch {
    // As above.
  }
}
