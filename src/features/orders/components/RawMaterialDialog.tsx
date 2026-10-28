import { useCallback, useEffect } from 'react';
import {
  FormFooter,
  FormRow,
  N1Modal,
  N1RadioGroup,
  N1Text,
  N1TextInput,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import {
  useForm,
  useHeldWhileVisible,
  useOnSettled,
  type FormErrors,
} from '../../../shared/hooks';
import { isBlank } from '../../../shared/utils';
import { MATERIAL_SOURCE_OPTIONS, ORDER_STRINGS } from '../constants';
import { useAppSelector } from '../../../app/store/hooks';
import { useJobCardCommands } from '../../jobCards/hooks/useJobCards';
import { useOrders } from '../hooks/useOrders';
import { selectOrderById } from '../store/selectors';
import type { WorkOrder } from '../types';
import { RAW_MATERIAL_FIELDS } from './orderForm';

const F = ORDER_STRINGS.form;
const D = ORDER_STRINGS.details;

type RawMaterial = Pick<WorkOrder, (typeof RAW_MATERIAL_FIELDS)[number]>;

const valuesOf = (o?: WorkOrder | null): RawMaterial => ({
  materialSource: o?.materialSource ?? '',
  rmPartNumber: o?.rmPartNumber ?? '',
  rawMaterialSize: o?.rawMaterialSize ?? '',
  heatNumber: o?.heatNumber ?? '',
  rawMaterialGrade: o?.rawMaterialGrade ?? '',
});

/** Every raw material detail is needed before a job card is made. */
const validate = (v: RawMaterial): FormErrors<RawMaterial> => {
  const errors: FormErrors<RawMaterial> = {};
  RAW_MATERIAL_FIELDS.forEach(key => {
    if (isBlank(v[key])) {
      errors[key] = COMMON_STRINGS.required;
    }
  });
  return errors;
};

/** True when the order is missing any raw material detail. */
export const isRawMaterialMissing = (o: WorkOrder) =>
  RAW_MATERIAL_FIELDS.some(key => isBlank(o[key]));

type Props = {
  visible: boolean;
  order: WorkOrder | null;
  onClose: () => void;
  /**
   * The order's job card, which the details are saved on. Blank for an order
   * without one: Create job card saves them on the order (updateOrder), and
   * the server opens its card (FE-007).
   */
  jobCardId: string;
  /** The details are saved; with the order's job card, new or not. */
  onSaved: (jobCardId: string) => void;
};

/**
 * Raw material for an order: collect it (prefilled with what the order has)
 * and save it on the job card (saveJobCardRawMaterial), which also fills it
 * in on the order, or on an order without a card, which opens one. RM QC
 * then inspects it.
 */
export function RawMaterialDialog({
  visible,
  order: orderProp,
  jobCardId,
  onClose,
  onSaved,
}: Props) {
  // Kept while the dialog fades out.
  const order = useHeldWhileVisible(visible, orderProp);
  const creating = !jobCardId;
  const commands = useJobCardCommands();
  const orders = useOrders();
  const { saving, saveError } = creating ? orders : commands;
  // The order as saved: Create job card links its new card.
  const savedJobCardId = useAppSelector(state =>
    order ? selectOrderById(state, order.id)?.jobCardId ?? '' : '',
  );
  const form = useForm<RawMaterial>(valuesOf(order), validate);
  const { reset, values, errors, bind } = form;

  const clearCommandErrors = commands.clearErrors;
  const clearOrderErrors = orders.clearErrors;
  useEffect(() => {
    if (visible) {
      reset(valuesOf(order));
      clearCommandErrors();
      clearOrderErrors();
    }
  }, [visible, order, reset, clearCommandErrors, clearOrderErrors]);

  useOnSettled(saving, saveError, () => {
    if (visible) {
      onSaved(creating ? savedJobCardId : jobCardId);
    }
  });

  const { run } = commands;
  const { update } = orders;
  const orderId = order?.id;
  const save = useCallback(
    (v: RawMaterial) => {
      const rawMaterial = {
        materialSource: v.materialSource,
        rmPartNumber: v.rmPartNumber.trim(),
        rawMaterialSize: v.rawMaterialSize.trim(),
        heatNumber: v.heatNumber.trim(),
        rawMaterialGrade: v.rawMaterialGrade.trim(),
      };
      if (!jobCardId) {
        if (orderId) {
          update(orderId, rawMaterial);
        }
      } else {
        run(jobCardId, { type: 'rawMaterial', rawMaterial });
      }
    },
    [jobCardId, orderId, run, update],
  );
  const workOrder = ORDER_STRINGS.workOrder(order?.number ?? '');

  const text = (
    key: Exclude<keyof RawMaterial, 'materialSource'>,
    label: string,
    placeholder: string,
  ) => (
    <N1TextInput
      label={label}
      required
      placeholder={placeholder}
      value={values[key]}
      onChangeText={bind(key)}
      errorText={errors[key]}
      testID={`rm-dialog-${key}`}
    />
  );

  return (
    <N1Modal
      visible={visible}
      onClose={onClose}
      title={creating ? D.createJobCard : D.rawMaterialTitle}
      subtitle={
        creating ? D.createJobCardHelp(workOrder) : D.rawMaterialHelp(workOrder)
      }
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={creating ? D.createJobCard : D.rawMaterialSubmit}
          onSubmit={form.submit(save)}
          loading={saving}
          submitTestID="rm-dialog-submit"
        />
      }
      testID="rm-dialog"
    >
      <N1RadioGroup
        label={F.materialSource}
        required
        options={MATERIAL_SOURCE_OPTIONS}
        value={values.materialSource || null}
        onChange={bind('materialSource')}
        errorText={errors.materialSource}
      />
      <FormRow>
        {text('rmPartNumber', F.rmPartNumber, F.rmPartNumberPlaceholder)}
        {text(
          'rawMaterialSize',
          F.rawMaterialSize,
          F.rawMaterialSizePlaceholder,
        )}
      </FormRow>
      <FormRow>
        {text('heatNumber', F.heatNumber, F.heatNumberPlaceholder)}
        {text(
          'rawMaterialGrade',
          F.rawMaterialGrade,
          F.rawMaterialGradePlaceholder,
        )}
      </FormRow>
      {saveError && (
        <N1Text variant="small" color="danger">
          {saveError}
        </N1Text>
      )}
    </N1Modal>
  );
}
