import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AuthStackParamList } from '../../features/auth/types';
import type { AdminDrawerParamList } from '../../features/dashboard/types';
import type { JobsStackParamList } from '../../features/jobs/types';

// Each non-admin role: its jobs home (no tab bar), with Profile (from the
// header's initials; read-only) and the role's own screens (e.g. the
// Supervisor's job import flow) opening over it.
export type RoleStackParamList = {
  Home: undefined;
  Profile: undefined;
} & JobsStackParamList;

// Dashboard stack (nested inside the root "Dashboard" screen)
export type MainStackParamList = {
  Admin: NavigatorScreenParams<AdminDrawerParamList>;
  Supervisor: NavigatorScreenParams<RoleStackParamList>;
  Operator: NavigatorScreenParams<RoleStackParamList>;
  Qc: NavigatorScreenParams<RoleStackParamList>;
};

// Root stack
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Dashboard: NavigatorScreenParams<MainStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
