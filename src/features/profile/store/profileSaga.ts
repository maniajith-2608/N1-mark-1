import type { PayloadAction } from '@reduxjs/toolkit';
import { call, put, takeLatest } from 'redux-saga/effects';
import { errorMessage } from '../../../shared/store';
import { profileApi } from '../api/profileApi';
import type {
  MyProfile,
  Organization,
  OrganizationUpdate,
  PasswordChangeInput,
  ProfileInput,
  Session,
} from '../types';
import { profileActions } from './profileSlice';

export function* fetchSession() {
  try {
    const session: Session = yield call(profileApi.fetchSession);
    yield put(profileActions.fetchSessionSuccess(session));
  } catch (error) {
    yield put(
      profileActions.fetchSessionFailure(
        errorMessage(error, 'Failed to load your profile'),
      ),
    );
  }
}

export function* updateOrganization(action: PayloadAction<OrganizationUpdate>) {
  try {
    const organization: Organization = yield call(
      profileApi.updateOrganization,
      action.payload,
    );
    yield put(profileActions.updateOrganizationSuccess(organization));
  } catch (error) {
    yield put(
      profileActions.updateOrganizationFailure(
        errorMessage(error, 'Failed to save the organization'),
      ),
    );
  }
}

export function* updateProfile(action: PayloadAction<ProfileInput>) {
  try {
    const profile: MyProfile = yield call(
      profileApi.updateProfile,
      action.payload,
    );
    yield put(profileActions.updateProfileSuccess(profile));
  } catch (error) {
    yield put(
      profileActions.updateProfileFailure(
        errorMessage(error, 'Failed to save your profile'),
      ),
    );
  }
}

export function* changePassword(action: PayloadAction<PasswordChangeInput>) {
  try {
    yield call(profileApi.changePassword, action.payload);
    yield put(profileActions.changePasswordSuccess());
  } catch (error) {
    yield put(
      profileActions.changePasswordFailure(
        errorMessage(error, 'Failed to change your password'),
      ),
    );
  }
}

export default function* profileSaga() {
  yield takeLatest(profileActions.fetchSessionRequest.type, fetchSession);
  yield takeLatest(profileActions.updateProfileRequest.type, updateProfile);
  yield takeLatest(
    profileActions.updateOrganizationRequest.type,
    updateOrganization,
  );
  yield takeLatest(profileActions.changePasswordRequest.type, changePassword);
}
