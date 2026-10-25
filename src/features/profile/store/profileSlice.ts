import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RequestStatus } from '../../../shared/types';
import type {
  MyProfile,
  Organization,
  OrganizationUpdate,
  PasswordChangeInput,
  ProfileInput,
  PermissionCode,
  Session,
} from '../types';

export type ProfileState = {
  profile: MyProfile | null;
  organization: Organization | null;
  /** me.permissions; see selectHasPermission. */
  permissions: PermissionCode[];
  status: RequestStatus;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  changingPassword: boolean;
  passwordError: string | null;
  /** Set by logout; the auth flow takes over from here. */
  signedOut: boolean;
};

const initialState: ProfileState = {
  profile: null,
  organization: null,
  permissions: [],
  status: 'idle',
  error: null,
  saving: false,
  saveError: null,
  changingPassword: false,
  passwordError: null,
  signedOut: false,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    fetchSessionRequest: state => {
      state.status = 'loading';
      state.error = null;
    },
    fetchSessionSuccess: (state, action: PayloadAction<Session>) => {
      state.profile = action.payload.profile;
      state.organization = action.payload.organization;
      state.permissions = action.payload.permissions;
      state.status = 'succeeded';
      state.signedOut = false;
    },
    fetchSessionFailure: (state, action: PayloadAction<string>) => {
      state.status = 'failed';
      state.error = action.payload;
    },
    updateOrganizationRequest: (
      state,
      _action: PayloadAction<OrganizationUpdate>,
    ) => {
      state.saving = true;
      state.saveError = null;
    },
    updateOrganizationSuccess: (state, action: PayloadAction<Organization>) => {
      state.organization = action.payload;
      state.saving = false;
    },
    updateOrganizationFailure: (state, action: PayloadAction<string>) => {
      state.saving = false;
      state.saveError = action.payload;
    },
    updateProfileRequest: (state, _action: PayloadAction<ProfileInput>) => {
      state.saving = true;
      state.saveError = null;
    },
    updateProfileSuccess: (state, action: PayloadAction<MyProfile>) => {
      state.profile = action.payload;
      state.saving = false;
    },
    updateProfileFailure: (state, action: PayloadAction<string>) => {
      state.saving = false;
      state.saveError = action.payload;
    },
    changePasswordRequest: (
      state,
      _action: PayloadAction<PasswordChangeInput>,
    ) => {
      state.changingPassword = true;
      state.passwordError = null;
    },
    changePasswordSuccess: state => {
      state.changingPassword = false;
      if (state.profile) {
        state.profile.hasPassword = true;
      }
    },
    changePasswordFailure: (state, action: PayloadAction<string>) => {
      state.changingPassword = false;
      state.passwordError = action.payload;
    },
    /** Clears the session; the auth flow should also listen for this. */
    logout: () => ({ ...initialState, signedOut: true }),
  },
});

export const profileActions = profileSlice.actions;
export default profileSlice.reducer;
