import React from 'react';
import {
  ActivityIndicator,
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
import { N1Text, type N1TextColor } from '../N1Text/N1Text';

export type N1ButtonVariant =
  | 'primary'
  | 'secondary'
  /** Grey fill, no border: a card's main action (View invoice). */
  | 'soft'
  | 'danger'
  | 'dangerOutline'
  | 'success'
  | 'ghost'
  | 'link';

export type N1ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  /**
   * primary: black (Log in, Create user)
   * secondary: white, outlined (Cancel, View, Export)
   * danger: red (Delete customer)
   * dangerOutline: white with red text and border (Log out)
   * success: green (Pass)
   * ghost: text only (Forgot password?)
   * link: underlined text (Enter code manually)
   */
  variant?: N1ButtonVariant;
  size?: N1Size;
  leftIcon?: N1IconName;
  rightIcon?: N1IconName;
  loading?: boolean;
  /** Stretch to the parent's width. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const textColor: Record<N1ButtonVariant, N1TextColor> = {
  primary: 'onPrimary',
  secondary: 'primary',
  soft: 'primary',
  danger: 'onPrimary',
  dangerOutline: 'danger',
  success: 'onPrimary',
  ghost: 'primary',
  link: 'primary',
};

const iconColor: Record<N1ButtonVariant, N1IconColor> = {
  primary: 'onPrimary',
  secondary: 'textPrimary',
  soft: 'textPrimary',
  danger: 'onPrimary',
  dangerOutline: 'danger',
  success: 'onPrimary',
  ghost: 'textPrimary',
  link: 'textPrimary',
};

const makeStyles = createN1Styles(t => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.sm,
    borderRadius: t.radius.sm,
    borderWidth: t.borderWidth.hairline,
    borderColor: 'transparent',
    alignSelf: 'flex-start',
  },
  sm: { height: t.controlHeight.sm, paddingHorizontal: t.spacing.md },
  md: { height: t.controlHeight.md, paddingHorizontal: t.spacing.xl },
  lg: { height: t.controlHeight.lg, paddingHorizontal: t.spacing.xxl },
  primary: { backgroundColor: t.colors.primary },
  secondary: {
    backgroundColor: t.colors.surface,
    borderColor: t.colors.border,
  },
  soft: { backgroundColor: t.colors.surfaceMuted },
  danger: { backgroundColor: t.colors.danger },
  dangerOutline: {
    backgroundColor: t.colors.surface,
    borderColor: t.colors.tone.danger.background,
  },
  success: { backgroundColor: t.colors.tone.success.solid },
  link: { backgroundColor: 'transparent', paddingHorizontal: t.spacing.xs },
  linkText: { textDecorationLine: 'underline' },
  ghost: { backgroundColor: 'transparent', paddingHorizontal: t.spacing.xs },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: t.opacity.pressed },
  disabled: { opacity: t.opacity.disabled },
}));

export const N1Button = React.memo(function N1ButtonComponent({
  title,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  fullWidth = false,
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: N1ButtonProps) {
  const styles = useN1Styles(makeStyles);
  const theme = useN1Theme();
  const isDisabled = Boolean(disabled || loading);
  const iconSizeName = size === 'sm' ? 'sm' : 'md';
  const spinnerColor = theme.colors[iconColor[variant]];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      aria-disabled={isDisabled}
      aria-busy={loading}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        leftIcon && (
          <N1Icon
            name={leftIcon}
            size={iconSizeName}
            color={iconColor[variant]}
          />
        )
      )}
      <N1Text
        variant={size === 'sm' ? 'label' : 'title'}
        weight="bold"
        color={textColor[variant]}
        numberOfLines={1}
        style={variant === 'link' && styles.linkText}
      >
        {title}
      </N1Text>
      {rightIcon && !loading && (
        <N1Icon
          name={rightIcon}
          size={iconSizeName}
          color={iconColor[variant]}
        />
      )}
    </Pressable>
  );
});
N1Button.displayName = 'N1Button';
