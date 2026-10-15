import { useCallback } from 'react';
import {
  AsyncContent,
  ComingSoon,
  N1Button,
  N1Header,
  UserScreen,
} from '../../../shared/components';
import { ORDER_STRINGS, useOrder } from '../../orders';
import { OrderInfo } from '../components/OrderInfo';
import { OrderSummaryTile } from '../components/OrderSummaryTile';
import { JOBS_STRINGS } from '../constants';
import { useMyJobs } from '../hooks/useMyJobs';
import type { JobsScreenProps } from '../types';

const S = JOBS_STRINGS.order;
const D = ORDER_STRINGS.details;

/**
 * The scanned work order; Create Job Card asks for its raw material. Its
 * heading and drawing stay pinned on top while the details scroll.
 */
export function ImportOrderScreen({
  route,
  navigation,
}: JobsScreenProps<'ImportOrder'>) {
  const { orderId } = route.params;
  const { order, status, error, reload } = useOrder(orderId);
  const myJobs = useMyJobs();

  // Already on My Jobs: open its job card instead of importing it again.
  const imported = myJobs.ids.includes(orderId);
  const onPrimary = useCallback(() => {
    if (imported) {
      navigation.navigate('JobCardDetails', { jobCardId: orderId });
    } else {
      navigation.navigate('RawMaterial', { orderId });
    }
  }, [imported, navigation, orderId]);

  const header = (
    <N1Header
      title={S.title}
      leftIcon="chevron-left"
      onLeftPress={() => navigation.goBack()}
    />
  );

  if (!order) {
    return (
      <UserScreen header={header} testID="import-order-screen">
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="package" title={S.title} message={D.notFound} />
        </AsyncContent>
      </UserScreen>
    );
  }

  const footer = (
    <N1Button
      title={imported ? S.viewJobCard : S.createJobCard}
      leftIcon={imported ? 'file' : 'plus'}
      size="lg"
      fullWidth
      disabled={myJobs.status !== 'succeeded'}
      onPress={onPrimary}
      testID="create-job-card"
    />
  );

  return (
    <UserScreen
      header={
        <>
          {header}
          <OrderSummaryTile order={order} />
        </>
      }
      footer={footer}
      testID="import-order-screen"
    >
      <OrderInfo order={order} />
    </UserScreen>
  );
}
