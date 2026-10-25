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
import { QuoteEditForm } from '../components/QuoteOverview';
import { BILLING_STRINGS } from '../constants';
import { useQuote } from '../hooks/useBilling';
import { useGst } from '../hooks/useGst';
import { useQuoteForm } from '../hooks/useQuoteForm';
import type { BillingScreenProps } from '../types';
import { calculateTotals } from '../utils';

const Q = BILLING_STRINGS.quote;

/**
 * Phones: Edit quote, sliding up over the quote — the part, quantity and
 * GST rate (the customer is fixed; Send makes it Sent); the operations are edited from their own
 * screen. Save or Cancel slides back down.
 */
export function QuoteEditScreen({
  route,
  navigation,
}: BillingScreenProps<'QuoteEdit'>) {
  const { quoteId } = route.params;
  const { quote, status, error, reload, update, saving, saveError } =
    useQuote(quoteId);
  const form = useQuoteForm(quote);
  const gst = useGst(form.values.customerName);
  const close = useCallback(() => navigation.goBack(), [navigation]);

  // Only its own Save closes it.
  const savingHere = useRef(false);
  const save = useCallback(() => {
    const changes = form.validate({ withLines: false });
    if (changes) {
      savingHere.current = true;
      update(quoteId, changes);
    }
  }, [form, update, quoteId]);
  useOnSettled(saving, saveError, () => {
    if (savingHere.current) {
      savingHere.current = false;
      close();
    }
  });

  // The amounts follow the quantity and GST rate, over the saved operations.
  const quantity = toNumber(form.values.quantity);
  const totals = useMemo(
    () =>
      quote
        ? calculateTotals(
            quote.lineItems,
            quantity,
            0,
            form.gstRate,
            gst.supply,
          )
        : null,
    [quote, quantity, form.gstRate, gst.supply],
  );

  return (
    <AdminScreen
      header={
        <DetailHeader
          sheet
          title={Q.editTitle}
          subtitle={quote?.number}
          onBack={close}
        />
      }
      compactFooter={
        <FormFooter
          onCancel={close}
          submitLabel={COMMON_STRINGS.save}
          onSubmit={save}
          loading={saving}
          submitTestID="save-quote"
        />
      }
      testID="quote-edit-screen"
    >
      {quote && totals ? (
        <QuoteEditForm
          form={form}
          gst={gst}
          totals={totals}
          saveError={saveError}
        />
      ) : (
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="receipt" title={Q.title} message={Q.notFound} />
        </AsyncContent>
      )}
    </AdminScreen>
  );
}
