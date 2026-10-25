import type { PayloadAction } from '@reduxjs/toolkit';
import { call, put, takeLatest } from 'redux-saga/effects';
import { errorMessage } from '../../../shared/store';
import { employeeProfileApi } from '../api/employeeProfileApi';
import type { EmployeeProfile, EmployeeRole, EmployeeSession } from '../types';
import {
  employeeProfileActions,
  type EmployeeProfileUpdate,
} from './employeeProfileSlice';

export function* fetchEmployeeProfile(action: PayloadAction<EmployeeRole>) {
  try {
    const session: EmployeeSession = yield call(
      employeeProfileApi.fetchProfile,
      action.payload,
    );
    yield put(employeeProfileActions.fetchSuccess(session));
  } catch (error) {
    yield put(
      employeeProfileActions.fetchFailure(
        errorMessage(error, 'Failed to load your profile'),
      ),
    );
  }
}

export function* updateEmployeeProfile(
  action: PayloadAction<EmployeeProfileUpdate>,
) {
  try {
    const profile: EmployeeProfile = yield call(
      employeeProfileApi.updateProfile,
      action.payload.role,
      action.payload.changes,
    );
    yield put(employeeProfileActions.updateSuccess(profile));
  } catch (error) {
    yield put(
      employeeProfileActions.updateFailure(
        errorMessage(error, 'Failed to save your profile'),
      ),
    );
  }
}

export default function* employeeProfileSaga() {
  yield takeLatest(
    employeeProfileActions.fetchRequest.type,
    fetchEmployeeProfile,
  );
  yield takeLatest(
    employeeProfileActions.updateRequest.type,
    updateEmployeeProfile,
  );
}
