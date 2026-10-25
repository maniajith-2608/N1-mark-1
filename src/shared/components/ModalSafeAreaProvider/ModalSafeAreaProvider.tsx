import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  type Metrics,
} from 'react-native-safe-area-context';

/** Before the native window reports (and in tests): no insets yet. */
const NO_INSETS: Metrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/**
 * Safe-area insets inside a Modal. Native: a modal is its own window, so it
 * needs its own provider for SafeAreaView to clear the notch and the home
 * indicator. Web: the modal is a portal that keeps the app's provider; its
 * own would measure the sheet while it's still sliding in from below the
 * screen and pad it by the whole screen height, leaving it blank.
 */
export function ModalSafeAreaProvider({ children }: { children: ReactNode }) {
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? NO_INSETS}>
      {children}
    </SafeAreaProvider>
  );
}
