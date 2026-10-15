import {
  AsyncContent,
  ComingSoon,
  N1Header,
  UserScreen,
} from '../../../shared/components';
import { ORDER_STRINGS, useOrder } from '../../orders';
import { OrderInfo } from '../components/OrderInfo';
import { OrderSummaryTile } from '../components/OrderSummaryTile';
import { JOBS_STRINGS } from '../constants';
import type { JobsScreenProps } from '../types';

const S = JOBS_STRINGS.orderDetails;

/**
 * The work order behind a job, read only, as a full screen modal over the
 * operator's Job Detail or the QC Check.
 */
export function OrderDetailsModalScreen({
  route,
  navigation,
}: JobsScreenProps<'OrderDetails'>) {
  const { orderId } = route.params;
  const { order, status, error, reload } = useOrder(orderId);

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
