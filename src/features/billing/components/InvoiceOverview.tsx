import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import {
  LabeledValue,
  N1Avatar,
  N1Button,
  N1DropDown,
  N1Icon,
  N1Text,
  N1TextInput,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { formatCurrency } from '../../../shared/utils';
import { BILLING_STRINGS } from '../constants';
import { gstRateOptions, type GstContext } from '../hooks/useGst';
import type { useInvoiceForm } from '../hooks/useInvoiceForm';
import type { Invoice, Totals } from '../types';
import { InvoiceStatusBadge } from './BillingBadges';
import {
  OverviewCard as Card,
  OperationsRow,
  OverviewLine,
} from './OverviewCards';
import { TotalsSummary } from './TotalsSummary';

const I = BILLING_STRINGS.invoice;
const T = BILLING_STRINGS.totals;

const makeStyles = createN1Styles(t => ({
  root: { gap: t.spacing.sm },
  // The invoice number and status, then the total large with the PO amount.
  hero: { gap: t.spacing.sm },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: t.spacing.lg,
  },
  customer: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  grow: { flex: 1 },
  link: { textDecorationLine: 'underline' },
  pressed: { opacity: t.opacity.pressed },
  fieldRow: { flexDirection: 'row', gap: t.spacing.md },
}));

type Props = {
  invoice: Invoice;
  totals: Totals;
  /** Set when the job has an order: the Job ID opens it. */
  onOpenOrder?: () => void;
  onOpenOperations: () => void;
  onSend: () => void;
  sendDisabled: boolean;
};

/**
 * Phones: the invoice at a glance, like a receipt — its number, status and
 * total with the PO amount, then cards for who it's billed to, the job, the
 * process operations (a row that opens them on their own screen), the
 * amounts and notes.
 */
export function InvoiceOverview({
  invoice,
  totals,
  onOpenOrder,
  onOpenOperations,
  onSend,
  sendDisabled,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const line = (label: string, value: ReactNode) => (
    <OverviewLine key={label} label={label} value={value} />
  );

  return (
    <View style={styles.root} testID="invoice-overview">
      <View style={styles.hero}>
        <View style={styles.idRow}>
          <N1Icon name="receipt" size="sm" color="textSecondary" />
          <N1Text color="secondary">{invoice.number}</N1Text>
          <InvoiceStatusBadge status={invoice.status} />
        </View>
        {/* The total, with the PO amount beside it. */}
        <View style={styles.amountRow}>
          <N1Text
            variant="h2"
            accessibilityRole="header"
            numberOfLines={1}
            style={styles.grow}
            testID="invoice-total"
          >
            {formatCurrency(totals.total)}
          </N1Text>
          <LabeledValue
            title={I.poAmount}
            value={
              invoice.poAmount == null
                ? COMMON_STRINGS.dash
                : formatCurrency(invoice.poAmount)
            }
            end
            strong
            testID="invoice-po-amount"
          />
        </View>
      </View>

      <Card title={I.billedTo} testID="invoice-billed-to">
        <View style={styles.customer}>
          <N1Avatar name={invoice.customerName} size="sm" />
          <N1Text
            variant="small"
            weight="semiBold"
            style={styles.grow}
            numberOfLines={2}
          >
            {invoice.customerName || COMMON_STRINGS.dash}
          </N1Text>
        </View>
        <N1Button
          title={I.send}
          leftIcon="arrow-right"
          variant="soft"
          size="sm"
          fullWidth
          onPress={onSend}
          disabled={sendDisabled}
          testID="send-invoice"
        />
      </Card>

      <Card title={I.jobDetails} testID="invoice-job-details">
        {line(
          I.jobId,
          onOpenOrder ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={I.openOrder(invoice.jobId)}
              onPress={onOpenOrder}
              style={({ pressed }) => pressed && styles.pressed}
              testID="invoice-order-link"
            >
              <N1Text variant="small" weight="semiBold" style={styles.link}>
                {invoice.jobId}
              </N1Text>
            </Pressable>
          ) : (
            invoice.jobId
          ),
        )}
        {line(I.routeCard, invoice.routeCard)}
        {line(I.partName, invoice.partName)}
        {line(I.quantity, `${invoice.quantity} pcs`)}
      </Card>

      <OperationsRow
        title={BILLING_STRINGS.lineItems.title}
        summary={I.operationsSummary(
          invoice.lineItems.length,
          formatCurrency(totals.subtotal),
        )}
        label={I.openOperations}
        onPress={onOpenOperations}
        testID="invoice-open-operations"
      />

      <Card title={I.amount}>
        <TotalsSummary totals={totals} fill />
      </Card>

      <Card title={I.notes}>
        <N1Text variant="small" color={invoice.notes ? 'primary' : 'tertiary'}>
          {invoice.notes || COMMON_STRINGS.dash}
        </N1Text>
      </Card>
    </View>
  );
}

type EditFormProps = {
  form: ReturnType<typeof useInvoiceForm>;
  gst: GstContext;
  /** Follows the inputs while editing. */
  totals: Totals;
  saveError: string | null;
};

/**
 * Phones: Edit invoice — only the discount, GST rate and notes (the status
 * is the server's),
 * in the same small cards, with the amounts following along. The process
 * operations are edited from their own screen (its header's Edit).
 */
export function InvoiceEditForm({
  form,
  gst,
  totals,
  saveError,
}: EditFormProps) {
  const styles = useN1Styles(makeStyles);
  return (
    <View style={styles.root} testID="invoice-edit-form">
      <Card title={I.amount}>
        <View style={styles.fieldRow}>
          <N1TextInput
            label={I.discount}
            value={form.discount}
            onChangeText={form.setDiscount}
            keyboardType="decimal-pad"
            errorText={form.discountError}
            containerStyle={styles.grow}
            testID="invoice-discount"
          />
          {gst.registered && (
            <N1DropDown
              label={T.gstRate}
              options={gstRateOptions(gst.rates, form.gstRate)}
              value={form.gstRate}
              onChange={form.setGstRate}
              placeholder={T.gstRatePlaceholder}
              containerStyle={styles.grow}
              testID="invoice-gst-rate"
            />
          )}
        </View>
        <TotalsSummary totals={totals} fill />
      </Card>
      <Card title={I.notes}>
        <N1TextInput
          value={form.notes}
          onChangeText={form.setNotes}
          placeholder={COMMON_STRINGS.dash}
          accessibilityLabel={I.notes}
          multiline
          testID="invoice-notes"
        />
      </Card>
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </View>
  );
}
