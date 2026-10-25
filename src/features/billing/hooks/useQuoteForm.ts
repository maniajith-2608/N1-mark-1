import { useCallback, useState } from 'react';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useForm, type FormErrors } from '../../../shared/hooks';
import { isBlank, isNumeric, toNumber } from '../../../shared/utils';
import { BILLING_STRINGS } from '../constants';
import type { Quote, QuoteInput } from '../types';
import { useLineItems } from './useLineItems';

export type QuoteValues = {
  customerName: string;
  partName: string;
  quantity: string;
  material: string;
};

const EMPTY: QuoteValues = {
  customerName: '',
  partName: '',
  quantity: '',
  material: '',
};

export const toQuoteValues = (q?: Quote): QuoteValues =>
  q
    ? {
        customerName: q.customerName,
        partName: q.partName,
        quantity: String(q.quantity),
        material: q.material,
      }
    : EMPTY;

export const validateQuoteValues = (
  v: QuoteValues,
): FormErrors<QuoteValues> => {
  const errors: FormErrors<QuoteValues> = {};
  if (isBlank(v.customerName)) {
    errors.customerName = COMMON_STRINGS.required;
  }
  if (isBlank(v.partName)) {
    errors.partName = COMMON_STRINGS.required;
  }
  if (!isNumeric(v.quantity) || Number(v.quantity) <= 0) {
    errors.quantity = COMMON_STRINGS.invalidNumber;
  }
  return errors;
};

type QuoteChanges = Pick<
  QuoteInput,
  'partName' | 'quantity' | 'material' | 'gstRate' | 'lineItems'
>;

/**
 * An existing draft's editable fields (part, quantity, material, GST rate
 * and operations), edited in place on the quote page. The customer is fixed
 * (a different customer is a new quote) and Send makes it Sent.
 */
export function useQuoteForm(quote: Quote | undefined) {
  const form = useForm<QuoteValues>(toQuoteValues(quote), validateQuoteValues);
  const lines = useLineItems(quote?.lineItems ?? []);
  const [gstRate, setGstRate] = useState(quote?.gstRate ?? 0);
  const [linesError, setLinesError] = useState<string>();

  /** Back to the saved quote: on Edit, and on Cancel. */
  const { reset: resetValues, validate: validateValues, values } = form;
  const { reset: resetLines } = lines;
  const reset = useCallback(() => {
    if (!quote) {
      return;
    }
    resetValues(toQuoteValues(quote));
    resetLines(quote.lineItems);
    setGstRate(quote.gstRate);
    setLinesError(undefined);
  }, [quote, resetValues, resetLines]);

  /**
   * The changes to save, or null (with the errors shown) when invalid.
   * `withLines: false` (phones' Edit quote) leaves the operations out:
   * they're edited from their own screen.
   */
  const validate = useCallback(
    ({ withLines = true }: { withLines?: boolean } = {}):
      | QuoteChanges
      | Omit<QuoteChanges, 'lineItems'>
      | null => {
      const valid = validateValues();
      const noLines = withLines && lines.items.length === 0;
      setLinesError(noLines ? BILLING_STRINGS.lineItems.needsOne : undefined);
      if (!valid || noLines) {
        return null;
      }
      const changes = {
        partName: values.partName.trim(),
        quantity: toNumber(values.quantity),
        material: values.material.trim(),
        gstRate,
      };
      return withLines ? { ...changes, lineItems: lines.items } : changes;
    },
    [validateValues, values, lines.items, gstRate],
  );

  return {
    values,
    errors: form.errors,
    bind: form.bind,
    lines,
    gstRate,
    setGstRate,
    linesError,
    reset,
    validate,
  };
}
