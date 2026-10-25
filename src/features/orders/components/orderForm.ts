import type { FormErrors } from '../../../shared/hooks';
import type { Attachment } from '../../../shared/types';
import {
  isBlank,
  isDisplayDate,
  isEmail,
  isNumeric,
  parseDisplayDate,
  toDisplayDate,
} from '../../../shared/utils';
import { COMMON_STRINGS } from '../../../shared/constants';
import { ORDER_STRINGS } from '../constants';
import type {
  MaterialSource,
  OrderInput,
  OrderPriority,
  WorkOrder,
} from '../types';

/** Form state: every field is text so partial input (e.g. "12/0") survives. */
export type OrderFormValues = {
  designFile: Attachment | null;
  purchaseOrder: Attachment | null;
  /** Set when the name matches a saved customer; blank for a new name. */
  customerId: string;
  /** As typed or picked. */
  customerName: string;
  customerEmail: string;
  poNumber: string;
  /** Rupees, as typed; blank when not known yet. */
  poAmount: string;
  quantity: string;
  description: string;
  priority: OrderPriority | '';
  deliveryDate: string;
  dcNo: string;
  dcDate: string;
  partName: string;
  partNumber: string;
  drawingNumber: string;
  rmPartNumber: string;
  shopOrderNumber: string;
  rawMaterialSize: string;
  heatNumber: string;
  projectId: string;
  rawMaterialGrade: string;
  materialSource: MaterialSource | '';
  /** Form only: the material is in, so its details are required. */
  rawMaterialArrived: boolean;
};

export const EMPTY_ORDER_FORM: OrderFormValues = {
  designFile: null,
  purchaseOrder: null,
  customerId: '',
  customerName: '',
  customerEmail: '',
  poNumber: '',
  poAmount: '',
  quantity: '',
  description: '',
  priority: 'low',
  deliveryDate: '',
  dcNo: '',
  dcDate: '',
  partName: '',
  partNumber: '',
  drawingNumber: '',
  rmPartNumber: '',
  shopOrderNumber: '',
  rawMaterialSize: '',
  heatNumber: '',
  projectId: '',
  rawMaterialGrade: '',
  materialSource: '',
  rawMaterialArrived: false,
};

/** Required once the raw material is marked as arrived. */
export const RAW_MATERIAL_FIELDS = [
  'materialSource',
  'rmPartNumber',
  'rawMaterialSize',
  'heatNumber',
  'rawMaterialGrade',
] as const satisfies (keyof OrderFormValues & keyof WorkOrder)[];

export function orderToFormValues(order?: WorkOrder): OrderFormValues {
  if (!order) {
    return EMPTY_ORDER_FORM;
  }
  return {
    designFile: order.designFile,
    purchaseOrder: order.documents[0] ?? null,
    customerId: order.customerId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    poNumber: order.poNumber,
    poAmount: order.poAmount == null ? '' : String(order.poAmount),
    quantity: order.quantity ? String(order.quantity) : '',
    description: order.description,
    priority: order.priority,
    deliveryDate: toDisplayDate(order.dueDate),
    dcNo: order.dcNo,
    dcDate: toDisplayDate(order.dcDate),
    partName: order.partName,
    partNumber: order.partNumber,
    drawingNumber: order.drawingNumber,
    rmPartNumber: order.rmPartNumber,
    shopOrderNumber: order.shopOrderNumber,
    rawMaterialSize: order.rawMaterialSize,
    heatNumber: order.heatNumber,
    projectId: order.projectId,
    rawMaterialGrade: order.rawMaterialGrade,
    materialSource: order.materialSource,
    rawMaterialArrived: RAW_MATERIAL_FIELDS.every(key => !isBlank(order[key])),
  };
}

/** The form's steps, in order, and the fields each one holds. */
export const ORDER_FORM_STEPS: (keyof OrderFormValues)[][] = [
  [
    'designFile',
    'purchaseOrder',
    'customerId',
    'customerName',
    'customerEmail',
  ],
  [
    'poNumber',
    'poAmount',
    'quantity',
    'partName',
    'partNumber',
    'drawingNumber',
    'projectId',
    'shopOrderNumber',
    'dcNo',
    'dcDate',
    'priority',
    'deliveryDate',
    'description',
  ],
  ['rawMaterialArrived', ...RAW_MATERIAL_FIELDS],
];

/**
 * Text fields filled in on every order (the form marks them with *). The
 * design file is required too.
 */
export const REQUIRED_ORDER_FIELDS = [
  'customerName',
  'poNumber',
  'quantity',
  'partName',
  'drawingNumber',
  'deliveryDate',
  'dcDate',
] as const satisfies (keyof OrderFormValues)[];

