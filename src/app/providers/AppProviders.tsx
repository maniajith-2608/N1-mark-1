import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { DrawingRendererHost } from '../../features/orders/drawingStamp/renderer/DrawingRendererHost';
import { N1ThemeProvider } from '../../theme';
import { store } from '../store';

type Props = {
  children: ReactNode;
};

// Global providers, outermost first: Redux store, gestures, safe area, theme.
// Beside the app: the hidden WebView that draws PDF drawings on Android.
function AppProviders({ children }: Props) {
  return (
    <Provider store={store}>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <N1ThemeProvider>{children}</N1ThemeProvider>
          <DrawingRendererHost />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default React.memo(AppProviders);
