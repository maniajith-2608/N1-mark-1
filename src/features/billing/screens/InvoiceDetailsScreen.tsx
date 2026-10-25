import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  AdminScreen,
  AsyncContent,
  DetailHeader,
  ComingSoon,
  FormFooter,
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
import {
  formatCurrency,
  formatShortDate,
  toNumber,
} from '../../../shared/utils';
import { useSession } from '../../profile';
import { InvoiceStatusBadge } from '../components/BillingBadges';
import { MarkPaidDialog, SendEmailDialog } from '../components/BillingDialogs';
import { InvoiceOverview } from '../components/InvoiceOverview';
import { InvoicePreviewModal } from '../components/InvoicePreviewModal';
import {
  BillingBackLink,
  BillingDetailLayout,
} from '../components/BillingDetailLayout';
import { BillingSection } from '../components/BillingSection';
import { LineItemsEditor } from '../components/LineItemsEditor';
import { LineItemsTable } from '../components/LineItemsTable';
import { TotalsSummary } from '../components/TotalsSummary';
import { BILLING_STRINGS } from '../constants';
import { useOrder } from '../../orders/hooks/useOrders';
import { useBillingPermissions, useInvoice } from '../hooks/useBilling';
import {
  useDownloadPdf,
  useMarkPaid,
  useSendByEmail,
} from '../hooks/useBillingActions';
import { gstRateOptions, useGst } from '../hooks/useGst';
import { useInvoiceForm } from '../hooks/useInvoiceForm';
import {
  invoiceDocument,
  invoiceHtml,
  type InvoiceDocument,
} from '../invoiceDocument';
import { calculateTotals } from '../utils';
import type { BillingScreenProps, Payment } from '../types';

const I = BILLING_STRINGS.invoice;
const T = BILLING_STRINGS.totals;
/** Room for a lakh-sized amount beside the title. */

const makeStyles = createN1Styles(t => ({
  pressed: { opacity: t.opacity.pressed },
  jobLink: { alignSelf: 'flex-start' },
  underline: { textDecorationLine: 'underline' },
  asideActions: { gap: t.spacing.sm },
  fields: { gap: t.spacing.md },
  fieldRow: { flexDirection: 'row', gap: t.spacing.md },
  // Beside the title: "PO amount ₹70,000", or its input while editing.
  // The label on top (level with the title), the amount (or its input)
  // at the bottom (level with the invoice number).
  poAmount: { justifyContent: 'space-between', gap: t.spacing.xxs },
  // Phones' bottom bar: Preview and Download side by side, Mark as Paid
  // under them. No flex: the bar's slot is a column, where flex would
  // collapse the rows.
  compactActions: { gap: t.spacing.sm },
  row: { flexDirection: 'row', gap: t.spacing.sm },
  grow: { flex: 1 },
}));

