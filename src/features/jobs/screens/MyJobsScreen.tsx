import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  AsyncContent,
  N1Text,
  UserScreen,
  type FilterValues,
} from '../../../shared/components';
import { EmployeeHomeHeader } from '../../profile';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useListFilter } from '../../../shared/hooks';
import {
  currentOperation,
  jobCardSearchText,
  jobCardStage,
  stageMeta,
  type JobCard,
} from '../../jobCards';
import { FlowActionButton } from '../../jobCards/components/FlowActionButton';
import { FlowEditorSheet } from '../../jobCards/components/FlowEditorSheet';
import { JOB_CARD_STRINGS } from '../../jobCards/constants';
import { distinctOptions } from '../../jobCards/utils';
import { UserJobCard } from '../components/UserJobCard';
import { JobsSearchRow } from '../components/JobsSearchRow';
import { JOBS_STRINGS, ROLE_JOBS } from '../constants';
import { useMyJobs } from '../hooks/useMyJobs';
import type { JobsScreenProps } from '../types';

const S = JOBS_STRINGS.myJobs;

type Navigation = JobsScreenProps<'ScanJob'>['navigation'];

const stageOf = (c: JobCard) => stageMeta(jobCardStage(c)).label;
const operationOf = (c: JobCard) => currentOperation(c)?.name ?? '';
const machineOf = (c: JobCard) => currentOperation(c)?.machine ?? '';

/** Filter groups, and what each one reads from a job. */
const FILTERS = [
  { key: 'stage', label: S.stageFilter, value: stageOf },
  { key: 'operation', label: S.operationFilter, value: operationOf },
  { key: 'machine', label: S.machineFilter, value: machineOf },
] as const;

const matchesFilters = (c: JobCard, filters: FilterValues) =>
  FILTERS.every(({ key, value }) => {
    const picked = filters[key] ?? [];
    return picked.length === 0 || picked.includes(value(c));
  });

/**
 * The role's home: their imported jobs under the black header, which holds
 * the search, the filter and the QR scanner (Import Order).
 */
export function MyJobsScreen() {
  const navigation = useNavigation<Navigation>();
  const { role, items, stats, status, error, reload } = useMyJobs();
  const rows = ROLE_JOBS[role].list === 'rows';
  const [filters, setFilters] = useState<FilterValues>({});
  const { query, setQuery, filtered } = useListFilter(items, {
    getSearchText: jobCardSearchText,
  });
  const shown = useMemo(
    () => filtered.filter(c => matchesFilters(c, filters)),
    [filtered, filters],
  );
  const filterGroups = useMemo(
    () =>
      FILTERS.map(({ key, label, value }) => ({
        key,
        label,
        options: distinctOptions(items.map(value)),
      })),
    [items],
  );
  const openDetails = useCallback(
    (c: JobCard) => navigation.navigate('JobCardDetails', { jobCardId: c.id }),
    [navigation],
  );
  const openJob = useCallback(
    (c: JobCard) => navigation.navigate('OperatorJob', { jobCardId: c.id }),
    [navigation],
  );
  // Create / Edit flow slides up right here, so closing it stays on the
  // list instead of passing through the job card.
  const [flowId, setFlowId] = useState<string | null>(null);
  const closeFlow = useCallback(() => setFlowId(null), []);
  const openFlow = useCallback((c: JobCard) => setFlowId(c.id), []);
  const flowJobCard = items.find(c => c.id === flowId);
  const flowDrawingNumber = flowJobCard
    ? flowJobCard.drawingNumber ||
      flowJobCard.designFile?.name ||
      JOB_CARD_STRINGS.details.noDrawing
    : '';

  const header = (
    <EmployeeHomeHeader title={S.title}>
      <JobsSearchRow
        query={query}
        onQueryChange={setQuery}
        placeholder={S.search}
        filterGroups={filterGroups}
        filters={filters}
        onApplyFilters={setFilters}
        onScan={() => navigation.navigate('ScanJob')}
      />
    </EmployeeHomeHeader>
  );

  return (
    <UserScreen header={header} background="muted" testID="my-jobs-screen">
      <N1Text variant="small" color="secondary" testID="my-jobs-count">
        {rows
          ? S.inProgressSubtitle(stats.inProgress, stats.total)
          : S.subtitle(stats.active, stats.total)}
      </N1Text>
      <AsyncContent
        status={status}
        error={error}
        onRetry={reload}
        hasData={items.length > 0}
      >
        {shown.length === 0 ? (
          <N1Text color="secondary" align="center">
            {items.length ? COMMON_STRINGS.noResults : S.empty}
          </N1Text>
        ) : (
          shown.map(c => (
            <UserJobCard
              key={c.id}
              jobCard={c}
              onPress={rows ? openJob : openDetails}
              action={
                rows ? undefined : (
                  <FlowActionButton
                    jobCard={c}
                    onPress={openFlow}
                    appearance="card"
                  />
                )
              }
              testID={rows ? `job-row-${c.id}` : undefined}
            />
          ))
        )}
      </AsyncContent>
      <FlowEditorSheet
        visible={flowJobCard !== undefined}
        jobCard={flowJobCard}
        drawingNumber={flowDrawingNumber}
        onClose={closeFlow}
      />
    </UserScreen>
  );
}
