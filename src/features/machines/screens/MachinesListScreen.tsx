import { useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  HeaderSearchBar,
  FilterMenu,
  ListToolbar,
  N1Button,
  N1IconButton,
  N1Pagination,
  N1Table,
  N1Text,
  useN1Breakpoint,
  type FilterValues,
  type N1TableColumn,
} from '../../../shared/components';
import { AdminScreen, AsyncContent } from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useListFilter, usePagination } from '../../../shared/hooks';
import { CurrentWork } from '../components/CurrentWork';
import { MachineStatusBadge } from '../components/MachineBadge';
import { MachineCard } from '../components/MachineCard';
import { MachineFormModal } from '../components/MachineFormModal';
import {
  MACHINE_STATUS_OPTIONS,
  MACHINE_STRINGS as S,
  MACHINE_TYPE_LABELS,
} from '../constants';
import { useMachineStats, useMachines } from '../hooks/useMachines';
import type { Machine, MachineFilters, MachinesNavigation } from '../types';
import {
  INITIAL_MACHINE_FILTERS,
  machineSearchText,
  matchesMachineFilters,
  operationLabel,
} from '../utils';
import { useTopBarAction } from '../../dashboard/hooks/useTopBarAction';

type FormTarget = { machine: Machine | null } | null;

export function MachinesListScreen() {
  const navigation = useNavigation<MachinesNavigation>();
  const { isCompact } = useN1Breakpoint();
  const { items, status, error, reload } = useMachines();
  const stats = useMachineStats();
  const { query, setQuery, filters, setFilter, filtered } = useListFilter(
    items,
    {
      getSearchText: machineSearchText,
      initialFilters: INITIAL_MACHINE_FILTERS,
      matchesFilters: matchesMachineFilters,
    },
  );
  const pager = usePagination(filtered);

  const filterGroups = useMemo(
    () => [
      {
        key: 'status',
        label: S.statusFilter,
        options: MACHINE_STATUS_OPTIONS,
      },
    ],
    [],
  );
  const applyFilters = useCallback(
    (next: FilterValues) =>
      setFilter('status', [...(next.status ?? [])] as MachineFilters['status']),
    [setFilter],
  );

  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const openCreate = useCallback(() => setFormTarget({ machine: null }), []);
  const openEdit = useCallback(
    (machine: Machine) => setFormTarget({ machine }),
    [],
  );
  const closeForm = useCallback(() => setFormTarget(null), []);
  const openDetails = useCallback(
    (m: Machine) => navigation.navigate('MachineDetails', { machineId: m.id }),
    [navigation],
  );

  const columns = useMemo<N1TableColumn<Machine>[]>(
    () => [
      {
        key: 'code',
        title: S.columns.code,
        flex: 1.2,
        render: m => (
          <View>
            <N1Text weight="bold">{m.code}</N1Text>
            <N1Text variant="caption" color="secondary">
              {m.model}
            </N1Text>
          </View>
        ),
      },
      {
        key: 'type',
        title: S.columns.type,
        render: m => <N1Text>{MACHINE_TYPE_LABELS[m.type]}</N1Text>,
      },
      {
        key: 'operation',
        title: S.columns.operation,
        render: m => <N1Text>{operationLabel(m)}</N1Text>,
      },
      { key: 'location', title: S.columns.location, flex: 0.8 },
      {
        key: 'work',
        title: S.columns.work,
        flex: 1.8,
        render: m => <CurrentWork work={m.currentWork} />,
      },
      {
        key: 'status',
        title: S.columns.status,
        render: m => <MachineStatusBadge status={m.status} />,
      },
      {
        key: 'actions',
        interactive: true,
        title: S.columns.actions,
        flex: 0.8,
        render: m => (
          <N1IconButton
            icon="edit"
            variant="primary"
            size="sm"
            onPress={() => openEdit(m)}
            accessibilityLabel={S.a11y.edit(m.code)}
          />
        ),
      },
    ],
    [openEdit],
  );

  // Clicking a row opens Machine details; the pencil opens the Edit dialog.
  const renderCompactItem = useCallback(
    (m: Machine) => <MachineCard machine={m} onEdit={openEdit} />,
    [openEdit],
  );

  const addButton = (
    <N1Button
      title={S.add}
      leftIcon="plus"
      size="sm"
      onPress={openCreate}
      testID="add-machine"
    />
  );

  const firstLoad =
    (status === 'idle' || status === 'loading') && items.length === 0;

  // Phones: Add sits in the top bar, in place of the user's initials.
  const addAction = useMemo(
    () =>
      isCompact
        ? {
            icon: 'plus' as const,
            label: S.addA11y,
            onPress: openCreate,
            testID: 'add-machine',
          }
        : undefined,
    [isCompact, openCreate],
  );
  useTopBarAction(addAction);

  const toolbar = (
    <ListToolbar
      align="end"
      filled
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder={S.search}
    >
      <FilterMenu
        groups={filterGroups}
        value={filters}
        onApply={applyFilters}
        testID="machines-filter"
      />
      {addButton}
    </ListToolbar>
  );

  return (
    <AdminScreen
      // Phones: search and filter on the black header, under the top
      // bar that shows this screen's name.
      header={
        isCompact ? (
          <HeaderSearchBar
            query={query}
            onQueryChange={setQuery}
            placeholder={S.search}
            right={
              <FilterMenu
                variant="inverse"
                groups={filterGroups}
                value={filters}
                onApply={applyFilters}
                testID="machines-filter"
              />
            }
          />
        ) : undefined
      }
      testID="machines-screen"
      fixed
    >
      {/* Wide screens: the title and Add live in the table's toolbar. */}
      {/* The table shows its own loading state; AsyncContent only takes over
          when the first load fails. */}
      <AsyncContent
        status={firstLoad ? 'succeeded' : status}
        error={error}
        onRetry={reload}
        hasData={items.length > 0}
      >
        <N1Table
          loading={firstLoad}
          columns={columns}
          data={pager.pageItems}
          keyExtractor={m => m.id}
          onRowPress={openDetails}
          renderCompactItem={renderCompactItem}
          toolbarTitle={isCompact ? undefined : S.title}
          toolbar={isCompact ? undefined : toolbar}
          scrollable={!isCompact}
          emptyText={
            items.length ? COMMON_STRINGS.noResults : COMMON_STRINGS.empty
          }
          footer={
            // Every page, phones too: after the last card.
            <N1Pagination
              summary={
                isCompact
                  ? COMMON_STRINGS.showing(
                      pager.shownCount,
                      pager.total,
                      S.noun,
                    )
                  : S.summary(
                      COMMON_STRINGS.showing(
                        pager.shownCount,
                        pager.total,
                        S.noun,
                      ),
                      stats,
                    )
              }
              hasPrevious={pager.hasPrevious}
              hasNext={pager.hasNext}
              onPrevious={pager.previous}
              onNext={pager.next}
              page={pager.page}
              pageCount={pager.pageCount}
              onPageChange={pager.goTo}
            />
          }
          testID="machines-table"
        />
      </AsyncContent>
      <MachineFormModal
        visible={formTarget !== null}
        machine={formTarget?.machine}
        onClose={closeForm}
      />
    </AdminScreen>
  );
}