export function InvoiceDetailsScreen({
  route,
  navigation,
}: BillingScreenProps<'InvoiceDetails'>) {
  const styles = useN1Styles(makeStyles);
  const { isCompact } = useN1Breakpoint();
  const { invoiceId, fromJobCardId, edit: editRequested } = route.params;
  const {
    invoice,
    status,
    error,
    reload,
    update,
    saving,
    saveError,
    clearErrors,
  } = useInvoice(invoiceId);

  // Edit turns the operations, discount, GST rate and notes into inputs
  // right here; Save or Cancel turns them back. The status is the server's.
  const form = useInvoiceForm(invoice);
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
  // Only its own Save ends editing, not Mark as Paid.
  const savingHere = useRef(false);
  const save = useCallback(() => {
    const changes = form.validate();
    if (changes) {
      savingHere.current = true;
      update(invoiceId, changes);
    }
  }, [form, update, invoiceId]);
  useOnSettled(saving, saveError, () => {
    if (savingHere.current) {
      savingHere.current = false;
      setEditing(false);
    }
  });
  // Phones: Edit invoice slides up as its own screen.
  const openEdit = useCallback(
    () => navigation.navigate('InvoiceEdit', { invoiceId }),
    [navigation, invoiceId],
  );
  // Opened with edit (the list's Edit, or a job card's "fill in the rates"):
  // phones slide up Edit invoice over it.
  useEffect(() => {
    if (editRequested && invoice) {
      navigation.setParams({ edit: undefined });
      if (isCompact) {
        openEdit();
      } else {
        startEdit();
      }
    }
  }, [editRequested, invoice, startEdit, openEdit, isCompact, navigation]);

  // Back to the job card the invoice was opened from (keeping that page's
  // own Back), else always to the Billing list.
  const goBack = useCallback(() => {
    if (fromJobCardId) {
      navigation.navigate('JobCards', {
        screen: 'JobCardDetails',
        params: { jobCardId: fromJobCardId },
        merge: true,
      });
    } else {
      navigation.popTo('BillingHome');
    }
  }, [navigation, fromJobCardId]);
  const backLabel = fromJobCardId ? I.backToJobCard : I.back;
  // The job links to its order when there is one, and Back on the order
  // returns here.
  const orderId = invoice?.orderId ?? '';
  const { order } = useOrder(orderId || undefined);
  const openOrder = useCallback(
    () =>
      navigation.navigate('Orders', {
        screen: 'OrderDetails',
        params: { orderId, fromInvoiceId: invoiceId },
        initial: false,
      }),
    [navigation, orderId, invoiceId],
  );
  // Only the owner and the accountant record payments.
  const { canMarkPaid } = useBillingPermissions();
  const paying = useMarkPaid(invoiceId);
  // Emails the PDF, at any status and as often as needed.
  const emailed = useMemo(
    () =>
      invoice && {
        kind: 'invoice' as const,
        id: invoice.id,
        number: invoice.number,
      },
    [invoice],
  );
  const sending = useSendByEmail(emailed || undefined);
  const send = sending.send;
  // Preview Invoice: the invoice as it prints, from what's saved.
  const { organization } = useSession();
  const [preview, setPreview] = useState<InvoiceDocument | null>(null);
  const closePreview = useCallback(() => setPreview(null), []);
  const print = useCallback(
    (doc: InvoiceDocument) =>
      printOrNotify(invoiceHtml(doc), doc.title, doc.printAction),
    [],
  );
  const { download: downloadPdf } = useDownloadPdf(emailed || undefined);
  // Phones: the operations open on their own screen (to edit, while
  // editing); Back returns here.
  const openOperations = useCallback(
    () => navigation.navigate('InvoiceOperations', { invoiceId }),
    [navigation, invoiceId],
  );

  const gst = useGst(invoice?.customerName ?? '');
  // The server's totals; while editing, a preview follows the inputs until
  // Save brings the server's back.
  const totals = useMemo(() => {
    if (!invoice) {
      return null;
    }
    return editing
      ? calculateTotals(
          form.lines.items,
          invoice.quantity,
          toNumber(form.discount),
          form.gstRate,
          gst.supply,
        )
      : invoice.totals;
  }, [
    invoice,
    editing,
    form.lines.items,
    form.discount,
    form.gstRate,
    gst.supply,
  ]);

  const backLink = (
    <BillingBackLink label={backLabel} onPress={goBack} testID="invoice-back" />
  );

  // Phones: a header with back and the screen's name, in place of the link.
  const header = <DetailHeader title={I.title} onBack={goBack} />;

  if (!invoice || !totals) {
    return (
      <AdminScreen header={header} testID="invoice-details-screen">
        {!isCompact && backLink}
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="receipt" title={I.title} message={I.notFound} />
        </AsyncContent>
      </AdminScreen>
    );
  }

  const isPaid = invoice.status === 'paid';
  const openPreview = () =>
    setPreview(invoiceDocument(invoice, totals, organization));
  const sendButton = (
    <N1Button
      title={I.send}
      leftIcon="arrow-right"
      variant="secondary"
      onPress={send}
      loading={sending.sending}
      fullWidth
      testID="send-invoice"
    />
  );
  const previewButton = (
    <N1Button
      title={I.preview}
      leftIcon="eye"
      variant="secondary"
      onPress={openPreview}
      fullWidth
      testID="preview-invoice"
    />
  );
  const pdfButton = (
    <N1Button
      title={I.downloadPdf}
      leftIcon="download"
      variant="secondary"
      onPress={downloadPdf}
      fullWidth
    />
  );
  const paidButton = canMarkPaid && (
    <N1Button
      title={I.markPaid}
      leftIcon="check-circle"
      onPress={paying.show}
      disabled={isPaid}
      fullWidth
      testID="mark-paid"
    />
  );

  const saveFooter = (
    <FormFooter
      onCancel={cancelEdit}
      submitLabel={COMMON_STRINGS.save}
      onSubmit={save}
      loading={saving}
      compact={!isCompact}
      submitTestID="save-invoice"
    />
  );

  // The customer's PO value, from the order, beside the title. Fixed: not
  // editable here, even while the invoice is being edited.
  const poAmount = (
    <View style={styles.poAmount} testID="invoice-po-amount">
      <N1Text variant="overline">{I.poAmount}</N1Text>
      <N1Text weight="bold">
        {invoice.poAmount == null
          ? COMMON_STRINGS.dash
          : formatCurrency(invoice.poAmount)}
      </N1Text>
    </View>
  );

  // A paid invoice is final: no Edit.
  const headerRight = editing ? (
    !isCompact && saveFooter
  ) : isPaid ? null : (
    <N1Button
      title={COMMON_STRINGS.edit}
      leftIcon="edit"
      variant="secondary"
      size="sm"
      onPress={startEdit}
      testID="edit-invoice"
    />
  );

  const summary = [
    { label: I.customer, value: invoice.customerName },
    {
      label: I.jobId,
      value: order ? (
        // A text link, so it lines up with the other values.
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={I.openOrder(invoice.jobId)}
          onPress={openOrder}
          style={({ pressed }) => [styles.jobLink, pressed && styles.pressed]}
          testID="invoice-order-link"
        >
          <N1Text weight="bold" style={styles.underline}>
            {invoice.jobId}
          </N1Text>
        </Pressable>
      ) : (
        invoice.jobId
      ),
    },
    { label: I.routeCard, value: invoice.routeCard },
    { label: I.partName, value: invoice.partName },
    { label: I.quantity, value: `${invoice.quantity} pcs` },
  ];

  const operations = (
    <>
      {editing ? (
        <LineItemsEditor
          controller={form.lines}
          quantity={invoice.quantity}
          scrollable={!isCompact}
        />
      ) : (
        <LineItemsTable
          items={invoice.lineItems}
          quantity={invoice.quantity}
          scrollable={!isCompact}
        />
      )}
      {editing && form.linesError && (
        <N1Text variant="small" color="danger">
          {form.linesError}
        </N1Text>
      )}
    </>
  );

  // Right: the money, in the grey box; edit fields in place of the actions.
  const amounts = (
    <>
      <BillingSection title={I.amount}>
        <TotalsSummary totals={totals} fill />
      </BillingSection>
      {editing ? (
        <View style={styles.fields}>
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
          {saveError && (
            <N1Text variant="small" color="danger">
              {saveError}
            </N1Text>
          )}
        </View>
      ) : (
        !isCompact && (
          <View style={styles.asideActions}>
            {paidButton}
            {sendButton}
            {previewButton}
            {pdfButton}
          </View>
        )
      )}
    </>
  );
  // Notes sit under the amounts so the operations get the full left side.
  const notes = (
    <>
      {invoice.payment && <PaymentDetails payment={invoice.payment} />}
      <BillingSection title={I.notes}>
        {editing ? (
          <N1TextInput
            value={form.notes}
            onChangeText={form.setNotes}
            placeholder={COMMON_STRINGS.dash}
            accessibilityLabel={I.notes}
            multiline
            testID="invoice-notes"
          />
        ) : (
          <N1Text>{invoice.notes || COMMON_STRINGS.dash}</N1Text>
        )}
      </BillingSection>
    </>
  );
  const previewModal = (
    <>
      <InvoicePreviewModal
        doc={preview}
        onClose={closePreview}
        onPrint={print}
        onDownload={downloadPdf}
      />
      <MarkPaidDialog invoice={invoice} {...paying.dialog} />
      <SendEmailDialog {...sending.dialog} />
    </>
  );

  // Phones: the invoice at a glance in small cards. The header's Edit
  // slides up Edit invoice; Preview Invoice, Download PDF and Mark as Paid
  // are pinned to the bottom.
  if (isCompact) {
    return (
      <>
        <AdminScreen
          header={
            <DetailHeader
              title={I.title}
              onBack={goBack}
              compactRight={
                !isPaid && (
                  <N1IconButton
                    icon="edit"
                    variant="tile"
                    accessibilityLabel={COMMON_STRINGS.edit}
                    onPress={openEdit}
                    testID="edit-invoice"
                  />
                )
              }
            />
          }
          compactFooter={
            <View style={styles.compactActions}>
              <View style={styles.row}>
                <View style={styles.grow}>
                  <N1Button
                    title={I.preview}
                    leftIcon="eye"
                    variant="soft"
                    fullWidth
                    onPress={openPreview}
                    testID="preview-invoice"
                  />
                </View>
                <View style={styles.grow}>
                  <N1Button
                    title={I.downloadPdf}
                    leftIcon="download"
                    variant="soft"
                    fullWidth
                    onPress={downloadPdf}
                  />
                </View>
              </View>
              {paidButton}
            </View>
          }
          testID="invoice-details-screen"
        >
          <InvoiceOverview
            invoice={invoice}
            totals={totals}
            onOpenOrder={order ? openOrder : undefined}
            onOpenOperations={openOperations}
            onSend={send}
            sendDisabled={sending.sending}
          />
        </AdminScreen>
        {previewModal}
      </>
    );
  }

  return (
    <>
      <BillingDetailLayout
        testID="invoice-details-screen"
        header={header}
        back={!isCompact && backLink}
        title={I.title}
        badge={<InvoiceStatusBadge status={invoice.status} />}
        titleExtra={poAmount}
        subtitle={invoice.number}
        headerRight={headerRight}
        summary={
          <N1DetailGrid
            items={summary}
            columns={isCompact ? 2 : summary.length}
          />
        }
        operations={operations}
        amounts={amounts}
        aside={notes}
        // Wide screens only; phones have their own views above.
        compactFooter={saveFooter}
      />
      {previewModal}
    </>
  );
}

/** A paid invoice: when, what was received, and the TDS withheld. */
function PaymentDetails({ payment }: { payment: Payment }) {
  return (
    <BillingSection title={I.paidSummary(formatShortDate(payment.paidOn))}>
      <N1Text>
        {`${I.received} ${formatCurrency(payment.receivedAmount)}`}
      </N1Text>
      {payment.tdsAmount > 0 && (
        <N1Text color="secondary">
          {I.tdsSummary(
            formatCurrency(payment.tdsAmount),
            payment.tdsSection ?? '',
          )}
        </N1Text>
      )}
    </BillingSection>
  );
}
