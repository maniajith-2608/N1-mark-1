import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROLE_HOME, useAuthSession } from '../../features/auth';
import AdminDashboardNavigation from './AdminDashboardNavigation';
import RoleNavigation from './RoleNavigation';
import {
  OPERATOR_SCREENS,
  QC_SCREENS,
  SUPERVISOR_SCREENS,
} from './roleScreens';
import { OPERATOR_HOME, QC_HOME, SUPERVISOR_HOME } from './roleHomes';
import type { MainStackParamList } from './types';

// One navigator per non-admin role, defined once so screens stay stable.
const SupervisorNavigation = React.memo(
  function SupervisorNavigationComponent() {
    return (
      <RoleNavigation
        role="supervisor"
        home={SUPERVISOR_HOME}
        screens={SUPERVISOR_SCREENS}
      />
    );
  },
);
const OperatorNavigation = React.memo(function OperatorNavigationComponent() {
  return (
    <RoleNavigation
      role="operator"
      home={OPERATOR_HOME}
      screens={OPERATOR_SCREENS}
    />
  );
});
const QcNavigation = React.memo(function QcNavigationComponent() {
  return <RoleNavigation role="qc" home={QC_HOME} screens={QC_SCREENS} />;
});

const Stack = createNativeStackNavigator<MainStackParamList>();

const ROLE_SCREENS: Record<
  keyof MainStackParamList,
  React.ComponentType<object>
> = {
  Admin: AdminDashboardNavigation,
  Supervisor: SupervisorNavigation,
  Operator: OperatorNavigation,
  Qc: QcNavigation,
};

/**
 * Only the signed-in role's area is registered, so Back, a typed URL or a
 * stale link can't reach another role's screens (e.g. a Supervisor opening
 * the admin dashboard). Nested inside the root stack's "Dashboard" screen,
 * so it must not create its own NavigationContainer.
 */
function MainStackNavigation() {
  const { role } = useAuthSession();
  if (!role) {
    return null;
  }
  const name = ROLE_HOME[role];
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={name} component={ROLE_SCREENS[name]} />
    </Stack.Navigator>
  );
}

export default React.memo(MainStackNavigation);
