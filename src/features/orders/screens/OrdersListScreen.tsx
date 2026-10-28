import { useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  HeaderSearchBar,
  N1Button,
  N1IconButton,
  N1Pagination,
  N1Table,
  N1Text,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
  type N1TableColumn,
} from '../../../shared/components';
import type { OrdersScreenProps } from '../types';
import {
  AdminScreen,
  AsyncContent,
  FilterMenu,
  ListToolbar,
  type FilterValues,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useListFilter, usePagination } from '../../../shared/hooks';
import { useAppSelector } from '../../../app/store/hooks';
import { useJobCards } from '../../jobCards';
import { selectJobCardsState } from '../../jobCards/store/selectors';
import { formatDayMonth } from '../../../shared/utils';
import { OrderCard } from '../components/OrderCard';
import { OrderStatusBadge, PriorityBadge } from '../components/OrderBadges';
import { RawMaterialDialog } from '../components/RawMaterialDialog';
import {
  ORDER_STATUS_OPTIONS,
  ORDER_STRINGS as S,
  PRIORITY_OPTIONS,
} from '../constants';
import { useOrders } from '../hooks/useOrders';
import type { OrderFilters, WorkOrder } from '../types';
import {
  INITIAL_ORDER_FILTERS,
  matchesOrderFilters,
  orderSearchText,
  orderTitle,
} from '../utils';
import { useTopBarAction } from '../../dashboard/hooks/useTopBarAction';

const makeStyles = createN1Styles(t => ({
  actions: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  // Matches the filled filter next to it in the toolbar.
}));

const COLUMNS: N1TableColumn<WorkOrder>[] = [
  {
    key: 'order',
    title: S.columns.order,
    flex: 1.6,
    render: o => (
      <View>
        <N1Text weight="bold">{S.workOrder(o.number)}</N1Text>
        <N1Text variant="small" color="secondary" numberOfLines={1}>
          {orderTitle(o) || COMMON_STRINGS.dash}
        </N1Text>
      </View>
    ),
  },
  {
    key: 'customerName',
    title: S.columns.customer,
    flex: 1.5,
    render: o => (
      <N1Text numberOfLines={2}>{o.customerName || COMMON_STRINGS.dash}</N1Text>
    ),
  },
  {
    key: 'poNumber',
    title: S.columns.poNumber,
    render: o => (
      <N1Text numberOfLines={1}>{o.poNumber || COMMON_STRINGS.dash}</N1Text>
    ),
  },
  {
    key: 'routeCardNo',
    title: S.columns.rcNumber,
    render: o => (
      <N1Text numberOfLines={1}>{o.routeCardNo || COMMON_STRINGS.dash}</N1Text>
    ),
  },
  {
    key: 'priority',
    title: S.columns.priority,
    render: o => <PriorityBadge priority={o.priority} />,
  },
  {
    key: 'status',
    title: S.columns.status,
    render: o => <OrderStatusBadge status={o.status} />,
  },
  {
    key: 'dueDate',
    title: S.columns.due,
    flex: 0.8,
    render: o => (
      <N1Text>{formatDayMonth(o.dueDate) || COMMON_STRINGS.dash}</N1Text>
    ),
  },
];

/** Below this the columns get cramped, so the table scrolls sideways. */
const TABLE_MIN_WIDTH = 1100;

type Navigation = OrdersScreenProps<'OrdersList'>['navigation'];

