import type { PayloadAction } from '@reduxjs/toolkit';
import { eventChannel, type EventChannel } from 'redux-saga';
import { call, fork, put, take, takeEvery } from 'redux-saga/effects';
import {
  getAuthTokens,
  setAuthTokens,
  setAuthTokensListener,
  type AuthTokens,
} from '../../../services/api';
import { authApi } from '../api/authApi';
import type { UserRole } from '../constants';
import {
  loadSessionTokens,
  saveSessionRole,
  saveSessionTokens,
} from '../sessionStorage';
import { sessionActions } from './sessionSlice';

/** Empty when the session ended; channels can't carry null. */
type TokensEvent = { tokens: AuthTokens | null };

function* saveSignIn(action: PayloadAction<UserRole>) {
  yield call(saveSessionRole, action.payload);
  yield call(saveSessionTokens, getAuthTokens());
}

function* saveSignOut() {
  yield call(saveSessionRole, null);
  yield call(saveSessionTokens, null);
  try {
    yield call(authApi.logout);
  } catch {
    // Already expired or offline: the tokens are gone from the app either way.
  }
}

/** The API client's token refreshes, and the end of the session. */
function tokensChannel(): EventChannel<TokensEvent> {
  return eventChannel(emit => {
    setAuthTokensListener(tokens => emit({ tokens }));
    return () => setAuthTokensListener(undefined);
  });
}

function* watchTokens() {
  const channel: EventChannel<TokensEvent> = yield call(tokensChannel);
  while (true) {
    const { tokens }: TokensEvent = yield take(channel);
    if (tokens) {
      yield call(saveSessionTokens, tokens);
    } else {
      yield put(sessionActions.signOut());
    }
  }
}

export default function* sessionSaga() {
  // A page refresh picks up where the saved session left off.
  setAuthTokens(loadSessionTokens());
  yield fork(watchTokens);
  yield takeEvery(sessionActions.signIn.type, saveSignIn);
  yield takeEvery(sessionActions.signOut.type, saveSignOut);
}
