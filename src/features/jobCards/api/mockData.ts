import { MOCK_ORDERS } from '../../orders/api/mockData';
import type { JobCard, JobOperation, OperationStatus } from '../types';
import { jobCardCode, statusFor } from '../utils';

type Seed = Pick<
  JobCard,
  | 'id'
  | 'customerId'
  | 'customerName'
  | 'partName'
  | 'jobName'
  | 'material'
  | 'quantity'
  | 'priority'
  | 'dueDate'
> &
  Partial<Omit<JobCard, 'status' | 'orderId' | 'number'>>;

const DAY = '2026-09-25';

/** Steps before `running` are done, then one running step, then pending. */
function route(
  id: string,
  steps: [name: string, machine: string, operator: string][],
  doneCount: number,
  current: OperationStatus = 'running',
): JobOperation[] {
  return steps.map(([name, machine, operator], i) => {
    const status: OperationStatus =
      i < doneCount ? 'completed' : i === doneCount ? current : 'pending';
    const started = status !== 'pending';
    return {
      id: `${id}-op${i + 1}`,
      name,
      machine: started ? machine : '',
      operator: started ? operator : '',
      status,
      startedAt: started ? `${DAY}T${pad(8 + i)}:30:00` : null,
      completedAt: status === 'completed' ? `${DAY}T${pad(9 + i)}:15:00` : null,
    };
  });
}

const pad = (n: number) => String(n).padStart(2, '0');

const pendingOp = (id: string, name: string): JobOperation => ({
  id,
  name,
  machine: '',
  operator: '',
  status: 'pending',
  startedAt: null,
  completedAt: null,
});

function card(seed: Seed): Omit<JobCard, 'code'> {
  const operations = seed.operations ?? [];
  // The job view's order details, as the server copies them in.
  const order = MOCK_ORDERS.find(o => o.id === seed.id);
  return {
    partNumber: order?.partNumber ?? '',
    drawingNumber: order?.drawingNumber ?? '',
    poNumber: order?.poNumber ?? '',
    routeCardNo: order?.routeCardNo ?? '',
    // The order's own seed uses the same number for its id and WO number.
    orderId: seed.id,
    number: seed.id,
    designFile: {
      id: 'design',
      name: 'drawing.pdf',
      kind: 'Design file',
      sizeBytes: 480 * 1024,
    },
    designApproval: 'approved',
    materialSource: 'bought_out',
    materialQc: 'accepted',
    quotation: 'accepted',
    billing: 'not_invoiced',
    ...seed,
    operations,
    status: statusFor(operations),
    // Material checks are raw material QC; the rest inspect a step.
    qcHistory: (seed.qcHistory ?? []).map(e => ({
      ...e,
      kind: e.operationId ? 'machine' : 'rm',
    })),
  };
}

