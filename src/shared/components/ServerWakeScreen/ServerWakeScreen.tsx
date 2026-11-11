import React, { useSyncExternalStore } from 'react';
import { ActivityIndicator, Modal, View } from 'react-native';
import {
  getBackendWakeState,
  retryBackendWake,
  subscribeBackendWake,
} from '../../../services/api/wakeup';
import {
  createN1Styles,
  useN1Styles,
  useN1Theme,
} from '../../../theme/N1ThemeProvider';
import { N1Button } from '../N1Button';
import { N1Text } from '../N1Text';

const COPY = {
  waking: 'Getting ready…',
  wakingHint: 'The server is starting up. This can take up to two minutes.',
  timeout: 'Taking longer than usual',
  timeoutHint: 'The server is still starting. Try again in a moment.',
  retry: 'Retry',
};

const makeStyles = createN1Styles(t => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: t.spacing.xl,
    gap: t.spacing.md,
  },
}));

/**
 * Full-screen wait shown while the backend wakes up. It is driven by the
 * wake state in services/api/wakeup and renders nothing while idle.
 */
export function ServerWakeScreen() {
  const state = useSyncExternalStore(
    subscribeBackendWake,
    getBackendWakeState,
  );
  const theme = useN1Theme();
  const styles = useN1Styles(makeStyles);
  const isTimeout = state.status === 'timeout';

  return (
    <Modal
      visible={state.status !== 'idle'}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      // The wait cannot be dismissed; only the Retry button resumes it.
      onRequestClose={() => {}}
    >
      <View style={styles.root} testID="server-wake-screen">
        {isTimeout ? (
          <>
            <N1Text variant="title" align="center">
              {COPY.timeout}
            </N1Text>
            <N1Text color="secondary" align="center">
              {COPY.timeoutHint}
            </N1Text>
            <N1Button
              title={COPY.retry}
              onPress={() => retryBackendWake()}
              testID="server-wake-retry"
            />
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={theme.colors.textSecondary} />
            <N1Text variant="title" align="center">
              {COPY.waking}
            </N1Text>
            <N1Text color="secondary" align="center">
              {COPY.wakingHint}
            </N1Text>
          </>
        )}
      </View>
    </Modal>
  );
}
