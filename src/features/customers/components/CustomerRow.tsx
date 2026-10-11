import { memo } from 'react';
import { View } from 'react-native';
import {
  N1Avatar,
  N1Text,
  RowActions,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { formatCurrency } from '../../../shared/utils';
import { CUSTOMER_STRINGS as S } from '../constants';
import type { Customer } from '../types';
import { formatAddress, hasAddress } from '../utils';

const makeStyles = createN1Styles(t => ({
  // Same card as an employee on the phone list.
  card: {
    gap: t.spacing.md,
    padding: t.spacing.md,
    borderRadius: t.radius.compact,
    backgroundColor: t.colors.surface,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  text: { flex: 1, gap: t.spacing.xxs },
  // The web table's columns, one label / value line each.
  details: { gap: t.spacing.xs },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: t.spacing.md,
  },
  value: { flexShrink: 1, textAlign: 'right' },
  divider: {
    height: t.borderWidth.hairline,
    backgroundColor: t.colors.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
}));

type Props = {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
};

/**
 * One customer on the phone list, like an employee card: the name and
 * address, the web table's figures, then a line, then Edit and Delete.
 */
export const CustomerRow = memo(function CustomerRowComponent({
  customer: c,
  onEdit,
  onDelete,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const rows: [string, string][] = [
    [S.columns.current, S.active(c.currentProjects)],
    [S.columns.previous, S.completed(c.previousProjects)],
    [S.columns.revenue, formatCurrency(c.totalRevenue)],
    [S.columns.outstanding, formatCurrency(c.outstandingBalance)],
  ];
  return (
    <View style={styles.card} testID={`customer-row-${c.id}`}>
      <View style={styles.identity}>
        <N1Avatar name={c.name} />
        <View style={styles.text}>
          <N1Text variant="title" weight="bold" numberOfLines={1}>
            {c.name}
          </N1Text>
          <N1Text
            variant="small"
            color={hasAddress(c) ? 'secondary' : 'tertiary'}
            numberOfLines={1}
          >
            {hasAddress(c) ? formatAddress(c) : COMMON_STRINGS.notAdded}
          </N1Text>
        </View>
      </View>
      <View style={styles.details}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.line}>
            <N1Text variant="small" color="secondary">
              {label}
            </N1Text>
            <N1Text variant="small" weight="semiBold" style={styles.value}>
              {value}
            </N1Text>
          </View>
        ))}
      </View>
      <View style={styles.divider} />
      <View style={styles.footer}>
        <RowActions
          appearance="card"
          onEdit={() => onEdit(c)}
          onDelete={() => onDelete(c)}
          editLabel={S.a11y.edit(c.name)}
          deleteLabel={S.a11y.delete(c.name)}
        />
      </View>
    </View>
  );
});