export function OrdersListScreen() {
  const styles = useN1Styles(makeStyles);
  const navigation = useNavigation<Navigation>();
  // Loads the job cards behind each row's clipboard.
  useJobCards();
  const jobCardEntities = useAppSelector(
    state => selectJobCardsState(state).entities,
  );
  const { isCompact } = useN1Breakpoint();
  const { items, status, error, reload } = useOrders();

  const { query, setQuery, filters, setFilter, filtered } = useListFilter(
    items,
    {
      getSearchText: orderSearchText,
      initialFilters: INITIAL_ORDER_FILTERS,
      matchesFilters: matchesOrderFilters,
    },
  );
  const pager = usePagination(filtered);

  const filterGroups = useMemo(
    () => [
      {
        key: 'priority',
        label: S.priorityFilter,
        options: PRIORITY_OPTIONS,
      },
      { key: 'status', label: S.statusFilter, options: ORDER_STATUS_OPTIONS },
    ],
    [],
  );
  const applyFilters = useCallback(
    (next: FilterValues) => {
      setFilter('priority', (next.priority ?? []) as OrderFilters['priority']);
      setFilter('status', (next.status ?? []) as OrderFilters['status']);
    },
    [setFilter],
  );

  const openCreate = useCallback(
    () => navigation.navigate('OrderForm'),
    [navigation],
  );
  const openDetails = useCallback(
    (o: WorkOrder) => navigation.navigate('OrderDetails', { orderId: o.id }),
    [navigation],
  );

  const openEdit = useCallback(
    (o: WorkOrder) => navigation.navigate('OrderForm', { orderId: o.id }),
    [navigation],
  );

  // Opens the order's job card (Back returns to Orders), with Create flow
  // open when it has no route yet.
  const openJobCard = useCallback(
    (jobCardId: string, createFlow: boolean) =>
      // Pushed on the Orders stack: Back returns to this list.
      navigation.navigate('JobCardDetails', {
        jobCardId,
        editFlow: createFlow || undefined,
      }),
    [navigation],
  );
  // An order without a job card yet (FE-007): Create job card asks for its
  // raw material, which opens the card, then its Create flow.
  const [cardFor, setCardFor] = useState<WorkOrder | null>(null);
  const closeCreateCard = useCallback(() => setCardFor(null), []);
  const createdCard = useCallback(
    (jobCardId: string) => {
      setCardFor(null);
      if (jobCardId) {
        openJobCard(jobCardId, true);
      }
    },
    [openJobCard],
  );
  // The clipboard: Create job card for an order without one; Open, or
  // Create flow when it has no route yet, for one whose card is loaded.
  const jobCardAction = useCallback(
    (o: WorkOrder) => {
      if (!o.jobCardId) {
        return {
          label: S.a11y.createJobCard(o.number),
          onPress: () => setCardFor(o),
        };
      }
      const card = jobCardEntities[o.jobCardId];
      if (!card) {
        return undefined;
      }
      const createFlow = !card.operations.length;
      return {
        label: createFlow
          ? S.a11y.createJobCard(o.number)
          : S.a11y.openJobCard(o.number),
        onPress: () => openJobCard(card.id, createFlow),
      };
    },
    [jobCardEntities, openJobCard],
  );

  const columns = useMemo<N1TableColumn<WorkOrder>[]>(
    () => [
      ...COLUMNS,
      {
        key: 'actions',
        title: S.columns.actions,
        flex: 0.8,
        align: 'right',
        interactive: true,
        render: o => {
          const jobCard = jobCardAction(o);
          return (
            <View style={styles.actions}>
              {jobCard && (
                <N1IconButton
                  icon="clipboard"
                  size="sm"
                  accessibilityLabel={jobCard.label}
                  onPress={jobCard.onPress}
                  testID={`job-card-${o.id}`}
                />
              )}
              <N1IconButton
                icon="edit"
                variant="primary"
                size="sm"
                accessibilityLabel={S.a11y.edit(o.number)}
                onPress={() => openEdit(o)}
                testID={`edit-order-${o.id}`}
              />
            </View>
          );
        },
      },
    ],
    [styles, jobCardAction, openEdit],
  );

  // Clicking a card opens the order; the clipboard and pencil open the job
  // card and Edit order.
  const renderCompactItem = useCallback(
    (o: WorkOrder) => (
      <OrderCard order={o} onEdit={openEdit} jobCard={jobCardAction(o)} />
    ),
    [openEdit, jobCardAction],
  );

  const createButton = (
    <N1Button
      title={S.create}
      leftIcon="plus"
      onPress={openCreate}
      size="sm"
      testID="create-order"
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
            label: S.createA11y,
            onPress: openCreate,
            testID: 'create-order',
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
        testID="orders-filter"
      />
      {createButton}
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
                testID="orders-filter"
              />
            }
          />
        ) : undefined
      }
      testID="orders-screen"
      fixed
    >
      {/* Wide screens: the title and Create live in the table's toolbar. */}
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
          keyExtractor={o => o.id}
          onRowPress={openDetails}
          renderCompactItem={renderCompactItem}
          toolbarTitle={isCompact ? undefined : S.title}
          toolbar={isCompact ? undefined : toolbar}
          scrollable={!isCompact}
          minWidth={TABLE_MIN_WIDTH}
          emptyText={
            items.length ? COMMON_STRINGS.noResults : COMMON_STRINGS.empty
          }
          footer={
            // Every page, phones too: after the last card.
            <N1Pagination
              summary={COMMON_STRINGS.showing(
                pager.shownCount,
                pager.total,
                S.noun,
              )}
              hasPrevious={pager.hasPrevious}
              hasNext={pager.hasNext}
              onPrevious={pager.previous}
              onNext={pager.next}
              page={pager.page}
              pageCount={pager.pageCount}
              onPageChange={pager.goTo}
            />
          }
          testID="orders-table"
        />
      </AsyncContent>
      <RawMaterialDialog
        visible={Boolean(cardFor)}
        order={cardFor}
        jobCardId=""
        onClose={closeCreateCard}
        onSaved={createdCard}
      />
    </AdminScreen>
  );
}
