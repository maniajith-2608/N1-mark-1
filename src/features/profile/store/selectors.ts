import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../../app/store';
import { ROLE_LABELS } from '../../auth/constants';

export const selectProfileState = (state: RootState) => state.profile;
export const selectMyProfile = (state: RootState) => state.profile.profile;
export const selectOrganization = (state: RootState) =>
  state.profile.organization;

/** Name, email and "Admin · ABC Engineering" for the admin shell. */
export const selectShellUser = createSelector(
  [selectMyProfile, selectOrganization],
  (profile, organization) =>
    profile && {
      name: profile.name,
      email: profile.email,
      subtitle: [ROLE_LABELS[profile.role], organization?.shortName]
        .filter(Boolean)
        .join(' · '),
    },
);

const selectAdminPermissions = (state: RootState) => state.profile.permissions;
const selectEmployeePermissions = (state: RootState) =>
  state.employeeProfile.permissions;

/**
 * The signed-in person's permission codes (me.permissions), from whichever
 * profile their area loaded: My profile for admins, Profile for the others.
 * Empty until that loads.
 */
export const selectMyPermissions = createSelector(
  [selectAdminPermissions, selectEmployeePermissions],
  (admin, employee) => (admin.length ? admin : employee),
);

/**
 * Show or hide an action by permission, not by role name (guide section 5,
 * rule 8): `useAppSelector(s => selectHasPermission(s, 'customers.write'))`.
 */
export const selectHasPermission = (state: RootState, code: string) =>
  selectMyPermissions(state).includes(code);
