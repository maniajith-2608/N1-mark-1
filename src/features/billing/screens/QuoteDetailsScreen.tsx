import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  AdminScreen,
  AsyncContent,
  DetailHeader,
  ComingSoon,
  FormFooter,
  FormRow,
  N1Button,
  N1DetailGrid,
  N1DropDown,
  N1IconButton,
  N1Text,
  N1TextInput,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useOnSettled } from '../../../shared/hooks';
import { printOrNotify } from '../../../services/print';
import { toNumber } from '../../../shared/utils';
import { useSession } from '../../profile';
import { QuoteStatusBadge } from '../components/BillingBadges';
import {
  ConvertQuoteDialog,
  SendEmailDialog,
} from '../components/BillingDialogs';
import { InvoicePreviewModal } from '../components/InvoicePreviewModal';
import {
  BillingBackLink,
  BillingDetailLayout,
} from '../components/BillingDetailLayout';
import { BillingSection } from '../components/BillingSection';
import { LineItemsEditor } from '../components/LineItemsEditor';
import { LineItemsTable } from '../components/LineItemsTable';
import { QuoteOverview } from '../components/QuoteOverview';
import { TotalsSummary } from '../components/TotalsSummary';
import { BILLING_STRINGS } from '../constants';
import { useQuote } from '../hooks/useBilling';
import {
  useConvertDialog,
  useDownloadPdf,
  useSendByEmail,
} from '../hooks/useBillingActions';
import { useConvertToOrder } from '../hooks/useBillingWorkflow';
import { gstRateOptions, useGst } from '../hooks/useGst';
import { useQuoteForm } from '../hooks/useQuoteForm';
import {
  invoiceHtml,
  quoteDocument,
  type InvoiceDocument,
} from '../invoiceDocument';
import { calculateTotals } from '../utils';
import type { BillingScreenProps } from '../types';

const Q = BILLING_STRINGS.quote;
const T = BILLING_STRINGS.totals;

const makeStyles = createN1Styles(t => ({
  pressed: { opacity: t.opacity.pressed },
  orderLink: { alignSelf: 'flex-start' },
  underline: { textDecorationLine: 'underline' },
  asideActions: { gap: t.spacing.sm },
  fields: { gap: t.spacing.md },
  fieldRow: { flexDirection: 'row', gap: t.spacing.md },
  // Phones: Preview and PDF side by side.
  compactActions: { flexDirection: 'row', gap: t.spacing.sm },
  grow: { flex: 1 },
}));

/**
 * One quote, laid out like the invoice: details under the title, the
 * operations on the left and the amounts on the right. Edit makes the
 * fields and operations editable right here.
 */
