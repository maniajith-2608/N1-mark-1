import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  AsyncContent,
  ComingSoon,
  N1Badge,
  N1Button,
  N1Header,
  N1SelectCard,
  N1Text,
  UserScreen,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { useOnSettled } from '../../../shared/hooks';
import {
  JOB_CARD_STRINGS,
  currentOperation,
  jobHeading,
  useJobCard,
} from '../../jobCards';
import { useMachines, type Machine } from '../../machines';
import { JOBS_STRINGS } from '../constants';
import type { JobsScreenProps } from '../types';

const S = JOBS_STRINGS.assignMachine;

const makeStyles = createN1Styles(t => ({
  summary: { gap: t.spacing.xs, alignItems: 'flex-start' },
  list: { gap: t.spacing.md },
}));

type Availability = 'available' | 'inUse' | 'maintenance';

const BADGE: Record<
  Availability,
  { label: string; tone: 'success' | 'neutral' | 'warning' }
> = {
  available: { label: S.available, tone: 'success' },
  inUse: { label: S.inUse, tone: 'neutral' },
  maintenance: { label: S.maintenance, tone: 'warning' },
};

/**
 * Choose an idle machine for the next operation (or its rework), then start
 * it (startJobStep). The step is already assigned to this operator.
 */
export function AssignMachineScreen({
  route,
  navigation,
}: JobsScreenProps<'AssignMachine'>) {
  const styles = useN1Styles(makeStyles);
  const { jobCardId } = route.params;
  const { jobCard, status, error, reload, run, saving, saveError } =
    useJobCard(jobCardId);
  const machines = useMachines();
  // The machine's id.
  const [selected, setSelected] = useState<string>();

  const goBack = useCallback(() => navigation.goBack(), [navigation]);
  useOnSettled(saving, saveError, goBack);

  // One machine runs one step at a time: the server marks it running.
  const availability = useMemo(
    () =>
      (m: Machine): Availability =>
        m.status === 'maintenance'
          ? 'maintenance'
          : m.status === 'running'
          ? 'inUse'
          : 'available',
    [],
  );

  const header = (
    <N1Header title={S.title} leftIcon="chevron-left" onLeftPress={goBack} />
  );
  if (!jobCard) {
    return (
      <UserScreen header={header} testID="assign-machine-screen">
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon
            icon="clipboard"
            title={S.title}
            message={JOB_CARD_STRINGS.details.notFound}
          />
        </AsyncContent>
      </UserScreen>
    );
  }

  const op = currentOperation(jobCard);
  const confirm = () => {
    if (selected && op) {
      run({ type: 'start', operationId: op.id, machineId: selected });
    }
  };

  return (
    <UserScreen
      header={header}
      footer={
        <N1Button
          title={S.confirm}
          leftIcon="play"
          size="lg"
          fullWidth
          disabled={!selected}
          loading={saving}
          onPress={confirm}
          testID="confirm-start"
        />
      }
      testID="assign-machine-screen"
    >
      <View style={styles.summary}>
        {op && <N1Badge label={op.name} tone="info" />}
        <N1Text variant="title" weight="bold">
          {jobHeading(jobCard)}
        </N1Text>
        <N1Text variant="small" color="secondary">
          {S.help}
        </N1Text>
      </View>
      <AsyncContent
        status={machines.status}
        error={machines.error}
        onRetry={machines.reload}
      >
        {machines.items.length === 0 ? (
          <N1Text color="secondary">{S.empty}</N1Text>
        ) : (
          <View style={styles.list}>
            {machines.items.map(m => {
              const state = availability(m);
              return (
                <N1SelectCard
                  key={m.id}
                  title={m.name}
                  subtitle={`${m.code} · ${m.location}`}
                  right={
                    <N1Badge
                      label={BADGE[state].label}
                      tone={BADGE[state].tone}
                    />
                  }
                  selected={selected === m.id}
                  disabled={state !== 'available'}
                  onPress={() => setSelected(m.id)}
                  testID={`machine-${m.code}`}
                />
              );
            })}
          </View>
        )}
      </AsyncContent>
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </UserScreen>
  );
}
