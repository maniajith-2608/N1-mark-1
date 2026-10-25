import { useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  HeaderSearchBar,
  FilterMenu,
  N1Button,
  N1ConfirmDialog,
  N1IconButton,
  N1Pagination,
  N1Table,
  N1Text,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
  type FilterValues,
  type N1TableColumn,
} from '../../../shared/components';
import type { BillingNavigation } from '../types';
import { AsyncContent, ListToolbar } from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import {
  useConfirmDelete,
  useListFilter,
  usePagination,
} from '../../../shared/hooks';
import { formatCurrency } from '../../../shared/utils';
import { BILLING_STRINGS, QUOTE_STATUS_OPTIONS } from '../constants';
import { useQuoteStats, useQuotes } from '../hooks/useBilling';
import type { Quote, QuoteFilters } from '../types';
import {
  INITIAL_QUOTE_FILTERS,
  matchesQuoteFilters,
  quoteSearchText,
  quoteTotal,
} from '../utils';
import { QuoteStatusBadge } from './BillingBadges';
import { QuoteCard } from './BillingCards';
import { useBillingHeader } from './BillingHeaderSlot';

const S = BILLING_STRINGS.quotes;

const makeStyles = createN1Styles(t => ({
  actions: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
}));

type Props = {
  /** Wide screens: shown at the left of the table toolbar (the tab switcher). */
  toolbarStart?: ReactNode;
};

export function QuotesTab({ toolbarStart }: Props) {
  const styles = useN1Styles(makeStyles);
  const navigation = useNavigation<BillingNavigation>();
  const { isCompact } = useN1Breakpoint();
  const { items, status, error, reload, remove, deletingId, deleteError } =
    useQuotes();
  const deletion = useConfirmDelete<Quote>(remove, deletingId, deleteError);
  const requestDelete = deletion.request;
  const stats = useQuoteStats();
  const { query, setQuery, filters, setFilter, filtered } = useListFilter(
    items,
    {
      getSearchText: quoteSearchText,
      initialFilters: INITIAL_QUOTE_FILTERS,
      matchesFilters: matchesQuoteFilters,
    },
  );
  const pager = usePagination(filtered);

  const filterGroups = useMemo(
    () => [
      {
        key: 'status',
        label: BILLING_STRINGS.statusFilter,
        options: QUOTE_STATUS_OPTIONS,
      },
    ],
    [],
  );
  const applyFilters = useCallback(
    (next: FilterValues) =>
      setFilter('status', [...(next.status ?? [])] as QuoteFilters['status']),
    [setFilter],
  );
  const createQuote = useCallback(
    () => navigation.navigate('QuoteForm'),
    [navigation],
  );

  const view = useCallback(
    (q: Quote) => navigation.navigate('QuoteDetails', { quoteId: q.id }),
    [navigation],
  );
  // Edit opens the quote with its fields already editable.
  const edit = useCallback(
    (q: Quote) =>
      navigation.navigate('QuoteDetails', { quoteId: q.id, edit: true }),
    [navigation],
  );

  const columns = useMemo<N1TableColumn<Quote>[]>(
    () => [
      {
        key: 'id',
        title: S.columns.id,
        render: q => <N1Text weight="bold">{q.number}</N1Text>,
      },
      { key: 'customerName', title: S.columns.customer, flex: 2 },
      {
        key: 'amount',
        title: S.columns.amount,
        render: q => (
          <N1Text weight="bold" testID={`quote-amount-${q.id}`}>
            {formatCurrency(quoteTotal(q))}
          </N1Text>
        ),
      },
      {
        key: 'status',
        title: S.columns.status,
        render: q => <QuoteStatusBadge status={q.status} />,
      },
      {
        key: 'actions',
        interactive: true,
        title: S.columns.actions,
        // Only a draft is edited or deleted; a sent quote is the
        // customer's copy (a change is a new quote).
        render: q =>
          q.status === 'draft' ? (
            <View style={styles.actions}>
              <N1IconButton
                icon="edit"
                variant="primary"
                size="sm"
                accessibilityLabel={BILLING_STRINGS.a11y.edit(q.number)}
                onPress={() => edit(q)}
                testID={`edit-${q.id}`}
              />
              <N1IconButton
                icon="trash"
                variant="danger"
                size="sm"
                accessibilityLabel={BILLING_STRINGS.a11y.delete(q.number)}
                onPress={() => requestDelete(q)}
                testID={`delete-${q.id}`}
              />
            </View>
          ) : null,
      },
    ],
    [edit, styles, requestDelete],
  );

  const renderCompactItem = useCallback(
    (q: Quote) => (
      <QuoteCard
        quote={q}
        onView={view}
        onEdit={edit}
        onDelete={requestDelete}
      />
    ),
    [view, edit, requestDelete],
  );

  const firstLoad =
    (status === 'idle' || status === 'loading') && items.length === 0;

  // Phones: search and filter on the black header (see BillingScreen).
  const headerBar = useMemo(
    () => (
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
            testID="quotes-filter"
          />
        }
      />
    ),
    [query, setQuery, filterGroups, filters, applyFilters],
  );
  useBillingHeader('quotes', headerBar, isCompact);

  // Phones: Create quote is the top bar's + (set by BillingScreen, which
  // the top bar belongs to, while Quotes is open).

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
        testID="quotes-filter"
      />
      {/* Phones keep Create in the page header. */}
      {!isCompact && (
        <N1Button
          title={S.create}
          leftIcon="plus"
          size="sm"
          onPress={createQuote}
          testID="create-quote"
        />
      )}
    </ListToolbar>
  );

  const showing = COMMON_STRINGS.showing(pager.shownCount, pager.total, S.noun);

  return (
    // The table shows its own loading state; AsyncContent only takes over
    // when the first load fails.
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
        keyExtractor={q => q.id}
        onRowPress={view}
        renderCompactItem={renderCompactItem}
        toolbarStart={isCompact ? undefined : toolbarStart}
        toolbar={isCompact ? undefined : toolbar}
        scrollable={!isCompact}
        emptyText={
          items.length ? COMMON_STRINGS.noResults : COMMON_STRINGS.empty
        }
        footer={
          // Every page, phones too: after the last card.
          <N1Pagination
            summary={isCompact ? showing : S.summary(showing, stats)}
            hasPrevious={pager.hasPrevious}
            hasNext={pager.hasNext}
            onPrevious={pager.previous}
            onNext={pager.next}
            page={pager.page}
            pageCount={pager.pageCount}
            onPageChange={pager.goTo}
          />
        }
        testID="quotes-table"
      />
      <N1ConfirmDialog
        visible={deletion.target !== null}
        title={S.delete.title}
        message={
          deletion.target ? S.delete.message(deletion.target.number) : ''
        }
        confirmLabel={S.delete.confirm}
        tone="danger"
        icon="trash"
        loading={deletion.loading}
        onConfirm={deletion.confirm}
        onCancel={deletion.cancel}
        testID="delete-quote-dialog"
      />
    </AsyncContent>
  );
}
