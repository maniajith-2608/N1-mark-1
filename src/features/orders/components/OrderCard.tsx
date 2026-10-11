import { memo } from 'react';
import { View } from 'react-native';
import {
  LabeledValue,
  N1IconButton,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { formatDayMonth } from '../../../shared/utils';
import { ORDER_STRINGS as S } from '../constants';
import type { WorkOrder } from '../types';
import { orderTitle } from '../utils';
import { OrderStatusBadge, PriorityBadge } from './OrderBadges';

const makeStyles = createN1Styles(t => ({
  // Same card as a machine, employee or customer on the phone list.
  card: {
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderRadius: t.radius.compact,
    backgroundColor: t.colors.surface,
  },
  heading: { gap: t.spacing.xxs },
  // Each value with its title above it; the right column lines up right.
  pair: { flexDirection: 'row', gap: t.spacing.md },
  // Separates the order from its chips and actions below.
  divider: {
    height: t.borderWidth.hairline,
    marginVertical: t.spacing.xs,
    backgroundColor: t.colors.border,
  },
  // Priority and status chips on the left, Job card and Edit on the right.
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  chips: { flexShrink: 1, flexWrap: 'wrap' },
}));

type Props = {
  order: WorkOrder;
  onEdit: (order: WorkOrder) => void;
  /** Set only when the order has a job card. */
  jobCard?: { label: string; onPress: () => void };
};

/**
 * One work order on the phone list, with the web table's columns: the WO
 * number and part, the customer and due date, the PO and RC numbers, then
 * a line, then the priority and status chips with Job card and Edit.
 */
export const OrderCard = memo(function OrderCardComponent({
  order: o,
  onEdit,
  jobCard,
}: Props) {
  const styles = useN1Styles(makeStyles);
  return (
    <View style={styles.card} testID={`order-card-${o.id}`}>
      <View style={styles.heading}>
        <N1Text variant="title" weight="bold" numberOfLines={1}>
          {S.workOrder(o.id)}
        </N1Text>
        <N1Text variant="small" color="secondary" numberOfLines={1}>
          {orderTitle(o) || COMMON_STRINGS.dash}
        </N1Text>
      </View>
      <View style={styles.pair}>
        <LabeledValue
          title={S.columns.customer}
          value={o.customerName || COMMON_STRINGS.dash}
        />
        <LabeledValue
          title={S.columns.due}
          value={formatDayMonth(o.dueDate) || COMMON_STRINGS.dash}
          end
        />
      </View>
      <View style={styles.pair}>
        <LabeledValue
          title={S.columns.poNumber}
          value={o.poNumber || COMMON_STRINGS.dash}
        />
        <LabeledValue
          title={S.columns.rcNumber}
          value={o.routeCardNo || COMMON_STRINGS.dash}
          end
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.footer}>
        <View style={[styles.row, styles.chips]}>
          <PriorityBadge priority={o.priority} />
          <OrderStatusBadge status={o.status} />
        </View>
        <View style={styles.row}>
          {jobCard && (
            <N1IconButton
              icon="clipboard"
              variant="card"
              accessibilityLabel={jobCard.label}
              onPress={jobCard.onPress}
              testID={`job-card-${o.id}`}
            />
          )}
          <N1IconButton
            icon="edit"
            variant="card"
            accessibilityLabel={S.a11y.edit(o.id)}
            onPress={() => onEdit(o)}
            testID={`edit-order-${o.id}`}
          />
        </View>
      </View>
    </View>
  );
});
