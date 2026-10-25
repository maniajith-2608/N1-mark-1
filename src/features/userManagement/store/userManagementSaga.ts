import { all, takeLatest } from 'redux-saga/effects';
import { createCrudSaga } from '../../../shared/store';
import { userManagementApi } from '../api/userManagementApi';
import { userActions } from './userManagementSlice';

export const usersSaga = createCrudSaga(
  userActions,
  userManagementApi,
  'users',
);

export default function* watchUsers() {
  yield all([
    usersSaga.watch(),
    // "Delete" deactivates on the backend; reload so the person shows as Inactive.
    takeLatest(userActions.deleteSuccess.type, usersSaga.fetchAll),
  ]);
}
