import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import {
  AsyncContent,
  N1Icon,
  N1Text,
  createN1Styles,
  useN1Styles,
  useN1Breakpoint,
} from '../../../shared/components';
import { formatDate } from '../../../shared/utils';
import {
  JOB_CARD_STRINGS,
  JobCardStatusBadge,
  jobCardsWorkedBy,
  jobTitle,
  useJobCards,
  type JobCardWork,
} from '../../jobCards';
import { USER_STRINGS } from '../constants';
import type { AdminUser } from '../types';

const W = USER_STRINGS.details.work;

/** How many job cards Work history lists. */
const WORK_HISTORY_LIMIT = 10;

const makeStyles = createN1Styles(t => ({
  panel: { gap: t.spacing.lg },
  heading: { gap: t.spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.sm,
    borderRadius: t.radius.sm,
  },
  // Phones: rows line up with the heading and the page edge.
  rowCompact: { paddingHorizontal: 0 },
  divider: {
    borderTopWidth: t.borderWidth.hairline,
    borderTopColor: t.colors.border,
  },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  icon: {
    width: t.avatarSize.md,
    height: t.avatarSize.md,
    borderRadius: t.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceMuted,
  },
  text: { flex: 1, gap: t.spacing.xxs },
}));

type Props = {
  user: AdminUser;
  onOpen: (jobCardId: string) => void;
};

/**
 * User details → Work history: the last job cards this person ran a step
 * on, one compact row each. A row opens the job card.
 */
export function UserWorkHistory({ user, onOpen }: Props) {
  const styles = useN1Styles(makeStyles);
  const { items, status, error, reload } = useJobCards();
  const work = useMemo(
    () => jobCardsWorkedBy(items, user.name, WORK_HISTORY_LIMIT),
    [items, user.name],
  );

  return (
    <View style={styles.panel} testID="user-work-history">
      <View style={styles.heading}>
        <N1Text variant="h3">{USER_STRINGS.details.sections.work}</N1Text>
        <N1Text variant="small" color="secondary">
          {W.subtitle(user.name)}
        </N1Text>
      </View>
      <AsyncContent status={status} error={error} onRetry={reload}>
        {work.length ? (
          <View>
            {work.map((entry, i) => (
              <WorkRow
                key={entry.jobCard.id}
                work={entry}
                first={i === 0}
                onOpen={onOpen}
              />
            ))}
          </View>
        ) : (
          <N1Text variant="small" color="secondary">
            {W.empty(user.name)}
          </N1Text>
        )}
      </AsyncContent>
    </View>
  );
}

function WorkRow({
  work: { jobCard, operations, startedAt },
  first,
  onOpen,
}: {
  work: JobCardWork;
  first: boolean;
  onOpen: (jobCardId: string) => void;
}) {
  const styles = useN1Styles(makeStyles);
  const { isCompact } = useN1Breakpoint();
  // "RC #1040 • Deburring, Marking • Started Sep 25, 2026"
  const details = [
    W.routeCard(jobCard.id),
    operations.map(op => op.name).join(', '),
    W.started(formatDate(startedAt)),
  ].join('  •  ');
  return (
    <View style={!first && styles.divider}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={USER_STRINGS.a11y.openJobCard(jobCard.id)}
        onPress={() => onOpen(jobCard.id)}
        style={({ pressed }) => [
          styles.row,
          isCompact && styles.rowCompact,
          pressed && styles.pressed,
        ]}
        testID={`user-work-${jobCard.id}`}
      >
        <View style={styles.icon}>
          <N1Icon name="clipboard" size="md" color="textSecondary" />
        </View>
        <View style={styles.text}>
          <N1Text variant="label" weight="semiBold" numberOfLines={1}>
            {W.title(
              JOB_CARD_STRINGS.jobCardNumber(jobCard.code),
              jobTitle(jobCard),
            )}
          </N1Text>
          <N1Text variant="caption" color="secondary" numberOfLines={1}>
            {W.workOrder(jobCard.number)}
          </N1Text>
          <N1Text variant="caption" color="secondary" numberOfLines={1}>
            {details}
          </N1Text>
        </View>
        <JobCardStatusBadge jobCard={jobCard} />
      </Pressable>
    </View>
  );
}
