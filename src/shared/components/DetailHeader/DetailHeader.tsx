import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  N1Header,
  N1IconButton,
  N1Text,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
} from '..';
import { COMMON_STRINGS } from '../../constants';

export type DetailHeaderProps = {
  title: string;
  /**
   * e.g. "INV-2026-0125 · Draft". Phones show it only on the white `sheet`
   * header.
   */
  subtitle?: string;
  onBack: () => void;
  /** 'close' for full-screen forms on phones. */
  backIcon?: 'arrow-left' | 'chevron-left' | 'close';
  /** Actions on the right, e.g. an Edit button or status badge. */
  right?: ReactNode;
  /**
   * Phones: the right-hand action on the black header, an N1IconButton
   * with variant "tile". Falls back to `right`.
   */
  compactRight?: ReactNode;
  /**
   * Phones: white, like an N1Modal form sheet (Edit machine), instead of
   * the black header. For forms that slide up over the screen.
   */
  sheet?: boolean;
};

const makeStyles = createN1Styles(t => ({
  bar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    // Lines up with AdminScreen's content padding.
    paddingHorizontal: t.spacing.page,
    paddingTop: t.spacing.xl,
  },
  titles: { flex: 1, gap: t.spacing.xxs },
  right: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
}));

/** Back button + page title for detail and form screens. */
export function DetailHeader({
  title,
  subtitle,
  onBack,
  backIcon,
  right,
  compactRight,
  sheet = false,
}: DetailHeaderProps) {
  const styles = useN1Styles(makeStyles);
  const { isCompact } = useN1Breakpoint();

  if (isCompact && sheet) {
    return (
      <N1Header
        title={title}
        subtitle={subtitle}
        leftIcon="chevron-left"
        leftAccessibilityLabel={COMMON_STRINGS.back}
        onLeftPress={onBack}
        right={compactRight ?? right}
      />
    );
  }

  if (isCompact) {
    return (
      // Black, like the phone top bar on the list screens.
      <N1Header
        variant="inverse"
        title={title}
        leftIcon={backIcon === 'close' ? 'close' : 'chevron-left'}
        leftAccessibilityLabel={
          backIcon === 'close' ? COMMON_STRINGS.close : COMMON_STRINGS.back
        }
        onLeftPress={onBack}
        right={compactRight ?? right}
      />
    );
  }

  return (
    <View style={styles.bar}>
      <N1IconButton
        icon={backIcon === 'chevron-left' ? 'chevron-left' : 'arrow-left'}
        accessibilityLabel={COMMON_STRINGS.back}
        onPress={onBack}
      />
      <View style={styles.titles}>
        <N1Text variant="h1" accessibilityRole="header" numberOfLines={1}>
          {title}
        </N1Text>
        {subtitle && (
          <N1Text variant="small" color="secondary">
            {subtitle}
          </N1Text>
        )}
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}
