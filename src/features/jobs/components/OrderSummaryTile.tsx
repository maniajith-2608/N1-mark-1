import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  N1Icon,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS, DRAWING_CARD_THUMB } from '../../../shared/constants';
import {
  DrawingPreview,
  ORDER_STRINGS,
  OrderStatusBadge,
  PriorityBadge,
  orderHeading,
  type WorkOrder,
} from '../../orders';
import { JOBS_STRINGS } from '../constants';
import type { JobsScreenProps } from '../types';

const D = ORDER_STRINGS.details;
const S = JOBS_STRINGS.order;

const makeStyles = createN1Styles(t => ({
  // Stays put under the header while the details below it scroll.
  tile: {
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderBottomWidth: t.borderWidth.hairline,
    borderBottomColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  summary: { gap: t.spacing.xxs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  // No shade: the bordered thumbnail beside its label.
  drawing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
  },
  thumb: {
    ...DRAWING_CARD_THUMB,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surface,
  },
  grow: { flex: 1 },
  pressed: { opacity: t.opacity.pressed },
}));

/**
 * The order's badges, heading and customer, then its drawing as a thumbnail
 * that opens the Drawing screen. Import Order and Order Details pin it
 * above their scrolling details.
 */
export const OrderSummaryTile = memo(function OrderSummaryTileComponent({
  order,
}: {
  order: WorkOrder;
}) {
  const styles = useN1Styles(makeStyles);
  const drawingNumber = order.drawingNumber || D.noDrawing;
  const navigation =
    useNavigation<JobsScreenProps<'ImportOrder'>['navigation']>();

  return (
    <View style={styles.tile} testID="order-summary-tile">
      <View style={styles.summary}>
        <View style={styles.badges}>
          <PriorityBadge priority={order.priority} suffix="priority" />
          <OrderStatusBadge status={order.status} />
        </View>
        <N1Text variant="h2">{orderHeading(order)}</N1Text>
        {order.customerName !== '' && (
          <N1Text weight="semiBold" color="secondary">
            {order.customerName}
          </N1Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={S.openDrawing(drawingNumber)}
        onPress={() => navigation.navigate('Drawing', { orderId: order.id })}
        style={({ pressed }) => [styles.drawing, pressed && styles.pressed]}
        testID="order-drawing-thumb"
      >
        <DrawingPreview drawingNumber={drawingNumber} style={styles.thumb} />
        <View style={styles.grow}>
          <N1Text variant="title" weight="bold">
            {D.drawing}
          </N1Text>
          <N1Text variant="small" color="secondary" numberOfLines={1}>
            {order.drawingNumber || COMMON_STRINGS.dash}
          </N1Text>
        </View>
        <N1Icon name="chevron-right" size="sm" color="textSecondary" />
      </Pressable>
    </View>
  );
});
