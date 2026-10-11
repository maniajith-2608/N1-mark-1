import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View } from 'react-native';
import {
  N1Table,
  N1Text,
  createN1Styles,
  useN1Styles,
  type N1TableColumn,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import {
  formatCurrency,
  formatDate,
  formatLongDate,
} from '../../../shared/utils';
import {
  QuoteStatusBadge,
  calculateTotals,
  useQuotes,
  type Quote,
} from '../../billing';
import {
  OrderStatusBadge,
  orderTitle,
  useOrders,
  type WorkOrder,
} from '../../orders';
import { CUSTOMER_STRINGS } from '../constants';
import type { Customer, CustomersStackParamList } from '../types';

const D = CUSTOMER_STRINGS.details;
const C = D.columns;

const newestFirst = (a: string, b: string) => b.localeCompare(a);
/** Empty-table text: say so while the list is still loading. */
const emptyText = (status: string, empty: string) =>
  status === 'succeeded' ? empty : COMMON_STRINGS.loading;
const quoteTotal = (q: Quote) =>
  calculateTotals(q.lineItems, q.quantity, 0, q.gstRate).total;

const ORDER_COLUMNS: N1TableColumn<WorkOrder>[] = [
  {
    key: 'id',
    title: C.order,
    render: o => <N1Text weight="bold">{`WO #${o.id}`}</N1Text>,
  },
  {
    key: 'part',
    title: C.part,
    flex: 2,
    render: o => <N1Text numberOfLines={1}>{orderTitle(o)}</N1Text>,
  },
  {
    key: 'quantity',
    title: C.qty,
    hideOnCompact: true,
    render: o => <N1Text>{o.quantity}</N1Text>,
  },
  {
    key: 'due',
    title: C.due,
    render: o => <N1Text>{formatLongDate(o.dueDate)}</N1Text>,
  },
  {
    key: 'status',
    title: C.status,
    render: o => <OrderStatusBadge status={o.status} />,
  },
];

const QUOTE_COLUMNS: N1TableColumn<Quote>[] = [
  {
    key: 'id',
    title: C.quote,
    render: q => <N1Text weight="bold">{q.id}</N1Text>,
  },
  {
    key: 'part',
    title: C.part,
    flex: 2,
    render: q => <N1Text numberOfLines={1}>{q.partName}</N1Text>,
  },
  {
    key: 'amount',
    title: C.amount,
    render: q => <N1Text>{formatCurrency(quoteTotal(q))}</N1Text>,
  },
  {
    key: 'date',
    title: C.date,
    render: q => <N1Text>{formatDate(q.createdAt)}</N1Text>,
  },
  {
    key: 'status',
    title: C.status,
    render: q => <QuoteStatusBadge status={q.status} />,
  },
];

const makeCardStyles = createN1Styles(t => ({
  // Rows touch; their own lines separate them.
  list: { gap: 0 },
  // Phones: a plain row per order or quote, a line underneath.
  row: {
    gap: t.spacing.xxs,
    paddingVertical: t.spacing.md,
    borderBottomWidth: t.borderWidth.hairline,
    borderBottomColor: t.colors.border,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    marginTop: t.spacing.xs,
  },
}));

/**
 * Phones: the id, the part in grey, then the amount (or due date), the
 * status and the date, like a simple listing.
 */
function HistoryCard({
  id,
  status,
  part,
  lead,
  meta,
  testID,
}: {
  id: string;
  status: ReactNode;
  part: string;
  /** Bold at the start of the last line, e.g. the amount. */
  lead: string;
  /** Small and grey after the status, e.g. the date. */
  meta?: string;
  testID: string;
}) {
  const styles = useN1Styles(makeCardStyles);
  return (
    <View style={styles.row} testID={testID}>
      <N1Text weight="bold">{id}</N1Text>
      <N1Text variant="small" color="secondary" numberOfLines={1}>
        {part}
      </N1Text>
      <View style={styles.bottom}>
        <N1Text weight="bold">{lead}</N1Text>
        {/* The badge pins itself to the top; the wrapper centres it. */}
        <View>{status}</View>
        {meta ? (
          <N1Text variant="caption" color="tertiary">
            {meta}
          </N1Text>
        ) : null}
      </View>
    </View>
  );
}

const renderOrderCard = (o: WorkOrder) => (
  <HistoryCard
    id={`WO #${o.id}`}
    status={<OrderStatusBadge status={o.status} />}
    part={orderTitle(o)}
    lead={`${C.due} ${formatLongDate(o.dueDate)}`}
    testID={`customer-order-card-${o.id}`}
  />
);

const renderQuoteCard = (q: Quote) => (
  <HistoryCard
    id={q.id}
    status={<QuoteStatusBadge status={q.status} />}
    part={q.partName}
    lead={formatCurrency(quoteTotal(q))}
    meta={formatDate(q.createdAt)}
    testID={`customer-quote-card-${q.id}`}
  />
);

/**
 * Opens an order or quote on the stack this customer is on (Customers, or
 * Orders when opened from an order), the same screens as in Orders and
 * Billing, so Back returns to this customer. Pushed, so an order already
 * lower in the stack isn't popped back to.
 */
function useOpenInModule() {
  const navigation =
    useNavigation<NativeStackNavigationProp<CustomersStackParamList>>();
  const openOrder = useCallback(
    (o: WorkOrder) =>
      navigation.push('OrderDetails', {
        orderId: o.id,
        fromCustomerId: o.customerId,
      }),
    [navigation],
  );
  const openQuote = useCallback(
    (q: Quote, customerId: string) =>
      navigation.push('QuoteDetails', {
        quoteId: q.id,
        fromCustomerId: customerId,
      }),
    [navigation],
  );
  return { openOrder, openQuote };
}

/** The customer's work orders, newest first. A row opens it in Orders. */
export const CustomerOrdersTable = memo(function CustomerOrdersTableComponent({
  customer,
}: {
  customer: Customer;
}) {
  const listStyles = useN1Styles(makeCardStyles);
  const orders = useOrders();
  const { openOrder } = useOpenInModule();
  const customerOrders = useMemo(
    () =>
      orders.items
        .filter(o => o.customerId === customer.id)
        .sort((a, b) => newestFirst(a.createdAt, b.createdAt)),
    [orders.items, customer.id],
  );
  return (
    <N1Table
      columns={ORDER_COLUMNS}
      data={customerOrders}
      keyExtractor={o => o.id}
      onRowPress={openOrder}
      renderCompactItem={renderOrderCard}
      emptyText={emptyText(orders.status, D.noOrders)}
      style={listStyles.list}
      testID="customer-orders"
    />
  );
});

/**
 * Quotes shared with the customer (drafts are left out), newest first. A row
 * opens it in Billing.
 */
export const CustomerQuotesTable = memo(function CustomerQuotesTableComponent({
  customer,
}: {
  customer: Customer;
}) {
  const listStyles = useN1Styles(makeCardStyles);
  const quotes = useQuotes();
  const { openQuote } = useOpenInModule();
  const sharedQuotes = useMemo(() => {
    const name = customer.name.trim().toLowerCase();
    return quotes.items
      .filter(
        q =>
          q.status !== 'draft' && q.customerName.trim().toLowerCase() === name,
      )
      .sort((a, b) => newestFirst(a.createdAt, b.createdAt));
  }, [quotes.items, customer.name]);
  return (
    <N1Table
      columns={QUOTE_COLUMNS}
      data={sharedQuotes}
      keyExtractor={q => q.id}
      onRowPress={q => openQuote(q, customer.id)}
      renderCompactItem={renderQuoteCard}
      emptyText={emptyText(quotes.status, D.noQuotes)}
      style={listStyles.list}
      testID="customer-quotes"
    />
  );
});
