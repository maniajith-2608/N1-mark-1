import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import {
  N1Icon,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';

const makeStyles = createN1Styles(t => ({
  // Small white cards on the grey page, like the phone list cards.
  card: {
    gap: t.spacing.xs,
    padding: t.spacing.md,
    borderRadius: t.radius.compact,
    backgroundColor: t.colors.surface,
  },
  // "Process operations  4 operations · ₹40,000  ›": opens their screen.
  operations: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  grow: { flex: 1 },
  pressed: { opacity: t.opacity.pressed },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: t.spacing.md,
  },
  value: { flexShrink: 1, textAlign: 'right' },
}));

/** Phones (invoice and quote at a glance): a small white card with a bold title. */
export function OverviewCard({
  title,
  children,
  testID,
}: {
  title: string;
  children: ReactNode;
  testID?: string;
}) {
  const styles = useN1Styles(makeStyles);
  return (
    <View style={styles.card} testID={testID}>
      <N1Text variant="label" weight="bold">
        {title}
      </N1Text>
      {children}
    </View>
  );
}

/** "Part name ........ Machined Shaft" inside a card; a node for links. */
export function OverviewLine({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  const styles = useN1Styles(makeStyles);
  return (
    <View style={styles.line}>
      <N1Text variant="small" color="secondary">
        {label}
      </N1Text>
      {typeof value === 'string' ? (
        <N1Text variant="small" weight="semiBold" style={styles.value}>
          {value || COMMON_STRINGS.dash}
        </N1Text>
      ) : (
        value
      )}
    </View>
  );
}

/**
 * "Process operations · 4 operations · ₹40,000 ›": opens them on their own
 * screen.
 */
export function OperationsRow({
  title,
  summary,
  label,
  onPress,
  testID,
}: {
  title: string;
  summary: string;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const styles = useN1Styles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.operations,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <View style={styles.grow}>
        <N1Text variant="label" weight="bold">
          {title}
        </N1Text>
        <N1Text variant="small" color="secondary">
          {summary}
        </N1Text>
      </View>
      <N1Icon name="chevron-right" size="sm" color="textTertiary" />
    </Pressable>
  );
}
