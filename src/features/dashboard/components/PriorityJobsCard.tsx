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
  N1ProgressBar,
  N1Text,
  createN1Styles,
  useN1Styles,
  useN1Theme,
} from '../../../shared/components';
import { formatDayMonth } from '../../../shared/utils';
import {
  JOB_CARD_STRINGS,
  currentOperation,
  jobProgress,
  progressTone,
  type JobCard,
} from '../../jobCards';
import { DASHBOARD_STRINGS } from '../constants';
import type { PriorityJob } from '../types';
import { isDueSoon } from '../utils';

const S = DASHBOARD_STRINGS.jobs;

const makeStyles = createN1Styles(t => ({
  card: {
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderRadius: t.radius.compact,
    backgroundColor: t.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.md,
  },
  list: { gap: t.spacing.sm },
  // Wide screens: the panel fills the column and only the list scrolls.
  fill: { flex: 1 },
  scroll: { flex: 1 },
  // One job: a bordered tile inside the panel.
  job: {
    gap: t.spacing.xs,
    padding: t.spacing.md,
    borderRadius: t.radius.compact,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  titles: { gap: t.spacing.xxs },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.sm,
    marginTop: t.spacing.xxs,
  },
  process: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.sm,
    marginTop: t.spacing.xxs,
  },
  due: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceMuted,
  },
  operator: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
  },
  // Nothing in the period: the message sits in the middle of the card.
  empty: { padding: t.spacing.xxl, alignItems: 'center' },
  emptyFill: { flex: 1, justifyContent: 'center' },
  pressed: { opacity: t.opacity.pressed },
}));

type Props = {
  jobs: readonly PriorityJob[];
  total: number;
  onOpenJob: (id: string) => void;
  onViewAll: () => void;
  /** Fill the parent's height and scroll the list inside the panel. */
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Job cards due soonest, each as a small tile with progress and operator. */
export const PriorityJobsCard = memo(function PriorityJobsCardComponent({
  jobs,
  total,
  onOpenJob,
  onViewAll,
  scrollable = false,
  style,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const theme = useN1Theme();
  const tiles = (
    <>
      {jobs.map(job => {
        const heading = S.heading(job.routeCardNo, job.customerName);
        // The progress helpers only read the card's operations.
        const card = job as Pick<JobCard, 'operations'> as JobCard;
        const op = currentOperation(card);
        const progress = jobProgress(card);
        // Red only while there's still work left to do.
        const urgent = progress < 100 && isDueSoon(job.dueDate);
        const danger = theme.colors.tone.danger;
        return (
          <Pressable
            key={job.id}
            accessibilityRole="button"
            accessibilityLabel={S.open(heading)}
            onPress={() => onOpenJob(job.id)}
            style={({ pressed }) => [styles.job, pressed && styles.pressed]}
            testID={`priority-job-${job.id}`}
          >
            <View style={styles.titles}>
              <N1Text variant="label" weight="bold" numberOfLines={1}>
                {heading}
              </N1Text>
              <N1Text
                variant="caption"
                color="secondary"
                numberOfLines={1}
                testID={`priority-job-ids-${job.id}`}
              >
                {[
                  JOB_CARD_STRINGS.jobCardNumber(job.code),
                  job.workOrderNumber &&
                    JOB_CARD_STRINGS.workOrder(job.workOrderNumber),
                  job.partName,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </N1Text>
            </View>

            <View style={styles.progressRow}>
              <View style={styles.process}>
                <N1Icon name="wrench" size="sm" color="textSecondary" />
                <N1Text variant="small" color="secondary" numberOfLines={1}>
                  {op?.name || S.noProcess}
                </N1Text>
              </View>
              <N1Text variant="small" weight="bold">
                {`${progress}%`}
              </N1Text>
            </View>
            <N1ProgressBar value={progress} tone={progressTone(progress)} />

            <View style={styles.footer}>
              <View
                style={[
                  styles.due,
                  urgent && { backgroundColor: danger.background },
                ]}
                testID={`priority-job-due-${job.id}`}
              >
                <N1Text
                  variant="caption"
                  weight="semiBold"
                  color={urgent ? 'danger' : 'secondary'}
                >
                  {S.due(formatDayMonth(job.dueDate))}
                </N1Text>
              </View>
              <View style={styles.operator}>
                {op?.operator ? (
                  <N1Avatar name={op.operator} tone="info" size="sm" />
                ) : null}
                <N1Text variant="small" color="secondary" numberOfLines={1}>
                  {op?.operator || S.unassigned}
                </N1Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </>
  );
  return (
    <View
      style={[styles.card, scrollable && styles.fill, style]}
      testID="priority-jobs-card"
    >
      <View style={styles.header}>
        <N1Text variant="h3" weight="bold">
          {S.title}
        </N1Text>
        <N1Button
          title={S.viewAll(total)}
          variant="ghost"
          size="sm"
          onPress={onViewAll}
          testID="view-all-jobs"
        />
      </View>
      {jobs.length === 0 ? (
        <View
          style={[styles.empty, scrollable && styles.emptyFill]}
          testID="priority-jobs-empty"
        >
          <N1Text color="secondary" align="center">
            {S.empty}
          </N1Text>
        </View>
      ) : scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          testID="priority-jobs-scroll"
        >
          {tiles}
        </ScrollView>
      ) : (
        <View style={styles.list}>{tiles}</View>
      )}
    </View>
  );
});
