import { useRef } from 'react';
import { N1ConfirmDialog, N1Text } from '../../../shared/components';
import { useOnSettled } from '../../../shared/hooks';
import type { JobCard } from '../../jobCards/types';
import { BILLING_STRINGS } from '../constants';
import { useInvoices } from '../hooks/useBilling';
import { useBillingWorkflow } from '../hooks/useBillingWorkflow';
import { useGst } from '../hooks/useGst';
import { jobCardLabel } from '../workflow';

const S = BILLING_STRINGS.dispatch;

type Props = {
  visible: boolean;
  jobCard: JobCard;
  onClose: () => void;
  /**
   * The invoice to open. `fillRates` when it was just made from the job's
   * operations, so their rates still need filling in.
   */
  onInvoice: (invoiceId: string, fillRates: boolean) => void;
};

/**
 * Generate Dispatch: a confirmation, then the job goes to billing as a new
 * invoice from its operations. Already billed: the dialog opens that invoice.
 */
export function GenerateDispatchModal({
  visible,
  jobCard,
  onClose,
  onInvoice,
}: Props) {
  const { items: invoices } = useInvoices();
  const gst = useGst(jobCard.customerName);
  const { generateInvoice, busy, error, invoiceId } = useBillingWorkflow();
  const requested = useRef(false);

  const existing = invoices.find(i => i.jobCardId === jobCard.id);
  const job = jobCardLabel(jobCard);

  useOnSettled(busy, error, () => {
    if (requested.current && invoiceId) {
      requested.current = false;
      onInvoice(invoiceId, true);
    }
  });

  const confirm = () => {
    if (existing) {
      onInvoice(existing.id, false);
      return;
    }
    requested.current = true;
    generateInvoice(jobCard.id, null, gst.defaultRate);
  };

  return (
    <N1ConfirmDialog
      visible={visible}
      title={existing ? S.billedTitle : S.title}
      message={
        <>
          {existing
            ? S.existing(existing.number)
            : S.confirm(job, jobCard.customerName)}
          {error && (
            <N1Text variant="small" color="danger">
              {`\n${error}`}
            </N1Text>
          )}
        </>
      }
      confirmLabel={existing ? S.open : S.dispatch}
      tone="primary"
      icon="package"
      loading={busy}
      onConfirm={confirm}
      onCancel={onClose}
      testID="dispatch-modal"
    />
  );
}
