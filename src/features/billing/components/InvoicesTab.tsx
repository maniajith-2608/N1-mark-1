import { useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  HeaderSearchBar,
  FilterMenu,
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
import { useListFilter, usePagination } from '../../../shared/hooks';
import { formatCompactCurrency, formatCurrency } from '../../../shared/utils';
import { BILLING_STRINGS, INVOICE_STATUS_OPTIONS } from '../constants';
import { useInvoiceStats, useInvoices } from '../hooks/useBilling';
import { openPdf } from '../hooks/useBillingActions';
import type { Invoice, InvoiceFilters } from '../types';
import {
  INITIAL_INVOICE_FILTERS,
  invoiceSearchText,
  invoiceTotal,
  matchesInvoiceFilters,
} from '../utils';
import { InvoiceStatusBadge } from './BillingBadges';
import { InvoiceCard } from './BillingCards';
import { useBillingHeader } from './BillingHeaderSlot';

const S = BILLING_STRINGS.invoices;
/** The server's PDF of the invoice. */
const downloadPdf = (i: Invoice) => openPdf({ kind: 'invoice', id: i.id });

const makeStyles = createN1Styles(t => ({
  actions: { flexDirection: 'row', gap: t.spacing.sm },
}));

type Props = {
  /** Wide screens: shown at the left of the table toolbar (the tab switcher). */
  toolbarStart?: ReactNode;
};

export function InvoicesTab({ toolbarStart }: Props) {
  const styles = useN1Styles(makeStyles);
  const navigation = useNavigation<BillingNavigation>();
  const { isCompact } = useN1Breakpoint();
  const { items, status, error, reload } = useInvoices();
  const stats = useInvoiceStats();
  const { query, setQuery, filters, setFilter, filtered } = useListFilter(
    items,
    {
      getSearchText: invoiceSearchText,
      initialFilters: INITIAL_INVOICE_FILTERS,
      matchesFilters: matchesInvoiceFilters,
    },
  );
  const pager = usePagination(filtered);

  const filterGroups = useMemo(
    () => [
      {
        key: 'status',
        label: BILLING_STRINGS.statusFilter,
        options: INVOICE_STATUS_OPTIONS,
      },
    ],
    [],
  );
  const applyFilters = useCallback(
    (next: FilterValues) =>
      setFilter('status', [...(next.status ?? [])] as InvoiceFilters['status']),
    [setFilter],
  );

  const view = useCallback(
    (i: Invoice) => navigation.navigate('InvoiceDetails', { invoiceId: i.id }),
    [navigation],
  );
  // Edit opens the invoice with its fields already editable.
  const edit = useCallback(
    (i: Invoice) =>
      navigation.navigate('InvoiceDetails', { invoiceId: i.id, edit: true }),
    [navigation],
  );

  const columns = useMemo<N1TableColumn<Invoice>[]>(
    () => [
      {
        key: 'id',
        title: S.columns.invoice,
        flex: 1.3,
        render: i => <N1Text weight="bold">{i.number}</N1Text>,
      },
      { key: 'customerName', title: S.columns.customer, flex: 1.5 },
      { key: 'jobId', title: S.columns.job },
      { key: 'routeCard', title: S.columns.routeCard },
      {
        key: 'amount',
        title: S.columns.amount,
        render: i => (
          <N1Text weight="bold">{formatCurrency(invoiceTotal(i))}</N1Text>
        ),
      },
      {
        key: 'status',
        title: S.columns.status,
        flex: 0.9,
        render: i => <InvoiceStatusBadge status={i.status} />,
      },
      {
        key: 'actions',
        interactive: true,
        title: S.columns.actions,
        flex: 1.2,
        render: i => (
          <View style={styles.actions}>
            <N1IconButton
              icon="eye"
              size="sm"
              accessibilityLabel={BILLING_STRINGS.a11y.view(i.number)}
              onPress={() => view(i)}
            />
            {/* A paid invoice is final: no Edit. */}
            {i.status !== 'paid' && (
              <N1IconButton
                icon="edit"
                variant="primary"
                size="sm"
                accessibilityLabel={BILLING_STRINGS.a11y.edit(i.number)}
                onPress={() => edit(i)}
              />
            )}
          </View>
        ),
      },
    ],
    [styles, view, edit],
  );

  const renderCompactItem = useCallback(
    (i: Invoice) => (
      <InvoiceCard
        invoice={i}
        onView={view}
        onDownload={downloadPdf}
        onEdit={edit}
      />
    ),
    [view, edit],
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
            testID="invoices-filter"
          />
        }
      />
    ),
    [query, setQuery, filterGroups, filters, applyFilters],
  );
  useBillingHeader('invoices', headerBar, isCompact);

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
        testID="invoices-filter"
      />
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
        keyExtractor={i => i.id}
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
            summary={
              isCompact
                ? showing
                : S.summary(
                    showing,
                    stats,
                    formatCompactCurrency(stats.thisMonth),
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
        testID="invoices-table"
      />
    </AsyncContent>
  );
}
