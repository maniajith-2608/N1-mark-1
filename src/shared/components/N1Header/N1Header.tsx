import React, { useContext } from 'react';
import type { ReactNode } from 'react';
import {
  Platform,
  StatusBar,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import type { N1IconName } from '../N1Icon/N1Icon';
import {
  createN1Styles,
  useN1Styles,
  useN1Theme,
} from '../../../theme/N1ThemeProvider';
import {
  N1IconButton,
  type N1IconButtonVariant,
} from '../N1IconButton/N1IconButton';
import { N1Logo } from '../N1Logo/N1Logo';
import { N1Text } from '../N1Text/N1Text';

export type N1HeaderProps = {
  title?: string;
  /** default variant: a line under the title, as on form sheets. */
  subtitle?: string;
  /**
   * default: white bar, left button + title (Order, Job card, Edit Profile)
   * brand: black bar with the N1 logo (home screens)
   * dark: title centred on a dark screen (Scan QR Code)
   * inverse: black bar with light tiles and title, like the admin phone
   * top bar (admin detail screens)
   */
  variant?: 'default' | 'brand' | 'dark' | 'inverse';
  /** Usually 'chevron-left' (back) or 'close'. */
  leftIcon?: N1IconName;
  onLeftPress?: () => void;
  leftAccessibilityLabel?: string;
  /** Right-hand action, e.g. an edit or flash button. */
  right?: ReactNode;
  /** inverse variant: title centred between the buttons (My profile). */
  centerTitle?: boolean;
  /** Pads for the status bar / notch. Defaults to true. */
  safeArea?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const LEFT_BUTTON: Record<
  NonNullable<N1HeaderProps['variant']>,
  N1IconButtonVariant
> = {
  default: 'secondary',
  brand: 'secondary',
  dark: 'overlay',
  inverse: 'tile',
};

const makeStyles = createN1Styles(t => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.controlHeight.lg + t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.sm,
  },
  default: {
    backgroundColor: t.colors.surface,
    borderBottomWidth: t.borderWidth.hairline,
    borderBottomColor: t.colors.border,
  },
  brand: { backgroundColor: t.colors.surfaceInverse },
  inverse: { backgroundColor: t.colors.surfaceInverse },
  // Matches the admin phone top bar's spacing.
  inverseBase: { paddingVertical: t.spacing.md },
  dark: { backgroundColor: t.colors.scannerBackground },
  title: { flex: 1 },
  titles: { flex: 1, gap: t.spacing.xxs },
  // With a subtitle: the same spacing as an N1Modal form sheet's header.
  sheetBase: { paddingVertical: t.spacing.lg },
  side: {
    minWidth: t.controlHeight.sm,
    alignItems: 'center',
  },
  // Same width both sides, so the title sits in the middle of the bar.
  sideMd: { width: t.controlHeight.md },
  darkTitle: { color: t.colors.scannerForeground },
  spacer: { flex: 1 },
}));

/** Top bar for a screen. */
export const N1Header = React.memo(function N1HeaderComponent({
  title,
  subtitle,
  variant = 'default',
  leftIcon,
  onLeftPress,
  leftAccessibilityLabel,
  right,
  centerTitle = false,
  safeArea = true,
  style,
  testID,
}: N1HeaderProps) {
  const styles = useN1Styles(makeStyles);
  const theme = useN1Theme();
  const topInset = useContext(SafeAreaInsetsContext)?.top ?? 0;
  const label =
    leftAccessibilityLabel ?? (leftIcon === 'close' ? 'Close' : 'Back');
  const leftButton = leftIcon && onLeftPress && (
    <N1IconButton
      icon={leftIcon}
      size={variant === 'inverse' ? 'md' : 'sm'}
      accessibilityLabel={label}
      onPress={onLeftPress}
      variant={LEFT_BUTTON[variant]}
    />
  );

  let content: ReactNode;
  if (variant === 'brand') {
    content = (
      <>
        <N1Logo size="sm" color="inverse" />
        <View style={styles.spacer} />
        {right}
      </>
    );
  } else if (variant === 'dark') {
    content = (
      <>
        <View style={styles.side}>{leftButton}</View>
        <N1Text
          variant="title"
          weight="bold"
          align="center"
          style={[styles.title, styles.darkTitle]}
        >
          {title}
        </N1Text>
        <View style={styles.side}>{right}</View>
      </>
    );
  } else if (variant === 'inverse' && centerTitle) {
    content = (
      <>
        <View style={styles.sideMd}>{leftButton}</View>
        <N1Text
          variant="h3"
          color="inverse"
          align="center"
          style={styles.title}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </N1Text>
        <View style={styles.sideMd}>{right}</View>
      </>
    );
  } else if (variant === 'inverse') {
    content = (
      <>
        {leftButton}
        <N1Text
          variant="h3"
          color="inverse"
          style={styles.title}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </N1Text>
        {right}
      </>
    );
  } else {
    const heading = (
      <N1Text
        variant="h2"
        style={!subtitle && styles.title}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title}
      </N1Text>
    );
    content = (
      <>
        {leftButton}
        {subtitle ? (
          <View style={styles.titles}>
            {heading}
            <N1Text variant="small" color="secondary" numberOfLines={1}>
              {subtitle}
            </N1Text>
          </View>
        ) : (
          heading
        )}
        {right}
      </>
    );
  }

  return (
    <View
      // The top inset from context, like the phone top bar: a SafeAreaView
      // measures 0 inside an iOS full-screen modal (Create / Edit order),
      // leaving the title under the status bar. No provider (isolated
      // renders) means no inset.
      style={[styles[variant], safeArea && { paddingTop: topInset }, style]}
      testID={testID}
    >
      {/* Light status bar text over the black; dark over any white
          header, which may follow a black one (a form sheet over a black
          header, Enter Job Code after the scanner). Web has no status bar. */}
      {variant === 'inverse' && Platform.OS !== 'web' && (
        <StatusBar barStyle="light-content" />
      )}
      {variant === 'default' && Platform.OS !== 'web' && (
        <StatusBar
          barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        />
      )}
      <View
        style={[
          styles.base,
          variant === 'inverse' && styles.inverseBase,
          variant === 'default' && subtitle && styles.sheetBase,
        ]}
      >
        {content}
      </View>
    </View>
  );
});
N1Header.displayName = 'N1Header';
