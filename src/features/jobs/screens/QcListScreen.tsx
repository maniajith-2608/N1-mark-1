import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AsyncContent,
  N1Badge,
  N1Text,
  UserScreen,
  createN1Styles,
  sectionTabLabel,
  useN1Styles,
  useSectionTabsOptions,
  type FilterValues,
} from '../../../shared/components';
import { EmployeeHomeHeader } from '../../profile';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useListFilter } from '../../../shared/hooks';
import { jobCardSearchText, type JobCard } from '../../jobCards';
import { distinctOptions } from '../../jobCards/utils';
import { JOBS_STRINGS, QC_STATUS_META, QC_STRINGS } from '../constants';
import { useMyJobs } from '../hooks/useMyJobs';
import { qcItem, type QcKind } from '../qc';
import { JobsSearchRow } from '../components/JobsSearchRow';
import { UserJobCard } from '../components/UserJobCard';
import type { JobsScreenProps } from '../types';

/** Raw Material QC and Machine QC as swipeable pages, like Billing. */
const QcTabs = createMaterialTopTabNavigator<Record<QcKind, undefined>>();

const makeStyles = createN1Styles(t => ({
  root: { flex: 1, backgroundColor: t.colors.background },
}));

const S = QC_STRINGS;
const L = JOBS_STRINGS.myJobs;

const TABS: { key: QcKind; label: string }[] = [
  { key: 'rm', label: S.tabs.rm },
  { key: 'machine', label: S.tabs.machine },
];

type Navigation = JobsScreenProps<'QcCheck'>['navigation'];

/** QC status label of a job for a tab, as shown on its row. */
const statusOf = (c: JobCard, kind: QcKind) =>
  QC_STATUS_META[qcItem(c, kind).status].label;

/** One tab's page: its pending count, then its checks. */
function QcTabPage({
  kind,
  items,
  filtered,
  statuses,
  status,
  error,
  reload,
  onOpen,
}: {
  kind: QcKind;
  items: JobCard[];
  /** After the search. */
  filtered: JobCard[];
  /** Picked in the filter; empty shows every status. */
  statuses: readonly string[];
  status: ReturnType<typeof useMyJobs>['status'];
  error: string | null;
  reload: () => void;
  onOpen: (c: JobCard, kind: QcKind) => void;
}) {
  const shown = useMemo(
    () =>
      statuses.length === 0
        ? filtered
        : filtered.filter(c => statuses.includes(statusOf(c, kind))),
    [filtered, statuses, kind],
  );
  const pending = useMemo(
    () => items.filter(c => qcItem(c, kind).status === 'pending').length,
    [items, kind],
  );
  return (
    <UserScreen background="muted" testID={`qc-tab-page-${kind}`}>
      <N1Text variant="small" color="secondary" testID="qc-count">
        {S.subtitle(pending, items.length)}
      </N1Text>
      <AsyncContent
        status={status}
        error={error}
        onRetry={reload}
        hasData={items.length > 0}
      >
        {shown.length === 0 ? (
          <N1Text color="secondary" align="center">
            {items.length ? COMMON_STRINGS.noResults : L.empty}
          </N1Text>
        ) : (
          shown.map(c => {
            const item = qcItem(c, kind);
            const meta = QC_STATUS_META[item.status];
            return (
              <UserJobCard
                key={c.id}
                jobCard={c}
                onPress={() => onOpen(c, kind)}
                status={<N1Badge label={meta.label} tone={meta.tone} dot />}
                where={`${item.stage} · ${item.subject}`}
                testID={`qc-row-${c.id}`}
              />
            );
          })
        )}
      </AsyncContent>
    </UserScreen>
  );
}

/**
 * QC's home: its jobs as Raw Material QC or Machine QC checks, under the
 * black header with the search, the filter (by QC status) and the QR
 * scanner (Import Job). The two kinds are swipeable tabs with an underline,
 * like Billing on phones.
 */
export function QcListScreen() {
  const styles = useN1Styles(makeStyles);
  const navigation = useNavigation<Navigation>();
  const { items, status, error, reload } = useMyJobs();
  const [kind, setKind] = useState<QcKind>('rm');
  const [filters, setFilters] = useState<FilterValues>({});
  const { query, setQuery, filtered } = useListFilter(items, {
    getSearchText: jobCardSearchText,
  });
  const sectionTabsOptions = useSectionTabsOptions();
  // With two tabs, each takes half the width (as on Billing).
  const tabOptions = useMemo(
    () => ({
      ...sectionTabsOptions,
      tabBarScrollEnabled: false,
      tabBarItemStyle: undefined,
    }),
    [sectionTabsOptions],
  );
  // By the QC status shown on each row, for the open tab.
  const filterGroups = useMemo(
    () => [
      {
        key: 'status',
        label: S.statusFilter,
        options: distinctOptions(items.map(c => statusOf(c, kind))),
      },
    ],
    [items, kind],
  );
  const statuses = filters.status ?? [];
  const openCheck = useCallback(
    (c: JobCard, k: QcKind) =>
      navigation.navigate('QcCheck', { jobCardId: c.id, kind: k }),
    [navigation],
  );

  return (
    <View style={styles.root} testID="qc-list-screen">
      <EmployeeHomeHeader title={S.title}>
        <JobsSearchRow
          query={query}
          onQueryChange={setQuery}
          placeholder={L.search}
          filterGroups={filterGroups}
          filters={filters}
          onApplyFilters={setFilters}
          onScan={() => navigation.navigate('ScanJob', { qcKind: kind })}
        />
      </EmployeeHomeHeader>
      <QcTabs.Navigator
        initialRouteName={kind}
        screenOptions={tabOptions}
        screenListeners={({ route }) => ({
          focus: () => setKind(route.name),
        })}
      >
        {TABS.map(({ key, label }) => (
          <QcTabs.Screen
            key={key}
            name={key}
            options={{
              title: label,
              tabBarAccessibilityLabel: label,
              tabBarButtonTestID: `qc-tabs-${key}`,
              tabBarLabel: sectionTabLabel(label),
            }}
          >
            {() => (
              <QcTabPage
                kind={key}
                items={items}
                filtered={filtered}
                statuses={statuses}
                status={status}
                error={error}
                reload={reload}
                onOpen={openCheck}
              />
            )}
          </QcTabs.Screen>
        ))}
      </QcTabs.Navigator>
    </View>
  );
}
