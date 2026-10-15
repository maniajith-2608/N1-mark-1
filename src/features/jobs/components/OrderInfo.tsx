import { memo } from 'react';
import { N1DetailGrid, N1Divider } from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { formatCurrency, formatLongDate } from '../../../shared/utils';
import {
  MATERIAL_SOURCE_OPTIONS,
  ORDER_STRINGS,
  type WorkOrder,
} from '../../orders';

const D = ORDER_STRINGS.details;
const F = ORDER_STRINGS.form;
const orDash = (v: string) => v || COMMON_STRINGS.dash;

/**
 * The work order's Overview, Dispatch and Raw material, two columns each
 * like the admin order (Order, Order Details). The drawing sits in
 * OrderSummaryTile above them.
 */
export const OrderInfo = memo(function OrderInfoComponent({
  order,
}: {
  order: WorkOrder;
}) {
  const source = MATERIAL_SOURCE_OPTIONS.find(
    o => o.value === order.materialSource,
  );
  return (
    <>
      <N1DetailGrid
        title={D.overview}
        columns={2}
        testID="order-info-overview"
        items={[
          {
            label: D.quantity,
            value: order.quantity
              ? ORDER_STRINGS.quantity(order.quantity)
              : COMMON_STRINGS.dash,
          },
          { label: D.dueDate, value: orDash(formatLongDate(order.dueDate)) },
          { label: F.partName, value: orDash(order.partName) },
          { label: F.partNumber, value: orDash(order.partNumber) },
          { label: F.drawingNumber, value: orDash(order.drawingNumber) },
          { label: F.poNumber, value: orDash(order.poNumber) },
          {
            label: F.poAmount,
            value:
              order.poAmount == null
                ? COMMON_STRINGS.dash
                : formatCurrency(order.poAmount),
          },
          { label: F.projectId, value: orDash(order.projectId) },
          { label: F.shopOrderNumber, value: orDash(order.shopOrderNumber) },
        ]}
      />
      <N1Divider />
      <N1DetailGrid
        title={D.dispatch}
        columns={2}
        testID="order-info-dispatch"
        items={[
          { label: F.routeCardNo, value: orDash(order.routeCardNo) },
          { label: F.dcNo, value: orDash(order.dcNo) },
          { label: F.dcDate, value: orDash(formatLongDate(order.dcDate)) },
        ]}
      />
      <N1Divider />
      <N1DetailGrid
        title={D.tabs.material}
        columns={2}
        testID="order-info-material"
        items={[
          { label: F.materialSource, value: orDash(source?.label ?? '') },
          { label: F.rmPartNumber, value: orDash(order.rmPartNumber) },
          { label: F.rawMaterialGrade, value: orDash(order.rawMaterialGrade) },
          { label: F.rawMaterialSize, value: orDash(order.rawMaterialSize) },
          { label: F.heatNumber, value: orDash(order.heatNumber) },
        ]}
      />
    </>
  );
});
