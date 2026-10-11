import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
  type Metrics,
} from 'react-native-safe-area-context';
import { createN1Styles, useN1Styles } from '../../../theme/N1ThemeProvider';
import { N1IconButton } from '../N1IconButton/N1IconButton';
import { N1Text } from '../N1Text/N1Text';

export type N1BottomSheetProps = {
  open: boolean;
  /** Backdrop tap, swipe down or the Android back button. */
  onClose: () => void;
  /** Heading above the content, e.g. the select's label. */
  title?: string;
  /**
   * Always the full sheet height instead of fitting the content, e.g. a
   * search whose results come and go. Still shrinks for the keyboard.
   */
  fixedHeight?: boolean;
  /** An X beside the title, e.g. a form that's easy to miss swiping away. */
  showClose?: boolean;
  children: ReactNode;
  testID?: string;
};

/** Before the native window reports (and in tests): no insets yet. */
const NO_INSETS: Metrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** The sheet grows with its content up to this share of the screen, then scrolls. */
const MAX_HEIGHT_RATIO = 0.6;
const ANIMATION_MS = 250;
/** A drag past this distance (or a quick flick) closes the sheet. */
const CLOSE_DRAG_DISTANCE = 80;
const CLOSE_DRAG_VELOCITY = 0.5;

const makeStyles = createN1Styles(t => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: t.colors.overlay,
  },
  // Shrinks when the keyboard is up (a search field in the sheet).
  sheet: {
    flexShrink: 1,
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
    backgroundColor: t.colors.surface,
  },
  // The drag area: handle and title.
  grab: {
    alignItems: 'center',
    gap: t.spacing.md,
    paddingTop: t.spacing.sm,
    paddingBottom: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
  },
  handle: {
    width: t.spacing.xxxl + t.spacing.sm,
    height: t.spacing.xs,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.border,
  },
  title: { alignSelf: 'stretch' },
  titleRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.md,
  },
  titleText: { flex: 1 },
  content: {
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.lg,
  },
}));

/**
 * Sheet that slides up from the bottom, sized to its content. A plain RN
 * modal, so it also opens on top of other modals.
 */
export const N1BottomSheet = React.memo(function N1BottomSheetComponent({
  open,
  onClose,
  title,
  fixedHeight = false,
  showClose = false,
  children,
  testID,
}: N1BottomSheetProps) {
  const styles = useN1Styles(makeStyles);
  const { height } = useWindowDimensions();
  // Stays mounted until the slide-out finishes.
  const [mounted, setMounted] = useState(open);
  const offset = useRef(new Animated.Value(height)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      setMounted(true);
      offset.setValue(height);
      Animated.timing(offset, {
        toValue: 0,
        duration: ANIMATION_MS,
        useNativeDriver: true,
      }).start();
      return;
    }
    // Unmount once slid out, but not when interrupted by re-opening.
    Animated.timing(offset, {
      toValue: height,
      duration: ANIMATION_MS,
      useNativeDriver: true,
    }).start(({ finished }) => finished && setMounted(false));
  }, [open, height, offset]);

  // Drag the handle down to close; a short drag springs back.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > Math.abs(g.dx),
        onPanResponderMove: (_, g) => offset.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > CLOSE_DRAG_DISTANCE || g.vy > CLOSE_DRAG_VELOCITY) {
            onCloseRef.current();
          } else {
            Animated.spring(offset, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [offset],
  );

  const maxHeight = height * MAX_HEIGHT_RATIO;
  const backdropOpacity = offset.interpolate({
    inputRange: [0, maxHeight],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* A modal is its own native window: it needs its own provider for the
          SafeAreaView below to clear the home indicator. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics ?? NO_INSETS}>
        {/* A search field in the sheet keeps the sheet above the keyboard. */}
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          >
            <Pressable
              accessibilityLabel="Close"
              style={StyleSheet.absoluteFill}
              onPress={onClose}
            />
          </Animated.View>
          <Animated.View
            testID={testID}
            style={[
              styles.sheet,
              {
                maxHeight,
                height: fixedHeight ? maxHeight : undefined,
                transform: [{ translateY: offset }],
              },
            ]}
          >
            <View style={styles.grab} {...pan.panHandlers}>
              <View style={styles.handle} />
              {showClose ? (
                <View style={styles.titleRow}>
                  <N1Text variant="h3" style={styles.titleText}>
                    {title}
                  </N1Text>
                  <N1IconButton
                    icon="close"
                    size="sm"
                    variant="card"
                    accessibilityLabel="Close"
                    onPress={onClose}
                    testID={testID ? `${testID}-close` : undefined}
                  />
                </View>
              ) : title ? (
                <N1Text variant="h3" style={styles.title}>
                  {title}
                </N1Text>
              ) : null}
            </View>
            {/* A tap on a row lands while the keyboard is up. */}
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              {/* Keeps the last row clear of the home indicator. */}
              <SafeAreaView edges={['bottom']} style={styles.content}>
                {children}
              </SafeAreaView>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaProvider>
    </Modal>
  );
});
N1BottomSheet.displayName = 'N1BottomSheet';
