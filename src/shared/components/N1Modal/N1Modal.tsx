import React from 'react';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  View,
} from 'react-native';
import { KeyboardScrollView } from '../KeyboardScrollView/KeyboardScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModalSafeAreaProvider } from '../ModalSafeAreaProvider/ModalSafeAreaProvider';
import { useN1Breakpoint } from '../../hooks/useN1Breakpoint';
import {
  createN1Styles,
  useN1Styles,
  useN1Theme,
} from '../../../theme/N1ThemeProvider';
import type { modalWidth } from '../../../theme/tokens';
import { N1IconButton } from '../N1IconButton/N1IconButton';
import { N1Text } from '../N1Text/N1Text';

export type N1ModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Buttons pinned to the bottom, e.g. Cancel + Create user. */
  footer?: ReactNode;
  size?: keyof typeof modalWidth;
  /** Close when the dimmed backdrop is tapped. Defaults to true. */
  closeOnBackdrop?: boolean;
  /**
   * On phones, forms open full screen with a back button (as in the design).
   * Set false to keep a centred dialog, e.g. for short confirmations.
   */
  fullScreenOnCompact?: boolean;
  children?: ReactNode;
  testID?: string;
};

const makeStyles = createN1Styles(t => ({
  backdrop: {
    flex: 1,
    backgroundColor: t.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: t.spacing.xxl,
  },
  dialog: {
    width: '100%',
    maxHeight: '100%',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.sm,
    padding: t.spacing.xxl,
    gap: t.spacing.lg,
    boxShadow: t.shadow.modal,
  },
  sm: { maxWidth: t.modalWidth.sm },
  md: { maxWidth: t.modalWidth.md },
  lg: { maxWidth: t.modalWidth.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.md,
  },
  titles: { flex: 1, gap: t.spacing.xxs },
  body: { gap: t.spacing.lg },
  footer: { flexDirection: 'row', gap: t.spacing.md },
  screen: { flex: 1, backgroundColor: t.colors.surface },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderBottomWidth: t.borderWidth.hairline,
    borderBottomColor: t.colors.border,
  },
  screenBody: { padding: t.spacing.lg, gap: t.spacing.lg },
  screenFooter: {
    flexDirection: 'row',
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderTopWidth: t.borderWidth.hairline,
    borderTopColor: t.colors.border,
  },
}));

/**
 * Dialog for forms (Create user, Add customer, Add machine…).
 * Centred card on wide screens, full-screen page on phones.
 */
export const N1Modal = React.memo(function N1ModalComponent({
  visible,
  onClose,
  title,
  subtitle,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  fullScreenOnCompact = true,
  children,
  testID,
}: N1ModalProps) {
  const styles = useN1Styles(makeStyles);
  const theme = useN1Theme();
  const { isCompact } = useN1Breakpoint();
  const fullScreen = isCompact && fullScreenOnCompact;

  const titles = (title || subtitle) && (
    <View style={styles.titles}>
      {title && (
        <N1Text variant="h2" accessibilityRole="header">
          {title}
        </N1Text>
      )}
      {subtitle && (
        <N1Text variant="small" color="secondary">
          {subtitle}
        </N1Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}
        testID={testID}
      >
        {/* A modal is its own native window: it needs its own provider for
            SafeAreaView to clear the notch and the home indicator. */}
        {/* Dark status bar text on the white sheet; a black top bar behind
            it may have switched it to light. Restored when this closes. */}
        <StatusBar
          barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        />
        <ModalSafeAreaProvider>
          <SafeAreaView style={styles.screen}>
            {/* The footer rides above the keyboard. */}
            <KeyboardAvoidingView
              style={styles.screen}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={styles.screenHeader}>
                <N1IconButton
                  icon="chevron-left"
                  accessibilityLabel="Back"
                  size="sm"
                  onPress={onClose}
                />
                {titles}
              </View>
              <KeyboardScrollView
                contentContainerStyle={styles.screenBody}
                footerMode
              >
                {children}
              </KeyboardScrollView>
              {footer && <View style={styles.screenFooter}>{footer}</View>}
            </KeyboardAvoidingView>
          </SafeAreaView>
        </ModalSafeAreaProvider>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable
        style={styles.backdrop}
        accessibilityLabel="Close dialog"
        onPress={closeOnBackdrop ? onClose : undefined}
      >
        <Pressable
          accessible={false}
          style={[styles.dialog, styles[size]]}
          onPress={() => undefined}
        >
          <View style={styles.header}>
            {titles || <View style={styles.titles} />}
            <N1IconButton
              icon="close"
              variant="soft"
              size="sm"
              accessibilityLabel="Close"
              onPress={onClose}
            />
          </View>
          <KeyboardScrollView contentContainerStyle={styles.body}>
            {children}
          </KeyboardScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </Pressable>
      </Pressable>
    </Modal>
  );
});
N1Modal.displayName = 'N1Modal';
