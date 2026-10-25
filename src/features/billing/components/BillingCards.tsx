import { memo, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  LabeledValue,
  N1Button,
  N1Icon,
  N1IconButton,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { formatCurrency } from '../../../shared/utils';
import { BILLING_STRINGS } from '../constants';
import type { Invoice, Quote } from '../types';
import { invoiceTotal, quoteTotal } from '../utils';
import { InvoiceStatusBadge, QuoteStatusBadge } from './BillingBadges';

const I = BILLING_STRINGS.invoices;
const QS = BILLING_STRINGS.quotes;
const A = BILLING_STRINGS.a11y;
const Q = BILLING_STRINGS.quote;

const makeStyles = createN1Styles(t => ({
  card: {
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surface,
  },
  // A receipt tile, the ID over the customer, and the status on the right.
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.md,
  },
  iconTile: {
    width: t.controlHeight.md,
    height: t.controlHeight.md,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceMuted,
  },
  titles: { flex: 1, gap: t.spacing.xxs },
  details: { gap: t.spacing.md },
  // Each value with its title above it; the right column lines up right.
  pair: { flexDirection: 'row', gap: t.spacing.md },
  divider: {
    height: t.borderWidth.hairline,
    backgroundColor: t.colors.border,
  },
  // A wide grey View button, then square icon buttons.
  footer: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  view: { flex: 1 },
}));

/** The shared shape of an invoice or quote card. */
function BillingCard({
  id,
  customer,
  status,
  amount,
  children,
  viewLabel,
  viewA11y,
  onView,
  actions,
  testID,
}: {
  id: string;
  customer: string;
  status: ReactNode;
  amount: number;
  /** More label / value pairs under the amount. */
  children?: ReactNode;
  viewLabel: string;
  viewA11y: string;
  onView: () => void;
  /** Square icon buttons after View. */
  actions: ReactNode;
  testID: string;
}) {
  const styles = useN1Styles(makeStyles);
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.heading}>
        <View style={styles.iconTile}>
          <N1Icon name="receipt" size="sm" color="textSecondary" />
        </View>
        <View style={styles.titles}>
          <N1Text weight="bold" numberOfLines={1}>
            {id}
          </N1Text>
          <N1Text variant="small" color="secondary" numberOfLines={1}>
            {customer || COMMON_STRINGS.dash}
          </N1Text>
        </View>
        {status}
      </View>
      <View style={styles.details}>
        <LabeledValue
          title={I.columns.amount}
          value={formatCurrency(amount)}
          strong
        />
        {children}
      </View>
      <View style={styles.divider} />
      <View style={styles.footer}>
        <View style={styles.view}>
          <N1Button
            title={viewLabel}
            variant="soft"
            fullWidth
            onPress={onView}
            accessibilityLabel={viewA11y}
          />
        </View>
        {actions}
      </View>
    </View>
  );
}

type InvoiceCardProps = {
  invoice: Invoice;
  onView: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
};

/**
 * One invoice on the phone list: the invoice and customer with its status,
 * the amount, the job and route card, then a line, then View
 * invoice, Download and Edit.
 */
export const InvoiceCard = memo(function InvoiceCardComponent({
  invoice: i,
  onView,
  onDownload,
  onEdit,
}: InvoiceCardProps) {
  const styles = useN1Styles(makeStyles);
  return (
    <BillingCard
      id={i.number}
      customer={i.customerName}
      status={<InvoiceStatusBadge status={i.status} />}
      amount={invoiceTotal(i)}
      viewLabel={I.viewCard}
      viewA11y={A.view(i.number)}
      onView={() => onView(i)}
      actions={
        <>
          <N1IconButton
            icon="download"
            variant="card"
            accessibilityLabel={A.download(i.number)}
            onPress={() => onDownload(i)}
          />
          {/* A paid invoice is final: no Edit. */}
          {i.status !== 'paid' && (
            <N1IconButton
              icon="edit"
              variant="card"
              accessibilityLabel={A.edit(i.number)}
              onPress={() => onEdit(i)}
            />
          )}
        </>
      }
      testID={`invoice-card-${i.id}`}
    >
      <View style={styles.pair}>
        <LabeledValue
          title={I.columns.job}
          value={i.jobId || COMMON_STRINGS.dash}
        />
        <LabeledValue
          title={I.columns.routeCard}
          value={i.routeCard || COMMON_STRINGS.dash}
          end
        />
      </View>
    </BillingCard>
  );
});

type QuoteCardProps = {
  quote: Quote;
  onView: (quote: Quote) => void;
  onEdit: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
};

/**
 * One quote on the phone list: the quote and customer with its status, the
 * amount, the part name and quantity, then a line, then View
 * quote, Edit and Delete.
 */
export const QuoteCard = memo(function QuoteCardComponent({
  quote: q,
  onView,
  onEdit,
  onDelete,
}: QuoteCardProps) {
  const styles = useN1Styles(makeStyles);
  // Only a draft is edited or deleted; a sent quote is the customer's copy.
  const isDraft = q.status === 'draft';
  return (
    <BillingCard
      id={q.number}
      customer={q.customerName}
      status={<QuoteStatusBadge status={q.status} />}
      amount={quoteTotal(q)}
      viewLabel={QS.viewCard}
      viewA11y={A.view(q.number)}
      onView={() => onView(q)}
      actions={
        isDraft && (
          <>
            <N1IconButton
              icon="edit"
              variant="card"
              accessibilityLabel={A.edit(q.number)}
              onPress={() => onEdit(q)}
              testID={`edit-${q.id}`}
            />
            <N1IconButton
              icon="trash"
              variant="cardDanger"
              accessibilityLabel={A.delete(q.number)}
              onPress={() => onDelete(q)}
              testID={`delete-${q.id}`}
            />
          </>
        )
      }
      testID={`quote-card-${q.id}`}
    >
      <View style={styles.pair}>
        <LabeledValue
          title={Q.partName}
          value={q.partName || COMMON_STRINGS.dash}
        />
        <LabeledValue
          title={Q.quantity}
          value={q.quantity ? `${q.quantity} pcs` : COMMON_STRINGS.dash}
          end
        />
      </View>
    </BillingCard>
  );
});
