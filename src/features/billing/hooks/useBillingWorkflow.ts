import { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useOnSettled } from '../../../shared/hooks';
import type {
  BillingScreenProps,
  ConvertQuoteInput,
  PaymentInput,
  Quote,
} from '../types';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import { selectWorkflow } from '../store/selectors';
import { workflowActions, type SendPayload } from '../store/workflowSlice';

/**
 * Convert a quote to an order, bill a dispatched job, mark an invoice paid,
 * or send an invoice or quote by email.
 */
export function useBillingWorkflow() {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectWorkflow);
  const convertQuote = useCallback(
    (quoteId: string, input: ConvertQuoteInput) =>
      dispatch(workflowActions.convertQuoteRequest({ quoteId, ...input })),
    [dispatch],
  );
  const markPaid = useCallback(
    (invoiceId: string, payment: PaymentInput) =>
      dispatch(workflowActions.markPaidRequest({ invoiceId, payment })),
    [dispatch],
  );
  const send = useCallback(
    (payload: SendPayload) => dispatch(workflowActions.sendRequest(payload)),
    [dispatch],
  );
  const clearError = useCallback(
    () => dispatch(workflowActions.clearError()),
    [dispatch],
  );
  const generateInvoice = useCallback(
    (jobCardId: string, quoteId: string | null, gstRate: number) =>
      dispatch(
        workflowActions.generateInvoiceRequest({ jobCardId, quoteId, gstRate }),
      ),
    [dispatch],
  );
  return {
    ...state,
    convertQuote,
    generateInvoice,
    markPaid,
    send,
    clearError,
  };
}

type Navigation = BillingScreenProps<'BillingHome'>['navigation'];

/**
 * Convert to Order: a converted quote opens its order; otherwise the order
 * is created from the quote (with the customer's PO number and due date),
 * then opened (Back returns to billing).
 */
export function useConvertToOrder() {
  const navigation = useNavigation<Navigation>();
  const { convertQuote, busy, error, orderId } = useBillingWorkflow();
  const converting = useRef<string | null>(null);

  const openOrder = useCallback(
    (id: string) =>
      navigation.navigate('Orders', {
        screen: 'OrderDetails',
        params: { orderId: id },
        initial: false,
      }),
    [navigation],
  );

  useOnSettled(busy, error, () => {
    if (converting.current && orderId) {
      converting.current = null;
      openOrder(orderId);
    }
  });

  const convert = useCallback(
    (quote: Quote, input?: ConvertQuoteInput) => {
      if (quote.orderId) {
        openOrder(quote.orderId);
      } else if (input) {
        converting.current = quote.id;
        convertQuote(quote.id, input);
      }
    },
    [openOrder, convertQuote],
  );

  return {
    convert,
    /** The quote being converted right now, for its spinner. */
    convertingId: busy ? converting.current : null,
    error,
  };
}
