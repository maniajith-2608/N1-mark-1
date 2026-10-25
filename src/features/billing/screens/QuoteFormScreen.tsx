import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  N1Card,
  N1Combobox,
  N1Divider,
  N1DropDown,
  N1Text,
  N1TextInput,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
  findOptionByLabel,
  type N1DropDownOption,
} from '../../../shared/components';
import {
  AdminScreen,
  AsyncContent,
  ComingSoon,
  DetailHeader,
  FormFooter,
  FormRow,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useForm, useOnSettled } from '../../../shared/hooks';
import { toNumber } from '../../../shared/utils';
import { BillingSection } from '../components/BillingSection';
import { LineItemsEditor } from '../components/LineItemsEditor';
import { TotalsSummary } from '../components/TotalsSummary';
import { useCustomers } from '../../customers';
import { BILLING_STRINGS } from '../constants';
import { useQuote } from '../hooks/useBilling';
import { useLineItems } from '../hooks/useLineItems';
import {
  toQuoteValues,
  validateQuoteValues,
  type QuoteValues,
} from '../hooks/useQuoteForm';
import type { BillingScreenProps, LineItem } from '../types';
import { calculateTotals } from '../utils';
import { gstRateOptions, useGst } from '../hooks/useGst';

const Q = BILLING_STRINGS.quote;
const L = BILLING_STRINGS.lineItems;
const T = BILLING_STRINGS.totals;

// New quotes start with the shop's usual turning sequence, as in the design.
const STARTER_LINES: LineItem[] = [
  {
    id: 'new-1',
    operation: 'Facing',
    description: '',
    minutesPerPiece: 0,
    setupMinutes: 0,
    ratePerMinute: 0,
  },
  {
    id: 'new-2',
    operation: 'Turning',
    description: '',
    minutesPerPiece: 0,
    setupMinutes: 0,
    ratePerMinute: 0,
  },
];

const makeStyles = createN1Styles(t => ({
  body: { gap: t.spacing.lg },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: t.spacing.sm,
  },
}));

export function QuoteFormScreen({
  route,
  navigation,
}: BillingScreenProps<'QuoteForm'>) {
  const styles = useN1Styles(makeStyles);
  const { isCompact } = useN1Breakpoint();
  const quoteId = route.params?.quoteId;
  const {
    quote,
    status,
    error,
    reload,
    create,
    update,
    saving,
    saveError,
    clearErrors,
  } = useQuote(quoteId);
  const form = useForm<QuoteValues>(toQuoteValues(quote), validateQuoteValues);
  const lines = useLineItems(quote?.lineItems ?? STARTER_LINES);
  const { values, errors, bind, submit, reset } = form;
  const gst = useGst(values.customerName);
  // A new quote follows the organization's default rate until one is picked.
  const [pickedRate, setPickedRate] = useState<number | null>(
    quote?.gstRate ?? null,
  );
  const gstRate = pickedRate ?? gst.defaultRate;

  // A quote is for a saved customer (createQuote takes its id); an edited
  // quote keeps its customer.
  const { items: customers } = useCustomers();
  const customerOptions = useMemo<N1DropDownOption<string>[]>(
    () => customers.map(c => ({ value: c.id, label: c.name })),
    [customers],
  );
  const [customerError, setCustomerError] = useState<string>();
  const pickCustomer = useCallback(
    (option: N1DropDownOption<string>) => {
      setCustomerError(undefined);
      bind('customerName')(option.label);
    },
    [bind],
  );

  const { reset: resetLines } = lines;
  const loadedId = useRef<string | null>(null);
  useEffect(() => {
    if (quote && loadedId.current !== quote.id) {
      loadedId.current = quote.id;
      reset(toQuoteValues(quote));
      resetLines(quote.lineItems);
      setPickedRate(quote.gstRate);
    }
  }, [quote, reset, resetLines]);

  useEffect(() => {
    clearErrors();
  }, [clearErrors]);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);
  useOnSettled(saving, saveError, goBack);

  const quantity = toNumber(values.quantity);
  const totals = useMemo(
    () => calculateTotals(lines.items, quantity, 0, gstRate, gst.supply),
    [lines.items, quantity, gstRate, gst.supply],
  );
  const noLines = lines.items.length === 0;

  const save = useCallback(
    (v: QuoteValues) => {
      if (lines.items.length === 0) {
        return;
      }
      const input = {
        partName: v.partName.trim(),
        quantity: toNumber(v.quantity),
        material: v.material.trim(),
        lineItems: lines.items,
        gstRate,
      };
      if (quoteId) {
        update(quoteId, input);
        return;
      }
      const customer = findOptionByLabel(customerOptions, v.customerName);
      if (!customer) {
        setCustomerError(Q.customerUnknown);
        return;
      }
      create({
        ...input,
        customerId: customer.value,
        customerName: customer.label,
        status: 'draft',
        orderId: null,
      });
    },
    [lines.items, quoteId, gstRate, create, update, customerOptions],
  );

  const header = (
    <DetailHeader
      title={Q.addTitle}
      subtitle={quote?.number ?? Q.newSubtitle}
      onBack={goBack}
    />
  );

  if (quoteId && !quote) {
    return (
      <AdminScreen header={header}>
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="receipt" title={Q.addTitle} message={Q.notFound} />
        </AsyncContent>
      </AdminScreen>
    );
  }

  const footer = (
    <FormFooter
      onCancel={goBack}
      submitLabel={COMMON_STRINGS.save}
      onSubmit={submit(save)}
      loading={saving}
      compact={!isCompact}
      submitTestID="save-quote"
    />
  );

  const body = (
    <View style={styles.body}>
      {isCompact && (
        <N1Text variant="small" color="secondary">
          {quote?.number ?? Q.newSubtitle}
        </N1Text>
      )}
      <FormRow>
        <N1Combobox
          label={Q.customer}
          required
          placeholder={Q.customerPlaceholder}
          leftIcon="search"
          options={customerOptions}
          value={values.customerName}
          onChangeText={text => {
            setCustomerError(undefined);
            bind('customerName')(text);
          }}
          onSelect={pickCustomer}
          errorText={errors.customerName ?? customerError}
          disabled={Boolean(quoteId)}
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
      </FormRow>
      {gst.registered && (
        <FormRow>
          <N1DropDown
            label={T.gstRate}
            options={gstRateOptions(gst.rates, gstRate)}
            value={gstRate}
            onChange={setPickedRate}
            placeholder={T.gstRatePlaceholder}
            testID="quote-gst-rate"
          />
          <View />
        </FormRow>
      )}
      <N1Divider />
      <BillingSection
        title={L.title}
        caption={isCompact ? L.customizableShort : L.customizableQuote}
      >
        <LineItemsEditor controller={lines} quantity={quantity} />
        {noLines && (
          <N1Text variant="small" color="danger">
            {L.needsOne}
          </N1Text>
        )}
      </BillingSection>
      <TotalsSummary totals={totals} />
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </View>
  );

  return (
    <AdminScreen
      header={header}
      compactFooter={footer}
      testID="quote-form-screen"
    >
      {isCompact ? body : <N1Card padding="xxl">{body}</N1Card>}
      {!isCompact && <View style={styles.footer}>{footer}</View>}
    </AdminScreen>
  );
}
