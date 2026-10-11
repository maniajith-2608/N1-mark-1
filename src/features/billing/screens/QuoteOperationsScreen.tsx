import { useCallback } from 'react';
import { AsyncContent, ComingSoon } from '../../../shared/components';
import { OperationsBillScreen } from '../components/OperationsBillScreen';
import { BILLING_STRINGS } from '../constants';
import { useQuote } from '../hooks/useBilling';
import type { BillingScreenProps, LineItem } from '../types';

const Q = BILLING_STRINGS.quote;

/** Phones: a quote's process operations as a bill, opened from it. */
export function QuoteOperationsScreen({
  route,
  navigation,
}: BillingScreenProps<'QuoteOperations'>) {
  const { quoteId, edit = false } = route.params;
  const { quote, status, error, reload, update, saving, saveError } =
    useQuote(quoteId);
  const save = useCallback(
    (lineItems: LineItem[]) => update(quoteId, { lineItems }),
    [update, quoteId],
  );

  return (
    <OperationsBillScreen
      doc={quote}
      docLabel={Q.docLabel}
      fallback={
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="receipt" title={Q.title} message={Q.notFound} />
        </AsyncContent>
      }
      editing={edit}
      onEditingChange={on => navigation.setParams({ edit: on })}
      onBack={() => navigation.goBack()}
      onSave={save}
      saving={saving}
      saveError={saveError}
      testID="quote-operations-screen"
    />
  );
}
