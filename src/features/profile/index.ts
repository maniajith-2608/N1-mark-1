// Public API of the Profile feature.
// Admin "My profile" and the signed-in session.
export { MyProfileScreen } from './screens/MyProfileScreen';
export { OrganizationScreen } from './screens/OrganizationScreen';
export { default as ProfileNavigation } from './navigation/ProfileNavigation';
export { useSession, useOrganizationName } from './hooks/useSession';
export { profileActions } from './store/profileSlice';

// Profile screens shared by the non-admin roles.
export { EmployeeProfileScreen } from './screens/EmployeeProfileScreen';
export { EmployeeHomeHeader } from './components/EmployeeHomeHeader';
export { EmployeeRoleProvider } from './context/EmployeeRoleContext';
export type {
  EmployeeProfileParamList,
  EmployeeRole,
  MyProfile,
  Organization,
  ProfileStackParamList,
  Session,
} from './types';
export { PROFILE_STRINGS } from './constants';
export { ORGANIZATION_STRINGS } from './organization';
