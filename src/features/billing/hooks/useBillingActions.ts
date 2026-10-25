import { useCallback, useEffect, useRef, useState } from 'react';
import { useOnSettled } from '../../../shared/hooks';
import { notify } from '../../../shared/utils';
import {
  fromFileReference,
  openStoredFile,
} from '../../../services/files/fileStorage';
import { invoicesApi, quotesApi } from '../api/billingApi';
import { BILLING_STRINGS } from '../constants';
import type { ConvertQuoteInput, PaymentInput } from '../types';
import { useBillingWorkflow } from './useBillingWorkflow';

type Action = 'send' | 'paid' | 'convert';
type Doc = { kind: 'invoice' | 'quote'; id: string; number: string };

/**
 * One workflow step at a time from a detail screen: which one is running,
 * so its dialog shows the busy state and error, and closes when it's done.
 */
function useWorkflowStep(onDone: (action: Action) => void) {
  const workflow = useBillingWorkflow();
  const running = useRef<Action | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const begin = useCallback((next: Action) => {
    running.current = next;
    setAction(next);
  }, []);
  useOnSettled(workflow.busy, workflow.error, () => {
    const done = running.current;
    running.current = null;
    setAction(null);
    if (done) {
      onDone(done);
    }
  });
  return { workflow, action, begin };
}

/**
 * Send by email: straight to the customer's address; if they have none on
 * file (CUSTOMER_EMAIL_MISSING), a dialog asks where to send it instead.
 */
export function useSendByEmail(doc: Doc | undefined) {
  const [asking, setAsking] = useState(false);
  const { workflow, action, begin } = useWorkflowStep(() => {
    setAsking(false);
    const s =
      doc?.kind === 'quote' ? BILLING_STRINGS.quote : BILLING_STRINGS.invoice;
    notify(s.sent, s.sentMessage(doc?.number ?? ''));
  });
  const { send: sendRequest, clearError, emailMissing, error, busy } = workflow;
  const sending = action === 'send';

  // The customer has no email: ask for one. Any other refusal is shown.
  useEffect(() => {
    if (!sending || busy || !error) {
      return;
    }
    if (emailMissing) {
      setAsking(true);
    } else if (!asking) {
      notify(BILLING_STRINGS.sendDialog.title, error);
    }
  }, [sending, busy, error, emailMissing, asking]);

  const send = useCallback(() => {
    if (doc) {
      begin('send');
      sendRequest({ kind: doc.kind, id: doc.id });
    }
  }, [doc, begin, sendRequest]);
  const sendTo = useCallback(
    (to: string, cc: string[]) => {
      if (doc) {
        begin('send');
        sendRequest({ kind: doc.kind, id: doc.id, to, cc });
      }
    },
    [doc, begin, sendRequest],
  );
  const cancel = useCallback(() => {
    setAsking(false);
    clearError();
  }, [clearError]);

  return {
    send,
    sending: sending && busy,
    dialog: {
      visible: asking,
      onClose: cancel,
      busy: sending && busy,
      // The missing email is why it's open; anything after that is shown.
      error: sending && !emailMissing ? error : null,
      onSubmit: sendTo,
    },
  };
}

/** Mark as Paid, through its dialog (paid on, TDS). */
export function useMarkPaid(invoiceId: string) {
  const [open, setOpen] = useState(false);
  const { workflow, action, begin } = useWorkflowStep(() => setOpen(false));
  const { markPaid, clearError, busy, error } = workflow;
  const paying = action === 'paid';
  const submit = useCallback(
    (payment: PaymentInput) => {
      begin('paid');
      markPaid(invoiceId, payment);
    },
    [begin, markPaid, invoiceId],
  );
  const show = useCallback(() => {
    clearError();
    setOpen(true);
  }, [clearError]);
  return {
    show,
    dialog: {
      visible: open,
      onClose: () => setOpen(false),
      busy: paying && busy,
      error: paying ? error : null,
      onSubmit: submit,
    },
  };
}

/** Convert to Order, through its dialog (PO number, due date). */
export function useConvertDialog(convert: (input: ConvertQuoteInput) => void) {
  const [open, setOpen] = useState(false);
  const { workflow, action, begin } = useWorkflowStep(() => setOpen(false));
  const converting = action === 'convert';
  const submit = useCallback(
    (input: ConvertQuoteInput) => {
      begin('convert');
      convert(input);
    },
    [begin, convert],
  );
  const { clearError } = workflow;
  const show = useCallback(() => {
    clearError();
    setOpen(true);
  }, [clearError]);
  return {
    show,
    dialog: {
      visible: open,
      onClose: () => setOpen(false),
      busy: converting && workflow.busy,
      error: converting ? workflow.error : null,
      onSubmit: submit,
    },
  };
}

/**
 * Download PDF: the server makes the invoice or quote PDF; it opens from
 * its download link.
 */
export async function openPdf(doc: Pick<Doc, 'kind' | 'id'>) {
  try {
    const api = doc.kind === 'quote' ? quotesApi : invoicesApi;
    const file = await api.pdf(doc.id);
    if (file) {
      await openStoredFile(fromFileReference(file));
    }
  } catch (error) {
    notify(
      BILLING_STRINGS.invoice.downloadPdf,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function useDownloadPdf(doc: Pick<Doc, 'kind' | 'id'> | undefined) {
  const [busy, setBusy] = useState(false);
  const download = useCallback(async () => {
    if (doc) {
      setBusy(true);
      await openPdf(doc);
      setBusy(false);
    }
  }, [doc]);
  return { download, busy };
}
