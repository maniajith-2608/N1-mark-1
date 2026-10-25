import { memo } from 'react';
import { View } from 'react-native';
import {
  LabeledValue,
  N1Avatar,
  N1IconButton,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import {
  MACHINE_STATUS_META,
  MACHINE_STRINGS as S,
  MACHINE_TYPE_LABELS,
} from '../constants';
import type { Machine } from '../types';
import { workTitle } from '../utils';
import { MachineStatusBadge } from './MachineBadge';

const makeStyles = createN1Styles(t => ({
  // Same card as an employee or customer on the phone list.
  card: {
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderRadius: t.radius.compact,
    backgroundColor: t.colors.surface,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  // Each value with its title above it; the right column lines up right.
  pair: { flexDirection: 'row', gap: t.spacing.md },
  grow: { flex: 1 },
  // Separates the machine from its actions below.
  divider: {
    height: t.borderWidth.hairline,
    marginVertical: t.spacing.xs,
    backgroundColor: t.colors.border,
  },
  // The status chip on the left, Edit on the right.
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}));

type Props = { machine: Machine; onEdit: (machine: Machine) => void };

/**
 * One machine on the phone list, like a customer on the dashboard: the
 * name and code, then its type and location, then the current work and
 * its operator, each value under its title; then a line, then the status
 * chip and Edit.
 */
export const MachineCard = memo(function MachineCardComponent({
  machine: m,
  onEdit,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const status = MACHINE_STATUS_META[m.status];
  const work = m.currentWork;
  return (
    <View style={styles.card} testID={`machine-card-${m.id}`}>
      <View style={styles.line}>
        <N1Avatar name={m.name} size="sm" tone={status.tone} />
        <N1Text weight="bold" style={styles.grow} numberOfLines={1}>
          {m.name}
        </N1Text>
        <N1Text variant="small" color="secondary">
          {m.code}
        </N1Text>
      </View>
      <View style={styles.pair}>
        <LabeledValue
          title={S.columns.type}
          value={MACHINE_TYPE_LABELS[m.type]}
        />
        <LabeledValue title={S.columns.location} value={m.location} end />
      </View>
      <View style={styles.pair}>
        <LabeledValue
          title={S.columns.work}
          value={work ? workTitle(work) : COMMON_STRINGS.dash}
        />
        <LabeledValue
          title={S.columns.operator}
          value={work?.operator ?? COMMON_STRINGS.dash}
          end
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.footer}>
        <MachineStatusBadge status={m.status} />
        <N1IconButton
          icon="edit"
          variant="card"
          onPress={() => onEdit(m)}
          accessibilityLabel={S.a11y.edit(m.name)}
        />
      </View>
    </View>
  );
});
