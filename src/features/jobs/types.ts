import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WorkOrder } from '../orders/types';
import type { QcKind } from './qc';

/** QC imports into the tab they were started from. */
type ImportParams = { qcKind?: QcKind } | undefined;

// Shop-floor job screens. The role navigator that hosts them registers these
// routes next to its tabs (My Jobs is the Jobs tab itself).
export type JobsStackParamList = {
  ScanJob: ImportParams;
  EnterJobCode: ImportParams;
  /** The work order behind a scanned or typed job code. */
  ImportOrder: { orderId: string };
  /** Mandatory raw material details; opens as a modal from the order. */
  /** retest: replacement material after RM QC rejected it (supervisor). */
  RawMaterial: { orderId: string; retest?: boolean };
  /** Operator / QC: the job's work order, read only (full screen modal). */
  OrderDetails: { orderId: string };
  /** The work order's drawing, full screen. */
  Drawing: { orderId: string };
  // Reused from the Job Cards feature, under the same names.
  JobCardDetails: { jobCardId: string; editFlow?: boolean };
  /** Operator: the job they run (start, pause, complete). */
  OperatorJob: { jobCardId: string };
  /** Operator: pick a machine, then start the operation. */
  AssignMachine: { jobCardId: string };
  /** QC: inspect a job, then pass or fail it. */
  QcCheck: { jobCardId: string; kind: QcKind };
  /** QC: why it failed (typed remarks; no voice notes in phase 1). */
  QcFail: { jobCardId: string; kind: QcKind };
};

export type JobsScreenProps<R extends keyof JobsStackParamList> =
  NativeStackScreenProps<JobsStackParamList, R>;

/**
 * A work order as the shop floor sees it: the order itself (supervisor), or
 * its job card's job view (operator, QC), which has no prices or client
 * details. Fields the job view lacks are left out.
 */
export type OrderView = Pick<
  WorkOrder,
  | 'id'
  | 'number'
  | 'customerName'
  | 'partName'
  | 'jobName'
  | 'description'
  | 'priority'
  | 'dueDate'
  | 'quantity'
  | 'partNumber'
  | 'drawingNumber'
  | 'poNumber'
  | 'routeCardNo'
  | 'materialSource'
> &
  Partial<
    Pick<
      WorkOrder,
      | 'status'
      | 'poAmount'
      | 'projectId'
      | 'shopOrderNumber'
      | 'dcNo'
      | 'dcDate'
      | 'rmPartNumber'
      | 'rawMaterialGrade'
      | 'rawMaterialSize'
      | 'heatNumber'
    >
  >;

export type RawMaterialInput = Pick<
  WorkOrder,
  | 'rawMaterialGrade'
  | 'rawMaterialSize'
  | 'heatNumber'
  | 'rmPartNumber'
  | 'materialSource'
>;
