import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminScreenBackground } from '../../shared/components';
import {
  EmployeeProfileScreen,
  EmployeeRoleProvider,
  type EmployeeRole,
} from '../../features/profile';
import type { RoleScreen } from './roleScreens';
import type { RoleStackParamList } from './types';

const Stack = createNativeStackNavigator<RoleStackParamList>();

type Props = {
  role: EmployeeRole;
  /** The role's jobs screen, where it lands on login. */
  home: React.ComponentType;
  /** The role's own screens, opened over its home. */
  screens?: RoleScreen[];
};

/**
 * One non-admin role: its jobs home (no tab bar; the header's initials open
 * Profile), with Profile (read-only) and the role's own screens opening
 * over it. The shared profile screens read the role from
 * EmployeeRoleProvider.
 */
function RoleNavigation({ role, home, screens = [] }: Props) {
  return (
    <EmployeeRoleProvider value={role}>
      {/* Admin screens reused here (job card, flow) sit on white. */}
      <AdminScreenBackground.Provider value="surface">
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={home} />
          <Stack.Screen name="Profile" component={EmployeeProfileScreen} />
          {screens.map(screen => (
            <Stack.Screen
              key={screen.name}
              name={screen.name}
              component={screen.component}
            />
          ))}
        </Stack.Navigator>
      </AdminScreenBackground.Provider>
    </EmployeeRoleProvider>
  );
}

export default React.memo(RoleNavigation);
