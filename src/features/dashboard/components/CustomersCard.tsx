import { memo } from 'react';
import {
  Pressable,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  N1Avatar,
  N1Button,
  N1Icon,
  N1Text,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
  type N1Tone,
} from '../../../shared/components';
import { formatCurrency } from '../../../shared/utils';
import { DASHBOARD_STRINGS } from '../constants';
import type { CustomerRow } from '../types';

const S = DASHBOARD_STRINGS.customers;

/** Avatar colours, cycled down the table. */
const AVATAR_TONES: N1Tone[] = ['info', 'success', 'warning', 'danger'];

const makeStyles = createN1Styles(t => ({
  card: {
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderRadius: t.radius.compact,
    backgroundColor: t.colors.surface,
  },
  // Wide screens: fill the column; the rows scroll inside the card.
  fill: { flex: 1 },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
  },
  headerIcon: {
    width: t.controlHeight.sm,
    height: t.controlHeight.sm,
    borderRadius: t.radius.compact,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
  },
  // Phones have no column labels, so the title row draws the divider.
  compactHeader: {
    paddingBottom: t.spacing.md,
    borderBottomWidth: t.borderWidth.hairline,
    borderBottomColor: t.colors.border,
  },
  titles: { flex: 1, gap: t.spacing.xxs },
  // Plain column labels, like the rows below them.
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.md,
    paddingBottom: t.spacing.sm,
    borderBottomWidth: t.borderWidth.hairline,
    borderBottomColor: t.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.md,
    borderBottomWidth: t.borderWidth.hairline,
    borderBottomColor: t.colors.border,
  },
  customer: {
    flex: 2.4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  name: { flex: 1 },
  // Number columns share one width and centre under their headings.
  num: { flex: 1.2, textAlign: 'center' },
  // Phones: two lines per customer.
  compactRow: {
    gap: t.spacing.xs,
    paddingVertical: t.spacing.md,
    borderBottomWidth: t.borderWidth.hairline,
    borderBottomColor: t.colors.border,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  grow: { flex: 1 },
  // Nothing in the period: the message sits in the middle of the card.
  empty: { padding: t.spacing.xxl, alignItems: 'center' },
  emptyFill: { flex: 1, justifyContent: 'center' },
  pressed: { opacity: t.opacity.pressed },
}));

type Props = {
  customers: readonly CustomerRow[];
  onOpenCustomer: (id: string) => void;
  onViewAll: () => void;
  /** Fill the parent's height and scroll the rows inside the card. */
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Every customer's orders, billing, pending deliveries and share of orders. */
export const CustomersCard = memo(function CustomersCardComponent({
  customers,
  onOpenCustomer,
  onViewAll,
  scrollable = false,
  style,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const { isCompact } = useN1Breakpoint();

  const rows = customers.map((c, index) => {
    const avatar = (
      <N1Avatar
        name={c.name}
        size="sm"
        tone={AVATAR_TONES[index % AVATAR_TONES.length]}
      />
    );
    return (
      <Pressable
        key={c.id}
        accessibilityRole="button"
        accessibilityLabel={S.open(c.name)}
        onPress={() => onOpenCustomer(c.id)}
        style={({ pressed }) => [
          isCompact ? styles.compactRow : styles.row,
          pressed && styles.pressed,
        ]}
        testID={`customer-row-${c.id}`}
      >
        {isCompact ? (
          <>
            <View style={styles.line}>
              {avatar}
              <N1Text weight="bold" style={styles.grow} numberOfLines={1}>
                {c.name}
              </N1Text>
              <N1Text variant="small" color="secondary">
                {S.orders(c.orders)}
              </N1Text>
            </View>
            <View style={styles.line}>
              <N1Text variant="caption" color="secondary" style={styles.grow}>
                {S.billed(formatCurrency(c.totalRevenue))}
              </N1Text>
              <N1Text variant="caption" color="secondary">
                {S.outstanding(formatCurrency(c.outstandingBalance))}
              </N1Text>
            </View>
            <View style={styles.line}>
              <N1Text variant="caption" color="secondary" style={styles.grow}>
                {S.pending(c.pendingDelivery)}
              </N1Text>
              <N1Text variant="small" weight="bold">
                {`${c.percent}%`}
              </N1Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.customer}>
              {avatar}
              <N1Text weight="semiBold" numberOfLines={1} style={styles.name}>
                {c.name}
              </N1Text>
            </View>
            <N1Text style={styles.num}>{c.orders}</N1Text>
            <N1Text style={styles.num}>{formatCurrency(c.totalRevenue)}</N1Text>
            <N1Text style={styles.num}>
              {formatCurrency(c.outstandingBalance)}
            </N1Text>
            <N1Text style={styles.num}>{c.pendingDelivery}</N1Text>
            <N1Text weight="semiBold" style={styles.num}>
              {`${c.percent}%`}
            </N1Text>
          </>
        )}
      </Pressable>
    );
  });

  return (
    <View
      style={[styles.card, scrollable && styles.fill, style]}
      testID="customers-card"
    >
      <View style={[styles.header, isCompact && styles.compactHeader]}>
        <View style={styles.headerIcon}>
          <N1Icon name="building" size="sm" color="textSecondary" />
        </View>
        <View style={styles.titles}>
          <N1Text variant="h3" weight="bold">
            {S.title}
          </N1Text>
          <N1Text variant="caption" color="secondary">
            {S.subtitle}
          </N1Text>
        </View>
        <N1Button
          title={S.viewAll}
          variant="ghost"
          size="sm"
          onPress={onViewAll}
          testID="view-more-customers"
        />
      </View>

      {!isCompact && (
        <View style={styles.headRow}>
          {(
            [
              [S.columns.customer, styles.customer],
              [S.columns.orders, styles.num],
              [S.columns.billed, styles.num],
              [S.columns.outstanding, styles.num],
              [S.columns.pending, styles.num],
              [S.columns.share, styles.num],
            ] as const
          ).map(([label, columnStyle]) => (
            <N1Text
              key={label}
              variant="caption"
              color="tertiary"
              numberOfLines={1}
              style={columnStyle}
            >
              {label}
            </N1Text>
          ))}
        </View>
      )}

      {customers.length === 0 ? (
        <View
          style={[styles.empty, scrollable && styles.emptyFill]}
          testID="customers-empty"
        >
          <N1Text color="secondary" align="center">
            {S.empty}
          </N1Text>
        </View>
      ) : scrollable ? (
        <ScrollView style={styles.scroll} testID="customers-scroll">
          {rows}
        </ScrollView>
      ) : (
        <View>{rows}</View>
      )}
    </View>
  );
});
