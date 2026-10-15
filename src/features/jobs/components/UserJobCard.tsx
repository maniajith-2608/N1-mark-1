import { memo, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import {
  N1Avatar,
  N1Badge,
  N1Icon,
  N1ProgressBar,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { formatLongDate } from '../../../shared/utils';
import {
  JOB_CARD_STRINGS,
  JobCardStatusBadge,
  currentOperation,
  jobCardStage,
  jobProgress,
  jobTitle,
  progressTone,
  type JobCard,
} from '../../jobCards';
import { PRIORITY_META } from '../../orders/constants';
import { JOBS_STRINGS } from '../constants';

const C = JOBS_STRINGS.myJobs.card;

const makeStyles = createN1Styles(t => ({
  // A white card lifted off the page by a soft shadow.
  card: {
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surface,
    boxShadow: t.shadow.soft,
  },
  pressed: { opacity: t.opacity.pressed },
  top: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  // The part's first letter on a black square, like a company logo.
  tile: {
    width: t.controlHeight.lg,
    height: t.controlHeight.lg,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceInverse,
  },
  titles: { flex: 1, gap: t.spacing.xxs },
  where: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  chip: {
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surfaceMuted,
  },
  divider: {
    height: t.borderWidth.hairline,
    backgroundColor: t.colors.border,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.md,
  },
  operator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    flexShrink: 1,
  },
  progress: { flexDirection: 'row', alignItems: 'baseline', gap: t.spacing.xs },
}));

const Chip = ({ label }: { label: string }) => {
  const styles = useN1Styles(makeStyles);
  return (
    <View style={styles.chip}>
      <N1Text variant="caption" weight="semiBold">
        {label}
      </N1Text>
    </View>
  );
};

type Props = {
  jobCard: JobCard;
  onPress: (jobCard: JobCard) => void;
  /** Top right, e.g. the supervisor's Edit flow. */
  action?: ReactNode;
  /** In place of the job's stage, e.g. QC's check status. */
  status?: ReactNode;
  /** In place of the current operation and machine, e.g. the QC stage. */
  where?: string;
  testID?: string;
};

/**
 * One job on a shop-floor user's home: the part's letter tile with its name
 * and customer, where it is now, chips for the work order, job card,
 * priority, quantity and due date, then the operator and how far along it
 * is, with its progress bar. The whole card opens the job.
 */
export const UserJobCard = memo(function UserJobCardComponent({
  jobCard: c,
  onPress,
  action,
  status,
  where: whereOverride,
  testID = `job-card-${c.id}`,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const op = currentOperation(c);
  const where =
    whereOverride ?? [op?.name, op?.machine].filter(Boolean).join(' · ');
  const title = jobTitle(c) || JOB_CARD_STRINGS.workOrder(c.id);
  const progress = jobProgress(c);
  // The stage already says "RM QC failed": show it once.
  const rmFailed = c.materialQc === 'rejected';
  const stageIsRmFailed = jobCardStage(c).key === 'rm_qc_failed';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={JOB_CARD_STRINGS.a11y.view(c.id)}
      onPress={() => onPress(c)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID={testID}
    >
      <View style={styles.top}>
        <View style={styles.tile}>
          <N1Text variant="h2" color="inverse">
            {(c.partName || c.id).charAt(0).toUpperCase()}
          </N1Text>
        </View>
        <View style={styles.titles}>
          <N1Text variant="title" weight="bold" numberOfLines={1}>
            {title}
          </N1Text>
          <N1Text variant="small" color="tertiary" numberOfLines={1}>
            {c.customerName || COMMON_STRINGS.dash}
          </N1Text>
        </View>
        {action}
      </View>

      <View style={styles.where}>
        <N1Icon name="map-pin" size="sm" color="textSecondary" />
        <N1Text variant="small" color="secondary" numberOfLines={1}>
          {where || COMMON_STRINGS.dash}
        </N1Text>
      </View>

      <View style={styles.chips}>
        {status ??
          (!(rmFailed && stageIsRmFailed) && (
            <JobCardStatusBadge jobCard={c} />
          ))}
        {rmFailed && !status && (
          <N1Badge
            label={JOB_CARD_STRINGS.rmQcFailed}
            tone="danger"
            dot
            testID={`rm-qc-failed-${c.id}`}
          />
        )}
        <Chip label={JOB_CARD_STRINGS.workOrder(c.id)} />
        {!!c.code && <Chip label={JOB_CARD_STRINGS.jobCardNumber(c.code)} />}
        <Chip label={C.priority(PRIORITY_META[c.priority].label)} />
        <Chip label={C.quantity(c.quantity)} />
        {!!c.dueDate && <Chip label={C.due(formatLongDate(c.dueDate))} />}
      </View>

      <View style={styles.divider} />

      <View style={styles.bottom}>
        <View style={styles.operator}>
          {op?.operator ? (
            <N1Avatar name={op.operator} size="sm" />
          ) : (
            <N1Icon name="user" size="md" color="textTertiary" />
          )}
          <View>
            <N1Text variant="small" weight="semiBold" numberOfLines={1}>
              {op?.operator || C.noOperator}
            </N1Text>
            <N1Text variant="caption" color="tertiary">
              {C.operator}
            </N1Text>
          </View>
        </View>
        <View style={styles.progress}>
          <N1Text variant="h3" testID={`job-progress-${c.id}`}>
            {`${progress}%`}
          </N1Text>
          <N1Text variant="caption" color="tertiary">
            {C.done}
          </N1Text>
        </View>
      </View>
      <N1ProgressBar
        value={progress}
        tone={progressTone(progress)}
        testID={`job-progress-bar-${c.id}`}
      />
    </Pressable>
  );
});
