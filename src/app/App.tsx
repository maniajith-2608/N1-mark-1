/**
 * @format
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { AppProviders } from './providers';
import RootNavigator from './navigation/RootNavigator';
import { ServerWakeScreen } from '../shared/components/ServerWakeScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <AppProviders>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootNavigator />
      <ServerWakeScreen />
    </AppProviders>
  );
}

export default React.memo(App);
