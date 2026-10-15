import { DAY_MS, HOUR_MS, isoAgo } from '../../../services/mock/mockServer';
import type { WorkOrder } from '../types';

type Seed = Pick<
  WorkOrder,
  | 'id'
  | 'customerId'
  | 'customerName'
  | 'partName'
  | 'jobName'
  | 'quantity'
  | 'priority'
  | 'status'
  | 'dueDate'
> &
  Partial<WorkOrder> & {
    /** Seed only: picks the raw material grade. */
    material: string;
  };

const CUSTOMER_EMAILS: Record<string, string> = {
  'CUS-1': 'accounts@acmemetalworks.com',
  'CUS-2': 'purchase@brightsteel.in',
  'CUS-3': 'orders@novafab.co.in',
  'CUS-4': 'accounts@silverline.in',
  'CUS-5': '',
};

const GRADES: Record<string, string> = {
  'MS Round Bar': 'MS',
  'EN8 Round Bar': 'EN8',
  'SS Plate': 'SS304',
  'Aluminium Billet': 'AL6061',
};

function order({ material, ...seed }: Seed): WorkOrder {
  const n = Number(seed.id);
  const createdAt = seed.createdAt ?? '2026-09-10T09:00:00';
  return {
    customerEmail: CUSTOMER_EMAILS[seed.customerId] ?? '',
    description: `${seed.partName} — ${seed.jobName}`,
    poNumber: `PO-${8800 + (n % 100)}`,
    poAmount: 50000 + (n % 10) * 5000,
    routeCardNo: `RC-${2168 + n - 1000}`,
    dcNo: `DC-${5519 + n - 1000}`,
    dcDate: '2026-09-24',
    partNumber: `PN-${32979 + n - 1000}`,
    drawingNumber: `DRW-${1145 + n - 1000}`,
    rmPartNumber: `RM-${4050 + n - 1000}`,
    shopOrderNumber: `SO-${7692 + n - 1000}`,
    rawMaterialSize: '25mm dia x 200mm',
    heatNumber: `HT-${99171 + n - 1000}`,
    projectId: `PRJ-${76 + n - 1000}`,
    rawMaterialGrade: GRADES[material] ?? '',
    materialSource: '',
    quoteId: '',
    notes: '',
    designFile: {
      id: 'design',
      name: 'drawing.pdf',
      kind: 'Design file',
      sizeBytes: 480 * 1024,
    },
    documents: [
      {
        id: 'po',
        name: `PO-${8800 + (n % 100)}_project-docs.pdf`,
        kind: 'Purchase order',
        sizeBytes: 640 * 1024,
      },
    ],
    statusHistory: [
      {
        id: 'h1',
        label: 'Order created',
        detail: 'Koushik Dasarathan',
        at: createdAt,
        tone: 'neutral',
      },
    ],
    ...seed,
    createdAt,
  };
}

