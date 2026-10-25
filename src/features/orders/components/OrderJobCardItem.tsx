import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  N1Icon,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import {
  JobCardStatusBadge,
  JobProgress,
  currentOperation,
  jobHeading,
  jobProgress,
  type JobCard,
} from '../../jobCards';
import { ORDER_STRINGS } from '../constants';

const D = ORDER_STRINGS.details;

const makeStyles = createN1Styles(t => ({
  item: {
    gap: t.spacing.sm,
    padding: t.spacing.lg,
    borderRadius: t.radius.md,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  hovered: { backgroundColor: t.colors.background },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  top: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  title: { flex: 1, gap: t.spacing.xxs },
}));

type Props = { jobCard: JobCard; onPress: (jobCard: JobCard) => void };

/**
 * One job card on an order: what it's on now and how far along it is.
 * Pressing it opens the job card.
 */
export const OrderJobCardItem = memo(function OrderJobCardItemComponent({
  jobCard,
  onPress,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const [hovered, setHovered] = useState(false);
  const op = currentOperation(jobCard);
  const where = op
    ? D.jobCardNow(
        [op.name, op.machine, op.operator].filter(Boolean).join(' · '),
      )
    : D.jobCardNoFlow;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={D.openJobCard(jobCard.number)}
      onPress={() => onPress(jobCard)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.item,
        hovered && styles.hovered,
        pressed && styles.pressed,
      ]}
      testID={`order-job-card-${jobCard.id}`}
    >
      <View style={styles.top}>
        <View style={styles.title}>
          <N1Text weight="bold" numberOfLines={1}>
            {jobHeading(jobCard)}
          </N1Text>
          <N1Text variant="small" color="secondary" numberOfLines={1}>
            {where}
          </N1Text>
        </View>
        <JobCardStatusBadge jobCard={jobCard} />
        <N1Icon name="chevron-right" size="sm" color="textSecondary" />
      </View>
      <JobProgress value={jobProgress(jobCard)} />
    </Pressable>
  );
});
