import { memo } from 'react';
import { Pressable, View } from 'react-native';
import {
  LabeledValue,
  N1Icon,
  N1IconButton,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS, DRAWING_CARD_THUMB } from '../../../shared/constants';
import { DrawingPreview } from '../../orders/components/DrawingPreview';
import { PriorityBadge } from '../../orders/components/OrderBadges';
import { JOB_CARD_STRINGS as S } from '../constants';
import type { JobCard } from '../types';
import { currentOperation, jobProgress, jobTitle } from '../utils';
import { FlowActionButton } from './FlowActionButton';
import { JobCardStatusBadge } from './JobCardBadges';
import { JobProgress } from './JobProgress';

const makeStyles = createN1Styles(t => ({
  // Same card as an order, machine, employee or customer on the phone list.
  card: {
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderRadius: t.radius.compact,
    backgroundColor: t.colors.surface,
  },
  // The drawing thumbnail beside the job ID, part and work order, with the
  // priority in the top right corner.
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.md,
  },
  thumb: { ...DRAWING_CARD_THUMB, borderRadius: t.radius.sm },
  noThumb: {
    ...DRAWING_CARD_THUMB,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.background,
  },
  titles: { flex: 1, gap: t.spacing.xxs },
  pressed: { opacity: t.opacity.pressed },
  // Each value with its title above it; the right column lines up right.
  pair: { flexDirection: 'row', gap: t.spacing.md },
  progress: { gap: t.spacing.xxs },
  // Separates the job card from its chips and actions below.
  divider: {
    height: t.borderWidth.hairline,
    marginVertical: t.spacing.xs,
    backgroundColor: t.colors.border,
  },
  // Status chips on the left, flow and Delete on the right.
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
  jobCard: JobCard;
  /** The drawing number shown on the thumbnail. */
  drawingNumber: string;
  onOpenDrawing: (jobCard: JobCard) => void;
  onFlow: (jobCard: JobCard) => void;
  onDelete: (jobCard: JobCard) => void;
};

/**
 * One job card on the admin phone list, with the web table's columns: the
 * drawing as a thumbnail (opens it) beside the job ID, part and work order,
 * with the priority, then machine and operator, progress, a line, then the
 * status with Create / Edit flow and Delete. The card itself opens the job card.
 */
export const JobCardListCard = memo(function JobCardListCardComponent({
  jobCard: c,
  drawingNumber,
  onOpenDrawing,
  onFlow,
  onDelete,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const op = currentOperation(c);
  return (
    <View style={styles.card} testID={`job-card-${c.id}`}>
      <View style={styles.heading}>
        {c.designFile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={S.a11y.diagram(c.id)}
            onPress={() => onOpenDrawing(c)}
            style={({ pressed }) => pressed && styles.pressed}
            testID={`diagram-${c.id}`}
          >
            <DrawingPreview
              drawingNumber={drawingNumber}
              style={styles.thumb}
            />
          </Pressable>
        ) : (
          <View style={styles.noThumb}>
            <N1Icon name="file" size="md" color="textTertiary" />
          </View>
        )}
        <View style={styles.titles}>
          <N1Text variant="title" weight="bold" numberOfLines={1}>
            {S.jobCardNumber(c.code)}
          </N1Text>
          <N1Text variant="small" color="secondary" numberOfLines={1}>
            {jobTitle(c) || COMMON_STRINGS.dash}
          </N1Text>
          <N1Text variant="caption" color="tertiary">
            {S.workOrder(c.id)}
          </N1Text>
        </View>
        <PriorityBadge priority={c.priority} />
      </View>
      <View style={styles.pair}>
        <LabeledValue
          title={S.columns.machine}
          value={op?.machine || COMMON_STRINGS.dash}
        />
        <LabeledValue
          title={S.columns.operator}
          value={op?.operator || COMMON_STRINGS.dash}
          end
        />
      </View>
      <View style={styles.progress}>
        <N1Text variant="caption" color="tertiary">
          {S.columns.progress}
        </N1Text>
        <JobProgress value={jobProgress(c)} testID={`progress-${c.id}`} />
      </View>
      <View style={styles.divider} />
      <View style={styles.footer}>
        {/* The status already reads "RM QC failed" when the material fails
            its QC, so it needs no second chip. */}
        <View style={[styles.row, styles.chips]}>
          <JobCardStatusBadge jobCard={c} />
        </View>
        <View style={styles.row}>
          <FlowActionButton jobCard={c} onPress={onFlow} appearance="card" />
          <N1IconButton
            icon="trash"
            variant="cardDanger"
            accessibilityLabel={S.a11y.delete(c.id)}
            onPress={() => onDelete(c)}
            testID={`delete-${c.id}`}
          />
        </View>
      </View>
    </View>
  );
});
