import React from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { N1Icon, type N1IconColor, type N1IconName } from '../N1Icon/N1Icon';
import {
  createN1Styles,
  useN1Styles,
  useN1Theme,
} from '../../../theme/N1ThemeProvider';
import type { N1Size } from '../../../theme/tokens';

export type N1IconButtonVariant =
  | 'secondary'
  | 'soft'
  | 'primary'
  | 'danger'
  | 'overlay'
  | 'ghost'
  | 'ghostDanger'
  | 'inverse'
  | 'tile'
  | 'card'
  | 'cardDanger';

export type N1IconButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  icon: N1IconName;
  /** Required: icon-only buttons have no visible text for screen readers. */
  accessibilityLabel: string;
  /**
   * secondary: white outlined circle (back arrow)
   * soft: grey circle (modal close)
   * primary: black circle
   * danger: outlined circle with a red icon (delete)
   * overlay: dark circle with a white icon, for the camera screen
   * ghost: icon only, no circle (row actions such as edit)
   * ghostDanger: red icon only, no circle (row delete)
   * inverse: outlined circle with a light icon, for dark surfaces (sidebar)
   * tile: dark rounded square with a light icon, on the black phone header
   * card: grey rounded square, the actions on a phone list card (Edit…)
   * cardDanger: the same with a red icon (Delete)
   */
  variant?: N1IconButtonVariant;
  size?: N1Size;
  style?: StyleProp<ViewStyle>;
};

const iconColor: Record<N1IconButtonVariant, N1IconColor> = {
  secondary: 'textPrimary',
  soft: 'textPrimary',
  primary: 'onPrimary',
  danger: 'danger',
  overlay: 'textInverse',
  ghost: 'textPrimary',
  ghostDanger: 'danger',
  inverse: 'textInverse',
  tile: 'textInverse',
  card: 'textPrimary',
  cardDanger: 'danger',
};

const makeStyles = createN1Styles(t => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.pill,
    borderWidth: t.borderWidth.hairline,
    borderColor: 'transparent',
  },
  sm: { width: t.controlHeight.sm, height: t.controlHeight.sm },
  md: { width: t.controlHeight.md, height: t.controlHeight.md },
  lg: { width: t.controlHeight.lg, height: t.controlHeight.lg },
  secondary: {
    backgroundColor: t.colors.surface,
    borderColor: t.colors.border,
  },
  soft: { backgroundColor: t.colors.surfaceMuted },
  primary: { backgroundColor: t.colors.primary },
  danger: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
  overlay: { backgroundColor: t.colors.scannerControl },
  ghost: { backgroundColor: 'transparent' },
  ghostDanger: { backgroundColor: 'transparent' },
  inverse: {
    backgroundColor: 'transparent',
    borderColor: t.colors.surfaceInverseActive,
  },
  // Like the menu / profile tiles on the phone top bar.
  tile: {
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceInverseActive,
  },
  // Beside a card's grey View button (soft N1Button), same corners.
  card: {
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surfaceMuted,
  },
  cardDanger: {
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surfaceMuted,
  },
  pressed: { opacity: t.opacity.pressed },
  disabled: { opacity: t.opacity.disabled },
}));

export const N1IconButton = React.memo(function N1IconButtonComponent({
  icon,
  variant = 'secondary',
  size = 'md',
  disabled,
  style,
  ...rest
}: N1IconButtonProps) {
  const styles = useN1Styles(makeStyles);
  const theme = useN1Theme();
  return (
    <Pressable
      accessibilityRole="button"
      aria-disabled={Boolean(disabled)}
      disabled={disabled}
      hitSlop={size === 'sm' ? 4 : undefined}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <N1Icon
        name={icon}
        size={size === 'lg' ? 'lg' : 'md'}
        color={iconColor[variant]}
        tintColor={
          variant === 'overlay' ? theme.colors.scannerForeground : undefined
        }
      />
    </Pressable>
  );
});
N1IconButton.displayName = 'N1IconButton';