export function QuoteDetailsScreen({
  route,
  navigation,
}: BillingScreenProps<'QuoteDetails'>) {
  const styles = useN1Styles(makeStyles);
  const { isCompact } = useN1Breakpoint();
  const { quoteId, fromCustomerId, edit: editRequested } = route.params;
  const {
    quote,
    status,
    error,
    reload,
    update,
    saving,
    saveError,
    clearErrors,
  } = useQuote(quoteId);

  const form = useQuoteForm(quote);
  const [editing, setEditing] = useState(false);
  const { reset: resetForm } = form;
  const startEdit = useCallback(() => {
    clearErrors();
    resetForm();
    setEditing(true);
  }, [clearErrors, resetForm]);
  const cancelEdit = useCallback(() => {
    resetForm();
    setEditing(false);
  }, [resetForm]);
  const save = useCallback(() => {
    const changes = form.validate();
    if (changes) {
      update(quoteId, changes);
    }
  }, [form, update, quoteId]);
  useOnSettled(saving, saveError, () => setEditing(false));
  // Phones: Edit quote slides up as its own screen, and the operations
  // open on theirs.
  const openEdit = useCallback(
    () => navigation.navigate('QuoteEdit', { quoteId }),
    [navigation, quoteId],
  );
  const openOperations = useCallback(
    () => navigation.navigate('QuoteOperations', { quoteId }),
    [navigation, quoteId],
  );
  // Opened with edit (the Quotes list's Edit): phones slide up Edit quote
  // over it.
  useEffect(() => {
    if (editRequested && quote) {
      navigation.setParams({ edit: undefined });
      if (isCompact) {
        openEdit();
      } else {
        startEdit();
      }
    }
  }, [editRequested, quote, startEdit, openEdit, isCompact, navigation]);

  // Back to the customer the quote was opened from, else the Quotes list.
  const goBack = useCallback(() => {
    // Pushed on another stack (a customer): back to it.
    const state = navigation.getState();
    const below = state.routes[state.index - 1];
    if (below && below.name !== 'BillingHome') {
      navigation.goBack();
      return;
    }
    if (fromCustomerId) {
      navigation.navigate('Customers', {
        screen: 'CustomerDetails',
        params: { customerId: fromCustomerId },
        merge: true,
      });
    } else {
      navigation.popTo('BillingHome', { tab: 'quotes' });
    }
  }, [navigation, fromCustomerId]);
  const backLabel = fromCustomerId ? Q.backToCustomer : Q.back;

  // Opens the order a converted quote is linked to, or converts a sent one.
  const toOrder = useConvertToOrder();
  const { convert } = toOrder;
  const converting = useConvertDialog(
    useCallback(
      input => {
        if (quote) {
          convert(quote, input);
        }
      },
      [quote, convert],
    ),
  );
  // Send: Draft → Sent, emailing the PDF. There's no way back to Draft.
  const emailed = useMemo(
    () =>
      quote && { kind: 'quote' as const, id: quote.id, number: quote.number },
    [quote],
  );
  const sending = useSendByEmail(emailed || undefined);
  // Preview Quote: the quote as it prints, from what's saved.
  const { organization } = useSession();
  const [preview, setPreview] = useState<InvoiceDocument | null>(null);
  const closePreview = useCallback(() => setPreview(null), []);
  const print = useCallback(
    (doc: InvoiceDocument) =>
      printOrNotify(invoiceHtml(doc), doc.title, doc.printAction),
    [],
  );
  const { download: downloadPdf } = useDownloadPdf(emailed || undefined);

  // While editing, the amounts follow the inputs.
  const gst = useGst(
    editing ? form.values.customerName : quote?.customerName ?? '',
  );
  const quantity = editing
    ? toNumber(form.values.quantity)
    : quote?.quantity ?? 0;
  // The server's totals; the preview only while editing.
  const totals = useMemo(() => {
    if (!quote) {
      return null;
    }
    return editing
      ? calculateTotals(form.lines.items, quantity, 0, form.gstRate, gst.supply)
      : quote.totals;
  }, [quote, editing, form.lines.items, quantity, form.gstRate, gst.supply]);

  const backLink = (
    <BillingBackLink label={backLabel} onPress={goBack} testID="quote-back" />
  );

  // Phones: a header with back and the screen's name, in place of the link.
  const header = <DetailHeader title={Q.title} onBack={goBack} />;

  if (!quote || !totals) {
    return (
      <AdminScreen header={header} testID="quote-details-screen">
        {!isCompact && backLink}
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="receipt" title={Q.title} message={Q.notFound} />
        </AsyncContent>
      </AdminScreen>
    );
  }

  // Only a draft is edited, sent or deleted; a sent one is converted.
  const isDraft = quote.status === 'draft';
  const canConvert = quote.status === 'sent' && !quote.orderId;
  const previewModal = (
    <>
      <InvoicePreviewModal
        doc={preview}
        onClose={closePreview}
        onPrint={print}
        onDownload={downloadPdf}
      />
      <SendEmailDialog {...sending.dialog} />
      <ConvertQuoteDialog quote={quote} {...converting.dialog} />
    </>
  );

  // Phones: the quote at a glance in small cards, like the invoice. The
  // header's Edit slides up Edit quote; Preview and Download PDF are pinned
  // to the bottom.
  if (isCompact) {
    return (
      <>
        <AdminScreen
          header={
            <DetailHeader
              title={Q.title}
              onBack={goBack}
              compactRight={
                isDraft && (
                  <N1IconButton
                    icon="edit"
                    variant="tile"
                    accessibilityLabel={COMMON_STRINGS.edit}
                    onPress={openEdit}
                    testID="edit-quote"
                  />
                )
              }
            />
          }
          compactFooter={
            <View style={styles.compactActions}>
              <View style={styles.grow}>
                <N1Button
                  title={Q.preview}
                  leftIcon="eye"
                  variant="soft"
                  fullWidth
                  onPress={() =>
                    setPreview(quoteDocument(quote, totals, organization))
                  }
                  testID="preview-quote"
                />
              </View>
              <View style={styles.grow}>
                <N1Button
                  title={Q.downloadPdf}
                  leftIcon="download"
                  variant="soft"
                  fullWidth
                  onPress={downloadPdf}
                />
              </View>
            </View>
          }
          testID="quote-details-screen"
        >
          <QuoteOverview
            quote={quote}
            totals={totals}
            onOpenOrder={() => toOrder.convert(quote)}
            onOpenOperations={openOperations}
            onSend={isDraft ? sending.send : undefined}
            onConvert={canConvert ? converting.show : undefined}
            busy={sending.sending}
          />
        </AdminScreen>
        {previewModal}
      </>
    );
  }

  const previewButton = (
    <N1Button
      title={Q.preview}
      leftIcon="eye"
      variant="secondary"
      onPress={() =>
        totals && setPreview(quoteDocument(quote, totals, organization))
      }
      fullWidth
      testID="preview-quote"
    />
  );
  const pdfButton = (
    <N1Button
      title={Q.downloadPdf}
      leftIcon="download"
      variant="secondary"
      onPress={downloadPdf}
      fullWidth
    />
  );
  const saveFooter = (
    <FormFooter
      onCancel={cancelEdit}
      submitLabel={COMMON_STRINGS.save}
      onSubmit={save}
      loading={saving}
      compact
      submitTestID="save-quote"
    />
  );
  const headerRight = editing ? (
    saveFooter
  ) : !isDraft ? null : (
    <N1Button
      title={COMMON_STRINGS.edit}
      leftIcon="edit"
      variant="secondary"
      size="sm"
      onPress={startEdit}
      testID="edit-quote"
    />
  );

  const { values, errors, bind } = form;
  const summary = editing ? (
    <FormRow>
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
    </FormRow>
  ) : (
    <N1DetailGrid
      columns={quote.orderId ? 4 : 3}
      items={[
        { label: Q.customer, value: quote.customerName },
        { label: Q.partName, value: quote.partName },
        { label: Q.quantity, value: `${quote.quantity} pcs` },
        ...(quote.orderId
          ? [
              {
                label: Q.order,
                value: (
                  // Opens the order it's mapped to.
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => toOrder.convert(quote)}
                    style={({ pressed }) => [
                      styles.orderLink,
                      pressed && styles.pressed,
                    ]}
                    testID="quote-order"
                  >
                    <N1Text weight="bold" style={styles.underline}>
                      {Q.orderValue}
                    </N1Text>
                  </Pressable>
                ),
              },
            ]
          : []),
      ]}
    />
  );

  const operations = (
    <>
      {editing ? (
        <LineItemsEditor
          controller={form.lines}
          quantity={quantity}
          scrollable
        />
      ) : (
        <LineItemsTable
          items={quote.lineItems}
          quantity={quote.quantity}
          scrollable
        />
      )}
      {editing && form.linesError && (
        <N1Text variant="small" color="danger">
          {form.linesError}
        </N1Text>
      )}
    </>
  );

  // The money, in the grey box; edit fields in place of the actions.
  const amounts = (
    <>
      <BillingSection title={BILLING_STRINGS.invoice.amount}>
        <TotalsSummary totals={totals} fill />
      </BillingSection>
      {editing ? (
        <View style={styles.fields}>
          <View style={styles.fieldRow}>
            {gst.registered && (
              <N1DropDown
                label={T.gstRate}
                options={gstRateOptions(gst.rates, form.gstRate)}
                value={form.gstRate}
                onChange={form.setGstRate}
                placeholder={T.gstRatePlaceholder}
                containerStyle={styles.grow}
                testID="quote-gst-rate"
              />
            )}
          </View>
          {saveError && (
            <N1Text variant="small" color="danger">
              {saveError}
            </N1Text>
          )}
        </View>
      ) : (
        <View style={styles.asideActions}>
          {isDraft && (
            <N1Button
              title={Q.send}
              leftIcon="arrow-right"
              onPress={sending.send}
              loading={sending.sending}
              fullWidth
              testID="send-quote"
            />
          )}
          {canConvert && (
            <N1Button
              title={Q.convert}
              leftIcon="package"
              onPress={converting.show}
              fullWidth
              testID="convert-quote"
            />
          )}
          {previewButton}
          {pdfButton}
        </View>
      )}
    </>
  );

  return (
    <>
      <BillingDetailLayout
        testID="quote-details-screen"
        header={header}
        back={backLink}
        title={Q.heading}
        badge={<QuoteStatusBadge status={quote.status} />}
        subtitle={quote.number}
        headerRight={headerRight}
        summary={summary}
        operations={operations}
        amounts={amounts}
      />
      {previewModal}
    </>
  );
}
