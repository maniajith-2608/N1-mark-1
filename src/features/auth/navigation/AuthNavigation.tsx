import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordNavigation from './ForgotPasswordNavigation';
import type { AuthStackParamList } from '../types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

// No Create organization screen: shops are onboarded by the N1 team, not
// signed up from the app (guide section 6, Rule).
function AuthNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="ForgotPasswordFlow"
        component={ForgotPasswordNavigation}
      />
    </Stack.Navigator>
  );
}

export default React.memo(AuthNavigation);
