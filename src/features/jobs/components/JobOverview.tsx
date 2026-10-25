import { memo, type ReactNode } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  N1Badge,
  N1Button,
  N1Chip,
  N1Text,
  N1Timer,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { formatLongDate, formatTime } from '../../../shared/utils';
import {
  DashedTile,
  JOB_CARD_STRINGS,
  MATERIAL_QC_META,
  MetaBadge,
  RouteCard,
  currentOperation,
  jobProgress,
  type JobCard,
} from '../../jobCards';
import { PRIORITY_META } from '../../orders/constants';
import {
  JOBS_STRINGS,
  OPERATION_STATUS_META,
  QC_STATUS_META,
  QC_STRINGS,
} from '../constants';
import type { QcItem, QcKind } from '../qc';
import type { JobsScreenProps } from '../types';

const S = JOBS_STRINGS.operatorJob;
const D = JOB_CARD_STRINGS.details;

const makeStyles = createN1Styles(t => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  panel: {
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.background,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.md,
  },
  stats: { flexDirection: 'row', gap: t.spacing.md },
  stat: {
    flex: 1,
    gap: t.spacing.xxs,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
  },
  titles: { flex: 1, gap: t.spacing.xxs },
}));

/** The step being worked on: machine, operator and time on it. */
function ActiveStation({ jobCard }: { jobCard: JobCard }) {
  const styles = useN1Styles(makeStyles);
  const op = currentOperation(jobCard);
  if (!op) {
    return null;
  }
  const started = op.status === 'running' || op.status === 'paused';
  const meta = OPERATION_STATUS_META[op.status];
  return (
    <View style={styles.panel} testID="active-station">
      <View style={styles.panelHeader}>
        <N1Text variant="overline" color="secondary">
          {started ? S.activeStation : S.nextOperation}
        </N1Text>
        <N1Badge label={meta.label} tone={meta.tone} dot />
      </View>
      <N1Text variant="h2">{op.name}</N1Text>
      <View style={styles.row}>
        <N1Chip label={`${S.machine}:`} value={op.machine || S.notAssigned} />
        <N1Chip label={`${S.operator}:`} value={op.operator || S.notAssigned} />
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <N1Text variant="caption" color="secondary">
            {S.startedAt}
          </N1Text>
          <N1Text weight="bold">
            {op.startedAt ? formatTime(op.startedAt) : COMMON_STRINGS.dash}
          </N1Text>
        </View>
        <View style={styles.stat}>
          <N1Text variant="caption" color="secondary">
            {S.elapsed}
          </N1Text>
          {started && op.startedAt ? (
            <N1Timer
              startedAt={new Date(op.startedAt)}
              running={op.status === 'running'}
              weight="bold"
              testID="elapsed-time"
            />
          ) : (
            <N1Text weight="bold">{COMMON_STRINGS.dash}</N1Text>
          )}
        </View>
      </View>
      <StationFooter jobCard={jobCard} />
    </View>
  );
}

/**
 * The drawing file (opens the Drawing screen) and the material QC badge,
 * under a station panel.
 */
function StationFooter({ jobCard }: { jobCard: JobCard }) {
  const navigation =
    useNavigation<JobsScreenProps<'OperatorJob'>['navigation']>();
  const meta = MATERIAL_QC_META[jobCard.materialQc];
  return (
    <>
      <DashedTile
        icon="file"
        label={jobCard.designFile?.name ?? D.noDrawing}
        layout="row"
        onPress={() =>
          navigation.navigate('Drawing', { orderId: jobCard.orderId })
        }
        testID="station-drawing"
      />
      <MetaBadge meta={meta} label={S.materialQc(meta.label)} />
    </>
  );
}

/**
 * QC Check's station: what is checked ("Turning (Lathe) QC"), its status and
 * who is assigned. No timer: QC isn't timed.
 */
export function QcStation({
  jobCard,
  kind,
  item,
  assignedQc,
}: {
  jobCard: JobCard;
  kind: QcKind;
  item: QcItem;
  assignedQc: string;
}) {
  const styles = useN1Styles(makeStyles);
  const meta = QC_STATUS_META[item.status];
  const op = kind === 'machine' ? item.operation : undefined;
  const title =
    kind === 'machine'
      ? QC_STRINGS.station.operationQc(op?.name ?? item.stage)
      : QC_STRINGS.stages.materialStage;
  return (
    <View style={styles.panel} testID="qc-station">
      <View style={styles.panelHeader}>
        <N1Text variant="overline" color="secondary">
          {item.stage}
        </N1Text>
        <N1Badge label={meta.label} tone={meta.tone} dot />
      </View>
      <N1Text variant="h2">{title}</N1Text>
      <View style={styles.row}>
        {op?.machine ? (
          <N1Chip label={`${S.machine}:`} value={op.machine} />
        ) : null}
        <N1Chip
          label={`${QC_STRINGS.station.assignedQc}:`}
          value={assignedQc || S.notAssigned}
        />
      </View>
      <StationFooter jobCard={jobCard} />
    </View>
  );
}

/**
 * Shop-floor view of a job: priority / due / qty, a station panel (the
 * operator's active station unless `station` replaces it) and the route card.
 */
export const JobOverview = memo(function JobOverviewComponent({
  jobCard,
  station,
  onViewDetails,
}: {
  jobCard: JobCard;
  station?: ReactNode;
  /** Shows View Details, which opens the work order. */
  onViewDetails?: () => void;
}) {
  const styles = useN1Styles(makeStyles);
  const op = currentOperation(jobCard);
  const ops = jobCard.operations;
  const step = op ? ops.indexOf(op) + 1 : 0;
  return (
    <>
      <View style={styles.row}>
        <N1Chip
          label={D.priority}
          value={PRIORITY_META[jobCard.priority].label}
        />
        <N1Chip label={D.due} value={formatLongDate(jobCard.dueDate)} />
        <N1Chip
          label={D.qty}
          value={JOB_CARD_STRINGS.quantity(jobCard.quantity)}
        />
      </View>
      {onViewDetails && (
        <N1Button
          title={JOBS_STRINGS.orderDetails.open}
          leftIcon="file"
          variant="secondary"
          fullWidth
          onPress={onViewDetails}
          testID="view-order-details"
        />
      )}
      {station ??
        (jobCard.status === 'completed' ? (
          <N1Text color="secondary">{S.allDone}</N1Text>
        ) : (
          <ActiveStation jobCard={jobCard} />
        ))}
      <View style={styles.panel}>
        <View style={styles.titles}>
          <N1Text variant="title" weight="bold">
            {S.routeCard}
          </N1Text>
          {step > 0 && (
            <N1Text variant="small" color="secondary">
              {S.step(step, ops.length)}
            </N1Text>
          )}
        </View>
        <RouteCard operations={ops} progress={jobProgress(jobCard)} />
      </View>
    </>
  );
});
