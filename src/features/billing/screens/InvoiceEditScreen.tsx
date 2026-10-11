import { useCallback, useMemo, useRef } from 'react';
import {
  AdminScreen,
  AsyncContent,
  ComingSoon,
  DetailHeader,
  FormFooter,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useOnSettled } from '../../../shared/hooks';
import { toNumber } from '../../../shared/utils';
import { InvoiceEditForm } from '../components/InvoiceOverview';
import { BILLING_STRINGS } from '../constants';
import { useInvoice } from '../hooks/useBilling';
import { useGst } from '../hooks/useGst';
import { useInvoiceForm } from '../hooks/useInvoiceForm';
import type { BillingScreenProps } from '../types';
import { calculateTotals } from '../utils';

const I = BILLING_STRINGS.invoice;

/**
 * Phones: Edit invoice, sliding up over the invoice — only the status,
 * discount, GST rate and notes; the operations are edited from their own
 * screen. Save or Cancel slides back down.
 */
export function InvoiceEditScreen({
  route,
  navigation,
}: BillingScreenProps<'InvoiceEdit'>) {
  const { invoiceId } = route.params;
  const { invoice, status, error, reload, update, saving, saveError } =
    useInvoice(invoiceId);
  const form = useInvoiceForm(invoice);
  const gst = useGst(invoice?.customerName ?? '');
  const close = useCallback(() => navigation.goBack(), [navigation]);

  // Only its own Save closes it.
  const savingHere = useRef(false);
  const save = useCallback(() => {
    const changes = form.validate({ withLines: false });
    if (changes) {
      savingHere.current = true;
      update(invoiceId, changes);
    }
  }, [form, update, invoiceId]);
  useOnSettled(saving, saveError, () => {
    if (savingHere.current) {
      savingHere.current = false;
      close();
    }
  });

  // The amounts follow the inputs, over the saved operations.
  const totals = useMemo(
    () =>
      invoice
        ? calculateTotals(
            invoice.lineItems,
            invoice.quantity,
            toNumber(form.discount),
            form.gstRate,
            gst.supply,
          )
        : null,
    [invoice, form.discount, form.gstRate, gst.supply],
  );

  return (
    <AdminScreen
      header={
        <DetailHeader
          sheet
          title={I.editTitle}
          subtitle={invoiceId}
          onBack={close}
        />
      }
      compactFooter={
        <FormFooter
          onCancel={close}
          submitLabel={COMMON_STRINGS.save}
          onSubmit={save}
          loading={saving}
          submitTestID="save-invoice"
        />
      }
      testID="invoice-edit-screen"
    >
      {invoice && totals ? (
        <InvoiceEditForm
          form={form}
          gst={gst}
          totals={totals}
          saveError={saveError}
        />
      ) : (
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="receipt" title={I.title} message={I.notFound} />
        </AsyncContent>
      )}
    </AdminScreen>
  );
}
