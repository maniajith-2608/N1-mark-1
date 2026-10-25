import { useEffect, useState } from 'react';
import {
  FormFooter,
  N1DatePicker,
  N1Modal,
  N1Text,
  N1TextInput,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import {
  formatCurrency,
  isBlank,
  isEmail,
  isNumeric,
  parseDisplayDate,
  toDisplayDate,
  toNumber,
} from '../../../shared/utils';
import { BILLING_STRINGS } from '../constants';
import type { ConvertQuoteInput, Invoice, PaymentInput, Quote } from '../types';

const I = BILLING_STRINGS.invoice;
const Q = BILLING_STRINGS.quote;
const S = BILLING_STRINGS.sendDialog;

const todayText = () => toDisplayDate(new Date().toISOString().slice(0, 10));

type DialogProps = {
  visible: boolean;
  onClose: () => void;
  busy: boolean;
  /** The server's refusal, shown in the dialog. */
  error: string | null;
};

const ErrorText = ({ error }: { error: string | null }) =>
  error ? (
    <N1Text variant="small" color="danger">
      {error}
    </N1Text>
  ) : null;

/** Mark as Paid: the day it was paid, and any TDS the customer withheld. */
export function MarkPaidDialog({
  visible,
  onClose,
  busy,
  error,
  invoice,
  onSubmit,
}: DialogProps & {
  invoice: Invoice;
  onSubmit: (payment: PaymentInput) => void;
}) {
  const [paidOn, setPaidOn] = useState(todayText);
  const [tdsAmount, setTdsAmount] = useState('');
  const [tdsSection, setTdsSection] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (visible) {
      setPaidOn(todayText());
      setTdsAmount('');
      setTdsSection('');
      setErrors({});
    }
  }, [visible]);

  const submit = () => {
    const day = parseDisplayDate(paidOn);
    const hasTds = !isBlank(tdsAmount) && toNumber(tdsAmount) !== 0;
    const next: Record<string, string> = {};
    if (!day) {
      next.paidOn = I.paidOnRequired;
    }
    if (
      !isBlank(tdsAmount) &&
      (!isNumeric(tdsAmount) || Number(tdsAmount) < 0)
    ) {
      next.tdsAmount = COMMON_STRINGS.invalidNumber;
    }
    if (hasTds && isBlank(tdsSection)) {
      next.tdsSection = I.tdsSectionRequired;
    }
    setErrors(next);
    if (day && Object.keys(next).length === 0) {
      onSubmit({
        paidOn: day,
        tds: hasTds
          ? { amount: toNumber(tdsAmount), section: tdsSection.trim() }
          : null,
      });
    }
  };

  return (
    <N1Modal
      visible={visible}
      onClose={onClose}
      size="sm"
      title={I.paidTitle}
      subtitle={I.paidSubtitle(
        invoice.number,
        formatCurrency(invoice.totals.total),
      )}
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={I.markPaid}
          onSubmit={submit}
          loading={busy}
          submitTestID="mark-paid-submit"
        />
      }
      testID="mark-paid-dialog"
    >
      <N1DatePicker
        label={I.paidOn}
        required
        value={paidOn}
        onChange={setPaidOn}
        errorText={errors.paidOn}
        testID="paid-on"
      />
      <N1TextInput
        label={I.tdsAmount}
        value={tdsAmount}
        onChangeText={setTdsAmount}
        keyboardType="decimal-pad"
        helperText={I.tdsAmountHint}
        errorText={errors.tdsAmount}
        testID="tds-amount"
      />
      <N1TextInput
        label={I.tdsSection}
        placeholder={I.tdsSectionPlaceholder}
        value={tdsSection}
        onChangeText={setTdsSection}
        autoCapitalize="characters"
        errorText={errors.tdsSection}
        testID="tds-section"
      />
      <ErrorText error={error} />
    </N1Modal>
  );
}

/**
 * Send to an address the user types: shown when the customer has no email
 * on file (CUSTOMER_EMAIL_MISSING).
 */
export function SendEmailDialog({
  visible,
  onClose,
  busy,
  error,
  onSubmit,
}: DialogProps & { onSubmit: (to: string, cc: string[]) => void }) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (visible) {
      setErrors({});
    }
  }, [visible]);

  const submit = () => {
    const copies = cc
      .split(',')
      .map(email => email.trim())
      .filter(Boolean);
    const next: Record<string, string> = {};
    if (!isEmail(to)) {
      next.to = S.invalidEmail;
    }
    if (copies.some(email => !isEmail(email))) {
      next.cc = S.invalidEmail;
    }
    setErrors(next);
    if (Object.keys(next).length === 0) {
      onSubmit(to.trim(), copies);
    }
  };

  return (
    <N1Modal
      visible={visible}
      onClose={onClose}
      size="sm"
      title={S.title}
      subtitle={S.message}
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={S.send}
          onSubmit={submit}
          loading={busy}
          submitTestID="send-email-submit"
        />
      }
      testID="send-email-dialog"
    >
      <N1TextInput
        label={S.to}
        required
        placeholder={S.toPlaceholder}
        value={to}
        onChangeText={setTo}
        keyboardType="email-address"
        autoCapitalize="none"
        errorText={errors.to}
        testID="send-email-to"
      />
      <N1TextInput
        label={S.cc}
        placeholder={S.ccPlaceholder}
        value={cc}
        onChangeText={setCc}
        keyboardType="email-address"
        autoCapitalize="none"
        errorText={errors.cc}
        testID="send-email-cc"
      />
      <ErrorText error={error} />
    </N1Modal>
  );
}

/** Convert to Order: the customer's PO number and the order's due date. */
export function ConvertQuoteDialog({
  visible,
  onClose,
  busy,
  error,
  quote,
  onSubmit,
}: DialogProps & {
  quote: Quote;
  onSubmit: (input: ConvertQuoteInput) => void;
}) {
  const [poNumber, setPoNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (visible) {
      setErrors({});
    }
  }, [visible]);

  const submit = () => {
    const day = parseDisplayDate(dueDate);
    const next: Record<string, string> = {};
    if (isBlank(poNumber)) {
      next.poNumber = Q.poNumberRequired;
    }
    if (!day) {
      next.dueDate = Q.dueDateRequired;
    }
    setErrors(next);
    if (day && Object.keys(next).length === 0) {
      onSubmit({ poNumber: poNumber.trim(), dueDate: day });
    }
  };

  return (
    <N1Modal
      visible={visible}
      onClose={onClose}
      size="sm"
      title={Q.convertTitle}
      subtitle={Q.convertSubtitle(quote.number, quote.customerName)}
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={Q.convert}
          onSubmit={submit}
          loading={busy}
          submitTestID="convert-quote-submit"
        />
      }
      testID="convert-quote-dialog"
    >
      <N1TextInput
        label={Q.poNumber}
        required
        placeholder={Q.poNumberPlaceholder}
        value={poNumber}
        onChangeText={setPoNumber}
        errorText={errors.poNumber}
        testID="convert-po-number"
      />
      <N1DatePicker
        label={Q.dueDate}
        required
        value={dueDate}
        onChange={setDueDate}
        errorText={errors.dueDate}
        testID="convert-due-date"
      />
      <ErrorText error={error} />
    </N1Modal>
  );
}
