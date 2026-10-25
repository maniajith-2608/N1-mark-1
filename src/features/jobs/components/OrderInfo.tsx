import { memo } from 'react';
import { N1DetailGrid, N1Divider } from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { formatCurrency, formatLongDate } from '../../../shared/utils';
import { MATERIAL_SOURCE_OPTIONS, ORDER_STRINGS } from '../../orders';
import type { OrderView } from '../types';

const D = ORDER_STRINGS.details;
const F = ORDER_STRINGS.form;
const orDash = (v: string) => v || COMMON_STRINGS.dash;

/** Label / value rows, leaving out what this view of the order lacks. */
const rows = (items: { label: string; value: string | undefined }[]) =>
  items.flatMap(({ label, value }) =>
    value === undefined ? [] : [{ label, value: orDash(value) }],
  );

/**
 * The work order's Overview, Dispatch and Raw material, two columns each
 * like the admin order (Order, Order Details). The drawing sits in
 * OrderSummaryTile above them. The job view (operator, QC) has no PO amount
 * or raw material details, so those rows are left out.
 */
export const OrderInfo = memo(function OrderInfoComponent({
  order,
}: {
  order: OrderView;
}) {
  const source = MATERIAL_SOURCE_OPTIONS.find(
    o => o.value === order.materialSource,
  );
  const material = rows([
    { label: F.materialSource, value: source?.label ?? '' },
    { label: F.rmPartNumber, value: order.rmPartNumber },
    { label: F.rawMaterialGrade, value: order.rawMaterialGrade },
    { label: F.rawMaterialSize, value: order.rawMaterialSize },
    { label: F.heatNumber, value: order.heatNumber },
  ]);
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
          ...rows([
            { label: D.dueDate, value: formatLongDate(order.dueDate) },
            { label: F.partName, value: order.partName },
            { label: F.partNumber, value: order.partNumber },
            { label: F.drawingNumber, value: order.drawingNumber },
            { label: F.poNumber, value: order.poNumber },
          ]),
          // Prices are for the office: the job view has none.
          ...(order.poAmount === undefined
            ? []
            : [
                {
                  label: F.poAmount,
                  value:
                    order.poAmount == null
                      ? COMMON_STRINGS.dash
                      : formatCurrency(order.poAmount),
                },
              ]),
          ...rows([
            { label: F.projectId, value: order.projectId },
            { label: F.shopOrderNumber, value: order.shopOrderNumber },
          ]),
        ]}
      />
      <N1Divider />
      <N1DetailGrid
        title={D.dispatch}
        columns={2}
        testID="order-info-dispatch"
        items={rows([
          { label: F.routeCardNo, value: order.routeCardNo },
          { label: F.dcNo, value: order.dcNo },
          {
            label: F.dcDate,
            value:
              order.dcDate === undefined
                ? undefined
                : formatLongDate(order.dcDate),
          },
        ])}
      />
      <N1Divider />
      <N1DetailGrid
        title={D.tabs.material}
        columns={2}
        testID="order-info-material"
        items={material}
      />
    </>
  );
});
