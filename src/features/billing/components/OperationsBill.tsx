import { memo } from 'react';
import { View } from 'react-native';
import {
  N1Button,
  N1IconButton,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { formatCurrency } from '../../../shared/utils';
import { BILLING_STRINGS } from '../constants';
import type { LineItem } from '../types';
import {
  calculateTotals,
  lineAmount,
  rateLabel,
  runningTimeLabel,
  setupTimeLabel,
} from '../utils';

const I = BILLING_STRINGS.invoice;
const L = BILLING_STRINGS.lineItems;

const makeStyles = createN1Styles(t => ({
  bill: { gap: t.spacing.md },
  // "Operation" lines up with the names, past the line numbers.
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: t.spacing.xxl + t.spacing.sm,
  },
  // iOS only dashes a full border, so a dashed box is clipped to its top edge.
  dashClip: { height: t.borderWidth.hairline, overflow: 'hidden' },
  dash: {
    height: t.borderWidth.thick,
    borderWidth: t.borderWidth.hairline,
    borderStyle: 'dashed',
    borderColor: t.colors.border,
  },
  // The number sits on the name's line; the amount stays in its column.
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm },
  itemText: { flex: 1, gap: t.spacing.xxs },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: t.spacing.sm,
    marginTop: t.spacing.xs,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: t.spacing.md,
  },
  index: { width: t.spacing.xxl },
  subtotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
}));

const Dashes = () => {
  const styles = useN1Styles(makeStyles);
  return (
    <View style={styles.dashClip} accessible={false}>
      <View style={styles.dash} />
    </View>
  );
};

type Props = {
  items: readonly LineItem[];
  quantity: number;
  /** Each item gets Edit and Delete, and Add operation shows on top. */
  editing: boolean;
  onEdit: (item: LineItem) => void;
  onDelete: (item: LineItem) => void;
  onAdd: () => void;
};

/**
 * Phones: an invoice's process operations laid out like a bill: numbered
 * lines between dashed rules, then the subtotal.
 */
export const OperationsBill = memo(function OperationsBillComponent({
  items,
  quantity,
  editing,
  onEdit,
  onDelete,
  onAdd,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const { subtotal } = calculateTotals(items, quantity, 0, 0);

  return (
    <View style={styles.bill} testID="operations-bill">
      {editing && (
        <N1Button
          title={I.addOperation}
          leftIcon="plus"
          variant="soft"
          fullWidth
          onPress={onAdd}
          testID="add-operation"
        />
      )}
      <View style={styles.heading}>
        <N1Text variant="caption" weight="semiBold" color="secondary">
          {L.operation}
        </N1Text>
        <N1Text variant="caption" weight="semiBold" color="secondary">
          {L.amount}
        </N1Text>
      </View>
      <Dashes />
      {items.length === 0 && <N1Text color="secondary">{L.none}</N1Text>}
      {items.map((item, index) => (
        <View key={item.id} style={styles.bill}>
          <View style={styles.item} testID={`operation-${item.id}`}>
            <N1Text weight="bold" style={styles.index}>
              {`${index + 1}.`}
            </N1Text>
            <View style={styles.itemText}>
              <View style={styles.itemTop}>
                <N1Text weight="bold">{item.operation}</N1Text>
                <N1Text weight="bold">
                  {formatCurrency(lineAmount(item, quantity))}
                </N1Text>
              </View>
              {!!item.description && (
                <N1Text variant="small">{item.description}</N1Text>
              )}
              <N1Text variant="caption" color="secondary">
                {`${runningTimeLabel(item)} · ${L.setupTime} ${setupTimeLabel(
                  item,
                )} · ${rateLabel(item)}`}
              </N1Text>
              {editing && (
                <View style={styles.itemActions}>
                  <N1IconButton
                    icon="edit"
                    variant="card"
                    size="sm"
                    accessibilityLabel={I.editOperationOf(item.operation)}
                    onPress={() => onEdit(item)}
                    testID={`edit-operation-${item.id}`}
                  />
                  {/* An invoice keeps at least one operation. */}
                  <N1IconButton
                    icon="trash"
                    variant="cardDanger"
                    size="sm"
                    accessibilityLabel={I.deleteOperationOf(item.operation)}
                    disabled={items.length <= 1}
                    onPress={() => onDelete(item)}
                    testID={`delete-operation-${item.id}`}
                  />
                </View>
              )}
            </View>
          </View>
          <Dashes />
        </View>
      ))}
      <View style={styles.subtotal}>
        <View>
          <N1Text weight="bold">{I.subtotal(items.length)}</N1Text>
          <N1Text variant="caption" color="secondary">
            {I.subtotalNote}
          </N1Text>
        </View>
        <N1Text variant="h3" testID="operations-subtotal">
          {formatCurrency(subtotal)}
        </N1Text>
      </View>
    </View>
  );
});
