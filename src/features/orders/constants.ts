import type { N1DropDownOption, N1RadioOption } from '../../shared/components';
import type { StatusMeta } from '../../shared/types';
import type { MaterialSource, OrderPriority, OrderStatus } from './types';

/**
 * A work order number as the app writes it: the server's "WO-12" (or a bare
 * "12") reads "WO #12". Display only; never parsed back into an id.
 */
export const workOrderLabel = (number: string) =>
  `WO #${number.replace(/^WO-?/i, '')}`;

export const ORDER_STRINGS = {
  title: 'Orders',
  subtitle:
    'Every work order on the shop floor, sorted by priority and due date.',
  create: 'Create',
  createA11y: 'Create order',
  search: 'Search by WO #, part or customer',
  noun: 'orders',
  priorityFilter: 'Priority',
  statusFilter: 'Status',
  columns: {
    order: 'Work order / Part',
    customer: 'Customer',
    poNumber: 'PO number',
    rcNumber: 'RC number',
    priority: 'Priority',
    status: 'Status',
    due: 'Due date',
    actions: 'Actions',
  },
  /** Each takes the order's work order number. */
  a11y: {
    edit: (number: string) => `Edit order ${workOrderLabel(number)}`,
    createJobCard: (number: string) =>
      `Create job card for ${workOrderLabel(number)}`,
    openJobCard: (number: string) =>
      `Open job card for ${workOrderLabel(number)}`,
  },
  workOrder: workOrderLabel,
  /** Labels for the order details encoded under the WO number in its QR code. */
  qr: {
    customer: 'Customer',
    part: 'Part',
    partNumber: 'Part no',
    drawingNumber: 'Drawing no',
    poNumber: 'PO no',
    quantity: 'Qty',
    dueDate: 'Due',
  },
  quantity: (n: number) => `${n} pcs`,
  due: (date: string) => `Due ${date}`,
  /** Printed pages: the drawing sheet and document sheets. */
  print: {
    drawingJob: (heading: string) => `Drawing · ${heading}`,
  },
  details: {
    title: 'Order details',
    edit: 'Edit order',
    priority: (label: string) => `${label} priority`,
    details: 'Details',
    quantity: 'Quantity',
    dueDate: 'Due date',
    additional: 'Additional details',
    drawing: 'Drawing',
    drawingNo: 'Drawing no',
    printDrawing: 'Print drawing with QR',
    printDrawingOf: (name: string) => `Print ${name} with QR`,
    qrA11y: (number: string) => `QR code for ${workOrderLabel(number)}`,
    documents: 'Documents',
    noDocuments: 'No documents attached.',
    download: (name: string) => `Download ${name}`,
    view: (name: string) => `View ${name}`,
    printFile: (name: string) => `Print ${name}`,
    viewDrawing: 'View drawing',
    viewDrawingOf: (no: string) => `View drawing ${no}`,
    noDrawing: 'No drawing attached',
    drawingTitle: (no: string) => `Drawing ${no}`,
    previewQr: 'Preview with QR',
    previewQrTitle: (no: string) => `Drawing ${no} with QR`,
    previewQrPage: (page: number) => `Page ${page} with the order QR`,
    previewQrUnavailable:
      'This file can’t be previewed with the QR. It prints as a sheet with the drawing details and QR.',
    previewQrCrowded: (pages: string) =>
      `No blank area fits the QR on page ${pages}, so it covers a little of the drawing there.`,
    orderQr: 'Order QR',
    orderQrA11y: (workOrder: string) => `QR code for ${workOrder}`,
    orderQrFile: (number: string) =>
      `WO-${number.replace(/^WO-?/i, '')}-QR.png`,
    print: 'Print',
    printAction: 'Printing documents',
    downloadDocument: 'Download',
    openInNewTab: 'Open in new tab',
    viewerOpenHelp: 'This file opens in its own tab.',
    viewerUnavailable:
      'A preview of this file will show here once the backend stores uploaded files.',
    downloadAction: 'Downloading documents',
    routeCard: 'Route card',
    routeCardHelp:
      'See the full routing sequence, sign-offs and QC checkpoints logged for this work order.',
    viewRouteCard: 'View route card',
    statusHistory: 'Status history',
    notes: 'Notes',
    notFound: 'This order no longer exists.',
    drawingA11y: (no: string) => `Drawing ${no}`,
    backToOrders: 'Back to orders',
    backToCustomer: 'Back to customer',
    backToJobCard: 'Back to job card',
    backToInvoice: 'Back to invoice',
    tabs: {
      details: 'Order details',
      material: 'Raw material',
      documents: 'Documents',
      jobCard: 'Job card details',
    },
    /** Opens the raw material dialog while details are missing. */
    addRawMaterial: 'Add raw material',
    rawMaterialTitle: 'Raw material details',
    rawMaterialHelp: (workOrder: string) =>
      `${workOrder} is missing some raw material details. Fill them in so RM QC can inspect the material.`,
    rawMaterialSubmit: 'Save raw material',
    /** An order without a job card: its raw material opens the card. */
    createJobCard: 'Create job card',
    createJobCardHelp: (workOrder: string) =>
      `Enter the raw material details for ${workOrder}. Its job card is created once they are saved.`,
    jobCards: 'Job cards',
    noJobCard: 'No job card',
    noJobCardHelp:
      'An order gets its job card once its raw material details are entered. Use Create job card to enter them.',
    jobCardNow: (where: string) => `Now: ${where}`,
    jobCardNoFlow: 'No process steps yet — open it to plan the flow.',
    openJobCard: (number: string) => `Open job card ${workOrderLabel(number)}`,
    overview: 'Overview',
    dispatch: 'Dispatch',
    billingSection: 'Quotation & billing',
    quotation: 'Quotation',
    billing: 'Billing',
    description: 'Description',
    customer: 'Customer details',
    viewCustomer: 'View customer',
    customerName: 'Name',
    email: 'Email',
    mobile: 'Phone number',
    materialArrived: 'Arrived',
    materialPending: 'Pending',
    materialPendingHelp:
      'Some raw material details are still missing; the shop floor fills them in when the material arrives.',
  },
  form: {
    createTitle: 'Create order',
    createSubtitle: 'Add a new work order for the shop floor.',
    editTitle: 'Edit order',
    editSubtitle: (number: string) =>
      `Update ${workOrderLabel(number)}'s details.`,
    /** The stepper, in order. */
    steps: ['Customer', 'Order details'],
    stepOf: (n: number, total: number, label: string) =>
      `Step ${n} of ${total} · ${label}`,
    stepA11y: (n: number, label: string) => `Step ${n}: ${label}`,
    backToOrders: 'Back to orders',
    backToOrder: 'Back to order',
    scrollForMore: 'Scroll for more fields',
    customerSection: 'Customer & requirement',
    orderSection: 'Order details',
    materialSource: 'Material source',
    next: 'Next and Continue',
    back: 'Back',
    submitCreate: 'Create order',
    submitEdit: 'Save changes',
    designFile: 'Design files',
    designHint: 'Click or drop design files (PDF, DWG, STEP)',
    designHintCompact: 'Upload design files',
    addDesignFile: 'Add another design file',
    designSample: 'bracket-drawing.pdf',
    /** File types the design file chooser offers. */
    designAccept: '.pdf,.dwg,.dxf,.step,.stp,image/*',
    purchaseOrder: 'Purchase order',
    poHint: 'Click or drop PO & project documents (PDF, DOCX, XLSX)',
    poHintCompact: 'Upload PO & project documents',
    poSample: 'purchase-order.pdf',
    poKind: 'Purchase order',
    poAccept: '.pdf,.doc,.docx,.xls,.xlsx,image/*',
    customer: 'Customer',
    customerPlaceholder: 'Search or type a customer name',
    /** An order is made for a saved customer; a new name is created first. */
    pickCustomer: 'Not one of your customers yet. Create them to continue.',
    createCustomer: (name: string) => `Create customer "${name}"`,
    /** Edit: an order keeps its customer. */
    customerLocked: 'An order keeps its customer.',
    customerEmail: 'Customer email',
    customerEmailPlaceholder: 'accounts@company.com',
    poNumber: 'PO number',
    poNumberPlaceholder: 'e.g. PO-8842',
    poAmount: 'PO amount',
    poAmountPlaceholder: 'e.g. 120000',
    quantity: 'Quantity',
    quantityPlaceholder: 'e.g. 200',
    description: 'Part / job description',
    descriptionPlaceholder: 'Describe the part or job…',
    priority: 'Priority',
    priorityPlaceholder: 'Select priority',
    deliveryDate: 'Delivery date',
    datePlaceholder: 'DD/MM/YYYY',
    invalidDate: 'Use DD/MM/YYYY',
    routeCardNo: 'Route card no',
    dcNo: 'DC no',
    dcNoPlaceholder: 'e.g. DC-5561',
    dcDate: 'DC date',
    partName: 'Part name',
    partNamePlaceholder: 'e.g. Bracket',
    partNumber: 'Part number',
    partNumberPlaceholder: 'e.g. PN-33021',
    drawingNumber: 'Drawing number',
    drawingNumberPlaceholder: 'e.g. DRW-1187',
    rmPartNumber: 'RM part number',
    rmPartNumberPlaceholder: 'e.g. RM-4092',
    shopOrderNumber: 'Shop order number',
    shopOrderPlaceholder: 'e.g. SO-7734',
    rawMaterialSize: 'Raw material size',
    rawMaterialSizePlaceholder: 'e.g. 25mm dia x 200mm',
    heatNumber: 'Heat number',
    heatNumberPlaceholder: 'e.g. HT-99213',
    projectId: 'Project ID',
    projectIdPlaceholder: 'e.g. PRJ-118',
    rawMaterialGrade: 'Raw material grade',
    rawMaterialGradePlaceholder: 'e.g. EN8, MS, SS304',
  },
} as const;

