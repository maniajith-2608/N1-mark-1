import {
  AsyncContent,
  ComingSoon,
  N1Header,
  UserScreen,
} from '../../../shared/components';
import { useJobCardForOrder } from '../../jobCards';
import { ORDER_STRINGS } from '../../orders';
import { OrderInfo } from '../components/OrderInfo';
import { OrderSummaryTile } from '../components/OrderSummaryTile';
import { JOBS_STRINGS } from '../constants';
import type { JobsScreenProps } from '../types';
import { jobViewOf } from '../utils';

const S = JOBS_STRINGS.orderDetails;

/**
 * The work order behind a job, read only, as a full screen modal over the
 * operator's Job Detail or the QC Check. Operators and QC read it through
 * the job card (the job view: no prices or client details), never the order.
 */
export function OrderDetailsModalScreen({
  route,
  navigation,
}: JobsScreenProps<'OrderDetails'>) {
  const { orderId } = route.params;
  const { jobCard, status, error, reload } = useJobCardForOrder(orderId);
  const order = jobCard && jobViewOf(jobCard);

  const header = (
    <N1Header
      title={S.title}
      leftIcon="close"
      onLeftPress={() => navigation.goBack()}
    />
  );

  if (!order) {
    return (
      <UserScreen header={header} testID="order-details-modal">
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon
            icon="package"
            title={S.title}
            message={ORDER_STRINGS.details.notFound}
          />
        </AsyncContent>
      </UserScreen>
    );
  }

  return (
    <UserScreen
      header={
        <>
          {header}
          <OrderSummaryTile order={order} />
        </>
      }
      testID="order-details-modal"
    >
      <OrderInfo order={order} />
    </UserScreen>
  );
}
