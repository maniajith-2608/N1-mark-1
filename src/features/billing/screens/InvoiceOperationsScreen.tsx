import { useCallback } from 'react';
import { AsyncContent, ComingSoon } from '../../../shared/components';
import { OperationsBillScreen } from '../components/OperationsBillScreen';
import { BILLING_STRINGS } from '../constants';
import { useInvoice } from '../hooks/useBilling';
import type { BillingScreenProps, LineItem } from '../types';

const I = BILLING_STRINGS.invoice;

/** Phones: an invoice's process operations as a bill, opened from it. */
export function InvoiceOperationsScreen({
  route,
  navigation,
}: BillingScreenProps<'InvoiceOperations'>) {
  const { invoiceId, edit = false } = route.params;
  const { invoice, status, error, reload, update, saving, saveError } =
    useInvoice(invoiceId);
  const save = useCallback(
    (lineItems: LineItem[]) => update(invoiceId, { lineItems }),
    [update, invoiceId],
  );

  return (
    <OperationsBillScreen
      doc={invoice}
      docLabel={I.docLabel}
      fallback={
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="receipt" title={I.title} message={I.notFound} />
        </AsyncContent>
      }
      editing={edit}
      onEditingChange={on => navigation.setParams({ edit: on })}
      onBack={() => navigation.goBack()}
      onSave={save}
      saving={saving}
      saveError={saveError}
      testID="invoice-operations-screen"
    />
  );
}