const CARDS = [
  card({
    id: '1042',
    customerId: 'CUS-1',
    customerName: 'Acme Metalworks',
    partName: 'Bracket',
    jobName: 'Job A',
    material: 'MS Round Bar',
    quantity: 200,
    priority: 'high',
    dueDate: '2026-10-02',
    operations: [
      {
        id: '1042-op1',
        name: 'Cutting',
        machine: 'Saw-01',
        operator: 'Meena Lakshmi',
        status: 'completed',
        startedAt: `${DAY}T09:10:00`,
        completedAt: `${DAY}T09:45:00`,
      },
      {
        id: '1042-op2',
        name: 'Facing (Lathe)',
        machine: 'Lathe-01',
        operator: 'Ravi Kumar',
        status: 'completed',
        startedAt: `${DAY}T09:50:00`,
        completedAt: `${DAY}T10:20:00`,
      },
      {
        id: '1042-op3',
        name: 'Turning (Lathe)',
        machine: 'CNC-02',
        operator: 'Arun Prakash',
        status: 'running',
        startedAt: `${DAY}T10:25:00`,
        completedAt: null,
      },
      // Assigned ahead: a step needs its operator before it starts.
      {
        ...pendingOp('1042-op4', 'Deburring'),
        operator: 'Ravi Kumar',
        operatorId: 'USR-6',
      },
      pendingOp('1042-op5', 'Marking'),
      pendingOp('1042-op6', 'Final check'),
    ],
    qcHistory: [
      {
        id: 'qc1',
        stage: 'Material QC',
        result: 'accepted',
        remark: 'Voice + text note',
        at: '2026-09-24',
        inspector: 'Suresh Babu',
        report: {
          id: 'qc1-report',
          name: 'material-qc-report.pdf',
          kind: 'QC report',
          sizeBytes: 220 * 1024,
        },
      },
      {
        id: 'qc2',
        stage: 'Facing - QC',
        result: 'passed',
        remark: '',
        at: '2026-09-25',
        inspector: 'Divya Rao',
        operationId: '1042-op2',
      },
    ],
  }),
  card({
    id: '1040',
    customerId: 'CUS-2',
    customerName: 'Bright Steel Co.',
    partName: 'Bracket',
    jobName: 'Job B',
    material: 'MS Round Bar',
    quantity: 120,
    priority: 'high',
    dueDate: '2026-10-03',
    operations: route(
      '1040',
      [
        ['Cutting', 'Saw-01', 'Meena Lakshmi'],
        ['CNC Turning', 'CNC-04', 'Arun Prakash'],
        ['Deburring', 'Bench 2', 'Ravi Kumar'],
        ['Marking', 'Bench 1', 'Ravi Kumar'],
        ['QC Inspection', 'QC Bay 1', 'Suresh Babu'],
      ],
      4,
    ),
    qcHistory: [
      {
        id: 'qc1',
        stage: 'Material QC',
        result: 'accepted',
        remark: '',
        at: '2026-09-22',
        inspector: 'Suresh Babu',
      },
    ],
  }),
  card({
    id: '1037',
    customerId: 'CUS-1',
    customerName: 'Acme Metalworks',
    partName: 'Bracket',
    jobName: 'Job F',
    material: 'MS Round Bar',
    quantity: 200,
    priority: 'high',
    dueDate: '2026-10-10',
    operations: route(
      '1037',
      [
        ['Cutting', 'Saw-01', 'Meena Lakshmi'],
        ['Welding', 'Weld Station 1', 'Arun Prakash'],
        ['QC Inspection', 'QC Bay 2', 'Meena Lakshmi'],
        ['Packing', 'Pack Station 1', 'Suresh Babu'],
      ],
      1,
      // Cutting is done and passed QC, so Welding is ready to start: the
      // operator's Start opens Assign machine.
      'pending',
    ),
    qcHistory: [
      {
        id: 'qc1',
        stage: 'Cutting - QC',
        result: 'passed',
        remark: '',
        at: '2026-09-25',
        inspector: 'Divya Rao',
        operationId: '1037-op1',
      },
    ],
    quotation: 'pending',
  }),
  card({
    id: '1033',
    customerId: 'CUS-5',
    customerName: 'Meridian Components',
    partName: 'Shaft',
    jobName: 'Job J',
    material: 'EN8 Round Bar',
    quantity: 35,
    priority: 'high',
    dueDate: '2026-10-18',
    materialSource: 'in_house',
    operations: route(
      '1033',
      [
        ['Cutting', 'Saw-01', 'Meena Lakshmi'],
        ['CNC Turning', 'CNC-01', 'Divya Ramesh'],
        ['Drilling', 'Drill-01', 'Karthik Iyer'],
        ['QC Inspection', 'QC Bay 2', 'Meena Lakshmi'],
      ],
      3,
    ),
  }),
  card({
    id: '1039',
    customerId: 'CUS-3',
    customerName: 'Nova Fabrication',
    partName: 'Flange',
    jobName: 'Job C',
    material: 'SS Plate',
    quantity: 80,
    priority: 'medium',
    dueDate: '2026-10-05',
    // Raw material still waiting for its incoming inspection.
    materialQc: 'pending',
    operations: route(
      '1039',
      [
        ['Cutting', 'Saw-01', 'Meena Lakshmi'],
        ['CNC Milling', 'CNC-02', 'Karthik Iyer'],
        ['Drilling', 'Drill-01', 'Karthik Iyer'],
        ['Deburring', 'Bench 2', 'Ravi Kumar'],
        ['QC Inspection', 'QC Bay 1', 'Suresh Babu'],
      ],
      1,
    ),
  }),
  card({
    id: '1041',
    customerId: 'CUS-4',
    customerName: 'Silverline Industries',
    partName: 'Housing',
    jobName: 'Job D',
    material: 'Aluminium Billet',
    quantity: 50,
    priority: 'medium',
    dueDate: '2026-10-07',
    materialQc: 'rejected',
    qcHistory: [
      {
        id: 'qc1',
        stage: 'Material QC',
        result: 'rejected',
        remark: 'Billet diameter under tolerance; supplier to replace.',
        at: '2026-09-26',
        inspector: 'Divya Rao',
        rejectedMaterial: {
          grade: 'AL6061',
          heatNumber: 'HT-99212',
          size: '24.6mm dia x 200mm',
        },
      },
    ],
    operations: route(
      '1041',
      [
        ['Cutting', 'Saw-01', 'Meena Lakshmi'],
        ['CNC Milling', 'CNC-03', 'Karthik Iyer'],
        ['Welding', 'Weld Station 2', 'Divya Ramesh'],
        ['QC Inspection', 'QC Bay 1', 'Suresh Babu'],
        ['Packing', 'Pack Station 2', 'Meena Lakshmi'],
      ],
      2,
    ),
  }),
  card({
    id: '1036',
    customerId: 'CUS-2',
    customerName: 'Bright Steel Co.',
    partName: 'Coupling',
    jobName: 'Job G',
    material: 'Aluminium Billet',
    quantity: 60,
    priority: 'medium',
    dueDate: '2026-10-12',
    designApproval: 'pending',
    materialQc: 'pending',
    quotation: 'pending',
  }),
  card({
    id: '1034',
    customerId: 'CUS-4',
    customerName: 'Silverline Industries',
    partName: 'Housing',
    jobName: 'Job I',
    material: 'Aluminium Billet',
    quantity: 55,
    priority: 'medium',
    dueDate: '2026-10-16',
    operations: route(
      '1034',
      [
        ['Cutting', 'Saw-01', 'Meena Lakshmi'],
        ['CNC Milling', 'CNC-03', 'Karthik Iyer'],
        ['Drilling', 'Drill-01', 'Karthik Iyer'],
        ['Deburring', 'Bench 2', 'Ravi Kumar'],
        ['QC Inspection', 'QC Bay 1', 'Suresh Babu'],
      ],
      3,
      'paused',
    ),
  }),
  card({
    id: '1038',
    customerId: 'CUS-5',
    customerName: 'Meridian Components',
    partName: 'Shaft',
    jobName: 'Job E',
    material: 'EN8 Round Bar',
    quantity: 40,
    priority: 'low',
    dueDate: '2026-10-09',
    operations: route(
      '1038',
      [
        ['Cutting', 'Saw-01', 'Meena Lakshmi'],
        ['CNC Turning', 'CNC-01', 'Divya Ramesh'],
        ['Marking', 'Bench 1', 'Ravi Kumar'],
        ['QC Inspection', 'QC Bay 2', 'Meena Lakshmi'],
        ['Packing', 'Pack Station 1', 'Meena Lakshmi'],
      ],
      4,
    ),
  }),
  card({
    id: '1035',
    customerId: 'CUS-3',
    customerName: 'Nova Fabrication',
    partName: 'Flange',
    jobName: 'Job H',
    material: 'SS Plate',
    quantity: 90,
    priority: 'low',
    dueDate: '2026-10-14',
    operations: route(
      '1035',
      [
        ['Cutting', 'Saw-01', 'Meena Lakshmi'],
        ['CNC Milling', 'CNC-02', 'Karthik Iyer'],
        ['QC Inspection', 'QC Bay 1', 'Suresh Babu'],
        ['Packing', 'Pack Station 2', 'Suresh Babu'],
      ],
      4,
    ),
    billing: 'invoiced',
  }),
];

/** Numbered JOB1, JOB2… in list order. */
export const MOCK_JOB_CARDS: JobCard[] = CARDS.map((c, i) => ({
  ...c,
  code: jobCardCode(i + 1),
}));