export const MOCK_ORDERS: WorkOrder[] = [
  order({
    id: '1042',
    customerId: 'CUS-1',
    customerName: 'Acme Metalworks',
    partName: 'Bracket',
    jobName: 'Job A',
    material: 'MS Round Bar',
    quantity: 200,
    priority: 'high',
    status: 'in_progress',
    dueDate: '2026-10-02',
    poNumber: 'PO-8842',
    routeCardNo: 'RC-2210',
    dcNo: 'DC-5561',
    partNumber: 'PN-33021',
    drawingNumber: 'DRW-1187',
    rmPartNumber: 'RM-4092',
    shopOrderNumber: 'SO-7734',
    heatNumber: 'HT-99213',
    projectId: 'PRJ-118',
    rawMaterialGrade: 'EN8',
    materialSource: 'bought_out',
    createdAt: isoAgo(6 * DAY_MS),
    notes:
      'Rework batch — confirm bore tolerance before moving to welding. Customer requested delivery ahead of the 05 Oct dispatch run.',
    documents: [
      {
        id: 'po',
        name: 'PO-8842_project-docs.pdf',
        kind: 'Purchase order',
        sizeBytes: 640 * 1024,
      },
    ],
    statusHistory: [
      {
        id: 'h3',
        label: 'Moved to CNC Turning',
        detail: 'CNC-04 · Arun Prakash',
        at: isoAgo(2 * HOUR_MS),
        tone: 'info',
      },
      {
        id: 'h2',
        label: 'Cleared QC — batch 1',
        detail: 'QC Bay 1',
        at: isoAgo(DAY_MS),
        tone: 'warning',
      },
      {
        id: 'h1',
        label: 'Order created',
        detail: 'Koushik Dasarathan',
        at: isoAgo(6 * DAY_MS),
        tone: 'neutral',
      },
    ],
  }),
  order({
    id: '1040',
    customerId: 'CUS-2',
    customerName: 'Bright Steel Co.',
    partName: 'Bracket',
    jobName: 'Job B',
    material: 'MS Round Bar',
    quantity: 120,
    priority: 'high',
    status: 'in_progress',
    dueDate: '2026-10-03',
    createdAt: isoAgo(4 * DAY_MS),
  }),
  order({
    id: '1037',
    customerId: 'CUS-1',
    customerName: 'Acme Metalworks',
    partName: 'Bracket',
    jobName: 'Job F',
    material: 'MS Round Bar',
    quantity: 200,
    priority: 'high',
    status: 'in_progress',
    dueDate: '2026-10-10',
  }),
  order({
    id: '1033',
    customerId: 'CUS-5',
    customerName: 'Meridian Components',
    partName: 'Shaft',
    jobName: 'Job J',
    material: 'EN8 Round Bar',
    quantity: 35,
    priority: 'high',
    status: 'in_progress',
    dueDate: '2026-10-18',
  }),
  order({
    id: '1039',
    customerId: 'CUS-3',
    customerName: 'Nova Fabrication',
    partName: 'Flange',
    jobName: 'Job C',
    material: 'SS Plate',
    quantity: 80,
    priority: 'medium',
    status: 'in_progress',
    dueDate: '2026-10-05',
  }),
  order({
    id: '1041',
    customerId: 'CUS-4',
    customerName: 'Silverline Industries',
    partName: 'Housing',
    jobName: 'Job D',
    material: 'Aluminium Billet',
    quantity: 50,
    priority: 'medium',
    status: 'in_progress',
    dueDate: '2026-10-07',
    createdAt: isoAgo(2 * DAY_MS),
  }),
  order({
    id: '1036',
    customerId: 'CUS-2',
    customerName: 'Bright Steel Co.',
    partName: 'Coupling',
    jobName: 'Job G',
    material: 'Aluminium Billet',
    quantity: 60,
    priority: 'medium',
    status: 'in_progress',
    dueDate: '2026-10-12',
  }),
  order({
    id: '1034',
    customerId: 'CUS-4',
    customerName: 'Silverline Industries',
    partName: 'Housing',
    jobName: 'Job I',
    material: 'Aluminium Billet',
    quantity: 55,
    priority: 'medium',
    status: 'in_progress',
    dueDate: '2026-10-16',
  }),
  order({
    id: '1038',
    customerId: 'CUS-5',
    customerName: 'Meridian Components',
    partName: 'Shaft',
    jobName: 'Job E',
    material: 'EN8 Round Bar',
    quantity: 40,
    priority: 'low',
    status: 'completed',
    dueDate: '2026-10-09',
  }),
  order({
    id: '1035',
    customerId: 'CUS-3',
    customerName: 'Nova Fabrication',
    partName: 'Flange',
    jobName: 'Job H',
    material: 'SS Plate',
    quantity: 90,
    priority: 'low',
    status: 'completed',
    dueDate: '2026-10-14',
  }),
  // Billed on INV-2026-0125 (job WO-00125): the invoice's job link opens it.
  // ABC Engineering isn't in Customers, so there's no customer to link.
  order({
    id: '125',
    customerId: '',
    customerName: 'ABC Engineering',
    partName: 'Machined Shaft',
    jobName: 'Job A',
    material: 'EN8 Round Bar',
    quantity: 150,
    priority: 'medium',
    status: 'completed',
    dueDate: '2026-10-08',
    routeCardNo: 'RC-2225',
    projectId: 'PRJ-25',
    createdAt: '2026-09-20T09:00:00',
  }),
  // New orders without a job card yet (Job Cards has none for them).
  order({
    id: '1043',
    customerId: 'CUS-1',
    customerName: 'Acme Metalworks',
    partName: 'Spindle',
    jobName: 'Job K',
    material: 'MS Round Bar',
    quantity: 150,
    priority: 'high',
    status: 'new',
    dueDate: '2026-10-20',
    createdAt: '2026-10-04T10:30:00',
  }),
  order({
    id: '1044',
    customerId: 'CUS-2',
    customerName: 'Bright Steel Co.',
    partName: 'Gear Blank',
    jobName: 'Job L',
    material: 'EN8 Round Bar',
    quantity: 75,
    priority: 'medium',
    status: 'new',
    dueDate: '2026-10-22',
    createdAt: '2026-10-05T09:15:00',
  }),
];
