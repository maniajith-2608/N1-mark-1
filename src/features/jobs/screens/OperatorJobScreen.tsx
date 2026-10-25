import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import {
  AsyncContent,
  ComingSoon,
  N1Badge,
  N1Button,
  N1Header,
  N1Text,
  UserScreen,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import {
  JOB_CARD_STRINGS,
  JobCardStatusBadge,
  currentOperation,
  jobHeading,
  startBlockedReason,
  useJobCard,
  type JobOperation,
} from '../../jobCards';
import {
  CompleteStepDialog,
  PauseStepDialog,
} from '../../jobCards/components/StepDialogs';
import { JobOverview } from '../components/JobOverview';
import { JOBS_STRINGS } from '../constants';
import type { JobsScreenProps } from '../types';

const S = JOBS_STRINGS.operatorJob;
const D = JOB_CARD_STRINGS.details;

const makeStyles = createN1Styles(t => ({
  summary: { gap: t.spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));

/**
 * Operator's job: start the next operation (after choosing an idle
 * machine), then pause (with a reason), resume or complete it (with its
 * good, rejected, rework and scrap pieces). Each is its own mutation.
 */
export function OperatorJobScreen({
  route,
  navigation,
}: JobsScreenProps<'OperatorJob'>) {
  const styles = useN1Styles(makeStyles);
  const { jobCardId } = route.params;
  const { jobCard, status, error, reload, run, saving, saveError } =
    useJobCard(jobCardId);
  const [dialog, setDialog] = useState<{
    type: 'pause' | 'complete';
    operation: JobOperation;
  } | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);
  const header = (
    <N1Header title={S.title} leftIcon="chevron-left" onLeftPress={goBack} />
  );

  if (!jobCard) {
    return (
      <UserScreen header={header} testID="operator-job-screen">
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="clipboard" title={S.title} message={D.notFound} />
        </AsyncContent>
      </UserScreen>
    );
  }

  const op = currentOperation(jobCard);
  const opStatus = jobCard.status === 'completed' ? 'completed' : op?.status;

  // A list (not a fragment) so the bottom bar gives each button a slot.
  let footer: React.ReactNode = null;
  if (opStatus === 'running') {
    footer = [
      <N1Button
        key="pause"
        title={S.pause}
        leftIcon="pause"
        variant="secondary"
        size="lg"
        fullWidth
        disabled={saving}
        onPress={() => op && setDialog({ type: 'pause', operation: op })}
        testID="pause-operation"
      />,
      <N1Button
        key="complete"
        title={S.complete}
        leftIcon="check"
        variant="success"
        size="lg"
        fullWidth
        disabled={saving}
        onPress={() => op && setDialog({ type: 'complete', operation: op })}
        testID="complete-operation"
      />,
    ];
  } else if (opStatus === 'paused') {
    // Resumes on the machine it was already running on.
    footer = (
      <N1Button
        title={S.resume}
        leftIcon="play"
        size="lg"
        fullWidth
        loading={saving}
        onPress={() => op && run({ type: 'resume', operationId: op.id })}
        testID="resume-operation"
      />
    );
  } else if (opStatus === 'pending') {
    // Waits for RM QC and for the last step's QC check to pass.
    const blocked = startBlockedReason(jobCard);
    footer = (
      <N1Button
        title={blocked ?? S.start}
        leftIcon={blocked ? 'clock' : 'play'}
        size="lg"
        fullWidth
        disabled={!!blocked}
        onPress={() => navigation.navigate('AssignMachine', { jobCardId })}
        testID="start-operation"
      />
    );
  }

  return (
    <UserScreen header={header} footer={footer} testID="operator-job-screen">
      <View style={styles.summary}>
        <View style={styles.row}>
          {op && <N1Badge label={op.name} tone="info" />}
          <JobCardStatusBadge jobCard={jobCard} />
        </View>
        <N1Text variant="h2">{jobHeading(jobCard)}</N1Text>
        <N1Text weight="semiBold" color="secondary">
          {jobCard.customerName}
        </N1Text>
      </View>
      <JobOverview
        jobCard={jobCard}
        onViewDetails={() =>
          navigation.navigate('OrderDetails', { orderId: jobCard.orderId })
        }
      />
      {saveError && !dialog && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
      <PauseStepDialog
        operation={dialog?.type === 'pause' ? dialog.operation : null}
        jobCard={jobCard}
        onClose={closeDialog}
      />
      <CompleteStepDialog
        operation={dialog?.type === 'complete' ? dialog.operation : null}
        jobCard={jobCard}
        onClose={closeDialog}
      />
    </UserScreen>
  );
}
