import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RequestStatus } from '../../../shared/types';
import type {
  EmployeeProfile,
  EmployeeProfileInput,
  EmployeeRole,
  EmployeeSession,
  PermissionCode,
} from '../types';

export type EmployeeProfileState = {
  profile: EmployeeProfile | null;
  /** me.permissions; see selectHasPermission. */
  permissions: PermissionCode[];
  status: RequestStatus;
  error: string | null;
  saving: boolean;
  saveError: string | null;
};

const initialState: EmployeeProfileState = {
  profile: null,
  permissions: [],
  status: 'idle',
  error: null,
  saving: false,
  saveError: null,
};

export type EmployeeProfileUpdate = {
  role: EmployeeRole;
  changes: EmployeeProfileInput;
};

const employeeProfileSlice = createSlice({
  name: 'employeeProfile',
  initialState,
  reducers: {
    fetchRequest: (state, _action: PayloadAction<EmployeeRole>) => {
      state.status = 'loading';
      state.error = null;
    },
    fetchSuccess: (state, action: PayloadAction<EmployeeSession>) => {
      state.profile = action.payload.profile;
      state.permissions = action.payload.permissions;
      state.status = 'succeeded';
    },
    fetchFailure: (state, action: PayloadAction<string>) => {
      state.status = 'failed';
      state.error = action.payload;
    },
    updateRequest: (state, _action: PayloadAction<EmployeeProfileUpdate>) => {
      state.saving = true;
      state.saveError = null;
    },
    updateSuccess: (state, action: PayloadAction<EmployeeProfile>) => {
      state.profile = action.payload;
      state.saving = false;
    },
    updateFailure: (state, action: PayloadAction<string>) => {
      state.saving = false;
      state.saveError = action.payload;
    },
    /** Clears the profile so the next login loads its own. */
    logout: () => initialState,
  },
});

export const employeeProfileActions = employeeProfileSlice.actions;
export default employeeProfileSlice.reducer;
