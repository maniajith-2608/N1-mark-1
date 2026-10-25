import { useCallback, useState } from 'react';
import { COMMON_STRINGS } from '../../../shared/constants';
import { isNumeric, toNumber } from '../../../shared/utils';
import { BILLING_STRINGS } from '../constants';
import type { Invoice, InvoiceInput } from '../types';
import { useLineItems } from './useLineItems';

type InvoiceChanges = Pick<
  InvoiceInput,
  'lineItems' | 'discount' | 'gstRate' | 'notes'
>;

/** Blank, or a number that isn't negative. */
const isBadAmount = (text: string) =>
  text.trim() !== '' && (!isNumeric(text) || Number(text) < 0);

/**
 * The editable parts of an invoice (operations, discount, GST rate, notes),
 * edited in place on the invoice page. The status is the server's (New,
 * Overdue, Paid) and the PO amount comes from the order: neither is edited.
 */
export function useInvoiceForm(invoice: Invoice | undefined) {
  const lines = useLineItems(invoice?.lineItems ?? []);
  const [discount, setDiscount] = useState(
    invoice ? String(invoice.discount) : '0',
  );
  const [gstRate, setGstRate] = useState(invoice?.gstRate ?? 0);
  const [notes, setNotes] = useState(invoice?.notes ?? '');
  const [discountError, setDiscountError] = useState<string>();
  const [linesError, setLinesError] = useState<string>();

  /** Back to the saved invoice: on Edit, and on Cancel. */
  const { reset: resetLines } = lines;
  const reset = useCallback(() => {
    if (!invoice) {
      return;
    }
    resetLines(invoice.lineItems);
    setDiscount(String(invoice.discount));
    setGstRate(invoice.gstRate);
    setNotes(invoice.notes);
    setDiscountError(undefined);
    setLinesError(undefined);
  }, [invoice, resetLines]);

  /**
   * The changes to save, or null (with the errors shown) when invalid.
   * `withLines: false` (phones) leaves the operations out: they're edited
   * and saved on their own screen.
   */
  const validate = useCallback(
    (
      { withLines }: { withLines: boolean } = { withLines: true },
    ): Partial<InvoiceChanges> | null => {
      const badDiscount = isBadAmount(discount);
      const noLines = withLines && lines.items.length === 0;
      setDiscountError(badDiscount ? COMMON_STRINGS.invalidNumber : undefined);
      setLinesError(noLines ? BILLING_STRINGS.lineItems.needsOne : undefined);
      if (badDiscount || noLines) {
        return null;
      }
      return {
        ...(withLines && { lineItems: lines.items }),
        discount: toNumber(discount),
        gstRate,
        notes: notes.trim(),
      };
    },
    [discount, lines.items, gstRate, notes],
  );

  return {
    lines,
    discount,
    setDiscount,
    gstRate,
    setGstRate,
    notes,
    setNotes,
    discountError,
    linesError,
    reset,
    validate,
  };
}
