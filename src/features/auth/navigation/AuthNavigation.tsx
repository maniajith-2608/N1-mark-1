import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CreateOrganizationScreen from '../screens/CreateOrganizationScreen';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordNavigation from './ForgotPasswordNavigation';
import type { AuthStackParamList } from '../types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="CreateOrganization"
        component={CreateOrganizationScreen}
        options={{ title: 'Create Organization' }}
      />
      <Stack.Screen
        name="ForgotPasswordFlow"
        component={ForgotPasswordNavigation}
      />
    </Stack.Navigator>
  );
}

export default React.memo(AuthNavigation);
