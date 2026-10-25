import { Pressable, View } from 'react-native';
import {
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
import type { useQuoteForm } from '../hooks/useQuoteForm';
import type { Quote, Totals } from '../types';
import { QuoteStatusBadge } from './BillingBadges';
import {
  OperationsRow,
  OverviewCard as Card,
  OverviewLine,
} from './OverviewCards';
import { TotalsSummary } from './TotalsSummary';

const Q = BILLING_STRINGS.quote;
const I = BILLING_STRINGS.invoice;
const T = BILLING_STRINGS.totals;

const makeStyles = createN1Styles(t => ({
  root: { gap: t.spacing.sm },
  // The quote number and status, then the total large.
  hero: { gap: t.spacing.sm },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  customer: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  grow: { flex: 1 },
  link: { textDecorationLine: 'underline' },
  pressed: { opacity: t.opacity.pressed },
  fields: { gap: t.spacing.md },
  fieldRow: { flexDirection: 'row', gap: t.spacing.md },
}));

type Props = {
  quote: Quote;
  totals: Totals;
  /** Set when the quote is mapped to an order: the order opens it. */
  onOpenOrder?: () => void;
  onOpenOperations: () => void;
  /** A draft: email it to the customer, which makes it Sent. */
  onSend?: () => void;
  /** Sent and not yet converted: make the work order. */
  onConvert?: () => void;
  busy?: boolean;
};

/**
 * Phones: the quote at a glance, like the invoice — its number, status and
 * total, then cards for the customer, the part, the process
 * operations (a row that opens them on their own screen) and the amounts.
 */
export function QuoteOverview({
  quote,
  totals,
  onOpenOrder,
  onOpenOperations,
  onSend,
  onConvert,
  busy,
}: Props) {
  const styles = useN1Styles(makeStyles);

  return (
    <View style={styles.root} testID="quote-overview">
      <View style={styles.hero}>
        <View style={styles.idRow}>
          <N1Icon name="receipt" size="sm" color="textSecondary" />
          <N1Text color="secondary">{quote.number}</N1Text>
          <QuoteStatusBadge status={quote.status} />
        </View>
        <N1Text variant="h2" accessibilityRole="header" testID="quote-total">
          {formatCurrency(totals.total)}
        </N1Text>
      </View>

      <Card title={Q.customer} testID="quote-customer-card">
        <View style={styles.customer}>
          <N1Avatar name={quote.customerName} size="sm" />
          <N1Text
            variant="small"
            weight="semiBold"
            style={styles.grow}
            numberOfLines={2}
          >
            {quote.customerName || COMMON_STRINGS.dash}
          </N1Text>
        </View>
        {onSend && (
          <N1Button
            title={Q.send}
            leftIcon="arrow-right"
            variant="soft"
            size="sm"
            fullWidth
            onPress={onSend}
            loading={busy}
            testID="send-quote"
          />
        )}
        {onConvert && (
          <N1Button
            title={Q.convert}
            leftIcon="package"
            variant="soft"
            size="sm"
            fullWidth
            onPress={onConvert}
            testID="convert-quote"
          />
        )}
      </Card>

      <Card title={Q.partDetails} testID="quote-part-details">
        <OverviewLine label={Q.partName} value={quote.partName} />
        <OverviewLine label={Q.quantity} value={`${quote.quantity} pcs`} />
        {quote.orderId && (
          <OverviewLine
            label={Q.order}
            value={
              onOpenOrder ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={onOpenOrder}
                  style={({ pressed }) => pressed && styles.pressed}
                  testID="quote-order"
                >
                  <N1Text variant="small" weight="semiBold" style={styles.link}>
                    {Q.orderValue}
                  </N1Text>
                </Pressable>
              ) : (
                Q.orderValue
              )
            }
          />
        )}
      </Card>

      <OperationsRow
        title={BILLING_STRINGS.lineItems.title}
        summary={I.operationsSummary(
          quote.lineItems.length,
          formatCurrency(totals.subtotal),
        )}
        label={Q.openOperations}
        onPress={onOpenOperations}
        testID="quote-open-operations"
      />

      <Card title={Q.amount}>
        <TotalsSummary totals={totals} fill />
      </Card>
    </View>
  );
}

type EditFormProps = {
  form: ReturnType<typeof useQuoteForm>;
  gst: GstContext;
  /** Follows the inputs while editing. */
  totals: Totals;
  saveError: string | null;
};

/**
 * Phones: Edit quote — the part, quantity and GST rate (the customer is
 * fixed),
 * in the same small cards, with the amounts following along. The process
 * operations are edited from their own screen (its header's Edit).
 */
export function QuoteEditForm({ form, gst, totals, saveError }: EditFormProps) {
  const styles = useN1Styles(makeStyles);
  const { values, errors, bind } = form;
  return (
    <View style={styles.root} testID="quote-edit-form">
      <Card title={Q.details}>
        <View style={styles.fields}>
          <N1TextInput
            label={Q.customer}
            required
            placeholder={Q.customerPlaceholder}
            value={values.customerName}
            onChangeText={bind('customerName')}
            errorText={errors.customerName}
            // A quote keeps its customer: a new one is a new quote.
            disabled
            testID="quote-customer"
          />
          <N1TextInput
            label={Q.partName}
            required
            placeholder={Q.partNamePlaceholder}
            value={values.partName}
            onChangeText={bind('partName')}
            errorText={errors.partName}
            testID="quote-part"
          />
          <N1TextInput
            label={Q.quantity}
            required
            placeholder={Q.quantityPlaceholder}
            value={values.quantity}
            onChangeText={bind('quantity')}
            errorText={errors.quantity}
            keyboardType="number-pad"
            testID="quote-quantity"
          />
        </View>
      </Card>
      <Card title={Q.amount}>
        {gst.registered && (
          <View style={styles.fieldRow}>
            <N1DropDown
              label={T.gstRate}
              options={gstRateOptions(gst.rates, form.gstRate)}
              value={form.gstRate}
              onChange={form.setGstRate}
              placeholder={T.gstRatePlaceholder}
              containerStyle={styles.grow}
              testID="quote-gst-rate"
            />
          </View>
        )}
        <TotalsSummary totals={totals} fill />
      </Card>
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </View>
  );
}