/** Required fields, then format checks on the rest. */
export function validateOrderForm(
  v: OrderFormValues,
): FormErrors<OrderFormValues> {
  const errors: FormErrors<OrderFormValues> = {};
  if (!v.designFile) {
    errors.designFile = COMMON_STRINGS.required;
  }
  [
    ...REQUIRED_ORDER_FIELDS,
    ...(v.rawMaterialArrived ? RAW_MATERIAL_FIELDS : []),
  ].forEach(key => {
    if (isBlank(v[key])) {
      errors[key] = COMMON_STRINGS.required;
    }
  });
  // An order is made for a saved customer; new ones are added first.
  if (!isBlank(v.customerName) && !v.customerId) {
    errors.customerName = ORDER_STRINGS.form.pickCustomer;
  }
  if (!isBlank(v.customerEmail) && !isEmail(v.customerEmail)) {
    errors.customerEmail = COMMON_STRINGS.invalidEmail;
  }
  // The server needs at least one piece.
  if (
    !isBlank(v.quantity) &&
    (!isNumeric(v.quantity) ||
      !Number.isInteger(Number(v.quantity)) ||
      Number(v.quantity) < 1)
  ) {
    errors.quantity = COMMON_STRINGS.invalidNumber;
  }
  if (
    !isBlank(v.poAmount) &&
    (!isNumeric(v.poAmount) || Number(v.poAmount) < 0)
  ) {
    errors.poAmount = COMMON_STRINGS.invalidNumber;
  }
  if (!isBlank(v.deliveryDate) && !isDisplayDate(v.deliveryDate)) {
    errors.deliveryDate = ORDER_STRINGS.form.invalidDate;
  }
  if (!isBlank(v.dcDate) && !isDisplayDate(v.dcDate)) {
    errors.dcDate = ORDER_STRINGS.form.invalidDate;
  }
  return errors;
}

/** Whether this step (1-based) has a problem; later steps can't block Next. */
export const hasStepErrors = (step: number, v: OrderFormValues) => {
  const errors = validateOrderForm(v);
  return ORDER_FORM_STEPS[step - 1].some(key => errors[key]);
};

/** The first step (1-based) with a problem, else the last step. */
export const firstStepWithErrors = (v: OrderFormValues) => {
  const index = ORDER_FORM_STEPS.findIndex((_, i) => hasStepErrors(i + 1, v));
  return index < 0 ? ORDER_FORM_STEPS.length : index + 1;
};

const DEFAULT_PRIORITY: OrderPriority = 'low';

/**
 * Form values → API input. A blank part name falls back to the description's
 * first line; editing keeps the original job name unless the description
 * changed.
 */
export function formValuesToOrderInput(
  v: OrderFormValues,
  existing?: WorkOrder,
): OrderInput {
  const description = v.description.trim();
  const keepNames = existing && existing.description === description;
  return {
    customerId: v.customerId,
    customerName: v.customerName.trim(),
    customerEmail: v.customerEmail.trim(),
    partName:
      v.partName.trim() ||
      (keepNames ? existing.partName : description.split('\n')[0]),
    jobName: keepNames ? existing.jobName : '',
    description,
    quantity: isNumeric(v.quantity) ? Number(v.quantity) : 0,
    priority: v.priority || DEFAULT_PRIORITY,
    dueDate: parseDisplayDate(v.deliveryDate) ?? '',
    poNumber: v.poNumber.trim(),
    // Blank means not known yet.
    poAmount: isNumeric(v.poAmount) ? Number(v.poAmount) : null,
    // Not on the form: the route card comes with the order's job card.
    routeCardNo: existing?.routeCardNo ?? '',
    dcNo: v.dcNo.trim(),
    dcDate: parseDisplayDate(v.dcDate) ?? '',
    partNumber: v.partNumber.trim(),
    drawingNumber: v.drawingNumber.trim(),
    rmPartNumber: v.rmPartNumber.trim(),
    shopOrderNumber: v.shopOrderNumber.trim(),
    rawMaterialSize: v.rawMaterialSize.trim(),
    heatNumber: v.heatNumber.trim(),
    projectId: v.projectId.trim(),
    rawMaterialGrade: v.rawMaterialGrade.trim(),
    materialSource: v.materialSource,
    quoteId: existing?.quoteId ?? '',
    notes: existing?.notes ?? '',
    designFile: v.designFile,
    // The form edits the first (purchase order) document; any others are kept.
    documents: [
      ...(v.purchaseOrder ? [v.purchaseOrder] : []),
      ...(existing?.documents.slice(1) ?? []),
    ],
  };
}
