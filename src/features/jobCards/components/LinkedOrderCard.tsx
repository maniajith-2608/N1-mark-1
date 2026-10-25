import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  N1Icon,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { formatLongDate } from '../../../shared/utils';
import { OrderStatusBadge } from '../../orders/components/OrderBadges';
import type { WorkOrder } from '../../orders/types';
import { orderHeading } from '../../orders/utils';
import { JOB_CARD_STRINGS } from '../constants';

const O = JOB_CARD_STRINGS.details.order;

const makeStyles = createN1Styles(t => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderRadius: t.radius.md,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  hovered: { backgroundColor: t.colors.background },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  icon: {
    padding: t.spacing.sm,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.background,
  },
  text: { flex: 1, gap: t.spacing.xxs },
}));

type Props = {
  order: WorkOrder;
  /** Opens the order; omit where the order screen isn't available. */
  onPress?: () => void;
};

/** The work order behind a job card, as one card that opens it. */
export const LinkedOrderCard = memo(function LinkedOrderCardComponent({
  order,
  onPress,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const [hovered, setHovered] = useState(false);
  // "Bright Steel Co. · PO-8840 · Due 03 Oct 2026"
  const details = [
    order.customerName,
    order.poNumber,
    order.dueDate && O.due(formatLongDate(order.dueDate)),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={O.open(order.number)}
      disabled={!onPress}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.card,
        onPress && hovered && styles.hovered,
        onPress && pressed && styles.pressed,
      ]}
      testID="job-card-order"
    >
      <View style={styles.icon}>
        <N1Icon name="package" size="md" color="textPrimary" />
      </View>
      <View style={styles.text}>
        <N1Text weight="bold" numberOfLines={1}>
          {orderHeading(order)}
        </N1Text>
        <N1Text variant="small" color="secondary" numberOfLines={1}>
          {details}
        </N1Text>
      </View>
      <OrderStatusBadge status={order.status} />
      {onPress && (
        <N1Icon name="chevron-right" size="sm" color="textSecondary" />
      )}
    </Pressable>
  );
});