export const PRIORITY_META: Record<
  OrderPriority,
  StatusMeta & { short: string; rank: number }
> = {
  high: { label: 'High', short: 'HI', tone: 'danger', rank: 0 },
  medium: { label: 'Medium', short: 'MD', tone: 'warning', rank: 1 },
  low: { label: 'Low', short: 'LO', tone: 'success', rank: 2 },
};

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  new: { label: 'New', tone: 'neutral' },
  yet_to_start: { label: 'Yet to start', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'info' },
  paused: { label: 'Paused', tone: 'danger' },
  payment_due: { label: 'Payment due', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
};

export const PRIORITY_OPTIONS: N1DropDownOption<OrderPriority>[] = (
  Object.keys(PRIORITY_META) as OrderPriority[]
).map(value => ({ value, label: PRIORITY_META[value].label }));

/** Status choices for the list filter. */
export const ORDER_STATUS_OPTIONS: N1DropDownOption<OrderStatus>[] = (
  Object.keys(ORDER_STATUS_META) as OrderStatus[]
).map(value => ({ value, label: ORDER_STATUS_META[value].label }));

/** Where the raw material comes from (Raw Material Details). */
export const MATERIAL_SOURCE_OPTIONS: N1RadioOption<MaterialSource>[] = [
  { value: 'bought_out', label: 'Bought out' },
  { value: 'in_house', label: 'In-house' },
];

/**
 * The order QR stamped onto each page of a printed drawing, in mm on paper.
 * It goes in the page's largest blank area, kept clear of ink by `gapMm`.
 */
export const DRAWING_QR = {
  /** Scans comfortably from an A3 sheet at arm's length. */
  preferredMm: 28,
  /** Below this, phone cameras struggle with a printed code. */
  minMm: 18,
  gapMm: 3,
  /** Printer margins and the sheet's own frame. */
  marginMm: 10,
  /** Pages are drawn this many pixels on their longer side to find room. */
  mapPixels: 1000,
  /** The drawing thumbnail's longer side: sharp at twice its on-screen size. */
  thumbnailPixels: 600,
  /** The QR preview's longer side: the code's modules stay distinct. */
  previewPixels: 1400,
  /** A picture drawing is treated as a sheet this long (A3). */
  imageSheetMm: 420,
} as const;

/**
 * The kind marking an order's extra drawings among its documents: the order
 * holds one design file, so further drawings are stored as documents.
 */
export const DRAWING_KIND = 'Design file';
