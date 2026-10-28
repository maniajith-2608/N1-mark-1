import {
  ApiError,
  definedOnly,
  fetchAllNodes,
  fromPaise,
  fromWireEnum,
  graphqlRequest,
  textOrEmpty,
  textOrNull,
  toPaise,
  toWireEnum,
} from '../../../services/api';
import {
  fromFileReference,
  uploadAttachment,
  uploadAttachments,
  type FileReference,
} from '../../../services/files/fileStorage';
import type { ActivityEntry } from '../../../shared/types';
import type {
  MaterialSource,
  OrderInput,
  OrderPriority,
  OrderStatus,
  WorkOrder,
} from '../types';
import { isWorkOrder } from '../utils';

// N1 Core API: orders / order / createOrder / updateOrder on POST /graphql.
// createOrder or updateOrder opens the order's job card itself, once the
// order's raw material grade and size are both set (FE-007). Design and
// PO files go up to file storage against the order, then onto it with
// updateOrder.

const ORDER_FIELDS = `
  fragment OrderFields on Order {
    id number jobCardId customerId customerName customerEmail
    partName jobName description quantity priority status dueDate
    poNumber poAmount routeCardNo dcNo dcDate partNumber drawingNumber
    rmPartNumber shopOrderNumber rawMaterialSize heatNumber projectId
    rawMaterialGrade materialSource quoteId notes createdAt
    designFile { id name kind sizeBytes }
    documents { id name kind sizeBytes }
  }
`;

type ActivityNode = {
  id: string;
  label: string;
  detail: string | null;
  at: string;
  tone: Uppercase<ActivityEntry['tone']>;
};

type OrderNode = {
  id: string;
  number: string | null;
  jobCardId: string | null;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  partName: string;
  jobName: string | null;
  description: string | null;
  quantity: number;
  priority: Uppercase<OrderPriority>;
  status: Uppercase<OrderStatus>;
  dueDate: string;
  poNumber: string;
  /** Paise. */
  poAmount: number | null;
  routeCardNo: string | null;
  dcNo: string | null;
  dcDate: string | null;
  partNumber: string | null;
  drawingNumber: string | null;
  rmPartNumber: string | null;
  shopOrderNumber: string | null;
  rawMaterialSize: string | null;
  heatNumber: string | null;
  projectId: string | null;
  rawMaterialGrade: string | null;
  materialSource: Uppercase<MaterialSource> | null;
  quoteId: string | null;
  notes: string | null;
  createdAt: string;
  designFile: FileReference | null;
  documents: FileReference[];
  /** Only on the single-order query; the list leaves it out. */
  statusHistory?: ActivityNode[];
};

function toOrder(node: OrderNode): WorkOrder {
  return {
    id: node.id,
    number: textOrEmpty(node.number),
    jobCardId: textOrEmpty(node.jobCardId),
    customerId: node.customerId,
    customerName: node.customerName,
    customerEmail: textOrEmpty(node.customerEmail),
    partName: node.partName,
    jobName: textOrEmpty(node.jobName),
    description: textOrEmpty(node.description),
    quantity: node.quantity,
    priority: fromWireEnum<OrderPriority>(node.priority),
    status: fromWireEnum<OrderStatus>(node.status),
    dueDate: node.dueDate,
    poNumber: node.poNumber,
    poAmount: node.poAmount == null ? null : fromPaise(node.poAmount),
    routeCardNo: textOrEmpty(node.routeCardNo),
    dcNo: textOrEmpty(node.dcNo),
    dcDate: textOrEmpty(node.dcDate),
    partNumber: textOrEmpty(node.partNumber),
    drawingNumber: textOrEmpty(node.drawingNumber),
    rmPartNumber: textOrEmpty(node.rmPartNumber),
    shopOrderNumber: textOrEmpty(node.shopOrderNumber),
    rawMaterialSize: textOrEmpty(node.rawMaterialSize),
    heatNumber: textOrEmpty(node.heatNumber),
    projectId: textOrEmpty(node.projectId),
    rawMaterialGrade: textOrEmpty(node.rawMaterialGrade),
    materialSource: node.materialSource
      ? fromWireEnum<MaterialSource>(node.materialSource)
      : '',
    quoteId: textOrEmpty(node.quoteId),
    notes: textOrEmpty(node.notes),
    designFile: node.designFile && fromFileReference(node.designFile),
    documents: node.documents.map(fromFileReference),
    statusHistory: (node.statusHistory ?? []).map(entry => ({
      id: entry.id,
      label: entry.label,
      ...(entry.detail && { detail: entry.detail }),
      at: entry.at,
      tone: fromWireEnum<ActivityEntry['tone']>(entry.tone),
    })),
    createdAt: node.createdAt,
  };
}

const TEXT_FIELDS = [
  'jobName',
  'description',
  'routeCardNo',
  'dcNo',
  'dcDate',
  'partNumber',
  'drawingNumber',
  'rmPartNumber',
  'shopOrderNumber',
  'rawMaterialSize',
  'heatNumber',
  'projectId',
  'rawMaterialGrade',
  'notes',
] as const;

/**
 * The order fields of a create or update, leaving out what wasn't given.
 * Never the customer (set once, on create), the status (the server's) or
 * the files (sent as references once uploaded).
 */
function orderFields(input: Partial<OrderInput>): Record<string, unknown> {
  const fields: Record<string, unknown> = definedOnly({
    partName: input.partName?.trim(),
    poNumber: input.poNumber?.trim(),
    dueDate: input.dueDate || undefined,
    quantity: input.quantity,
    priority: input.priority && toWireEnum(input.priority),
  });
  TEXT_FIELDS.forEach(key => {
    if (input[key] !== undefined) {
      fields[key] = textOrNull(input[key]);
    }
  });
  if (input.poAmount !== undefined) {
    fields.poAmount = input.poAmount == null ? null : toPaise(input.poAmount);
  }
  if (input.materialSource !== undefined) {
    fields.materialSource = input.materialSource
      ? toWireEnum(input.materialSource)
      : null;
  }
  return fields;
}

// A literal: the cost check counts a page size passed as a variable as 100.
const PAGE_SIZE = 50;

/** Every order (the list sorts them by priority itself). */
async function list(): Promise<WorkOrder[]> {
  const nodes = await fetchAllNodes<OrderNode>(
    `query Orders($after: String) {
      orders(
        first: ${PAGE_SIZE}
        after: $after
        sort: { field: DUE_DATE, direction: ASC }
      ) {
        edges { node { ...OrderFields } }
        pageInfo { hasNextPage endCursor }
      }
    }
    ${ORDER_FIELDS}`,
    'orders',
  );
  return nodes.map(toOrder);
}

async function get(id: string): Promise<WorkOrder> {
  const data = await graphqlRequest<{ order: OrderNode }>(
    `query Order($id: ID!) {
      order(id: $id) {
        ...OrderFields
        statusHistory { id label detail at tone }
      }
    }
    ${ORDER_FIELDS}`,
    { id },
  );
  return toOrder(data.order);
}

/**
 * The order with work order number `code` ("WO-12"), card or not: an order
 * gets its job card only once its raw material grade and size are set
 * (FE-007), so jobCardByQr can't find it before then. The search also matches
 * other fields and longer numbers ("WO-120"), so only an exact number counts.
 */
async function findByNumber(code: string): Promise<WorkOrder> {
  const data = await graphqlRequest<{
    orders: { edges: { node: OrderNode }[] };
  }>(
    `query OrderByNumber($search: String!) {
      orders(first: ${PAGE_SIZE}, search: $search) {
        edges { node { ...OrderFields } }
      }
    }
    ${ORDER_FIELDS}`,
    { search: code },
  );
  const order = data.orders.edges
    .map(({ node }) => toOrder(node))
    .find(o => isWorkOrder(o, code));
  if (!order) {
    throw new ApiError('That order does not exist.', 404, undefined, {
      code: 'ORDER_NOT_FOUND',
    });
  }
  return order;
}

/** Uploads newly picked files, then puts their references on the order. */
async function update(
  id: string,
  { designFile, documents, ...changes }: Partial<OrderInput>,
): Promise<WorkOrder> {
  const input = orderFields(changes);
  if (designFile !== undefined) {
    input.designFile = designFile
      ? await uploadAttachment('sales_order', id, designFile)
      : null;
  }
  if (documents !== undefined) {
    input.documents = await uploadAttachments('sales_order', id, documents);
  }
  const data = await graphqlRequest<{ updateOrder: OrderNode }>(
    `mutation UpdateOrder($id: ID!, $input: OrderUpdateInput!) {
      updateOrder(id: $id, input: $input) {
        ...OrderFields
        statusHistory { id label detail at tone }
      }
    }
    ${ORDER_FIELDS}`,
    { id, input },
  );
  return toOrder(data.updateOrder);
}

/**
 * createOrder, which opens the order's job card too when its raw material
 * grade and size are given (FE-007; no second call). It needs an existing
 * customer. Files go up against the new order afterwards.
 */
async function create({
  customerId,
  designFile,
  documents,
  ...input
}: OrderInput): Promise<WorkOrder> {
  const data = await graphqlRequest<{ createOrder: OrderNode }>(
    `mutation CreateOrder($input: OrderInput!) {
      createOrder(input: $input) { ...OrderFields }
    }
    ${ORDER_FIELDS}`,
    { input: { ...orderFields(input), customerId } },
  );
  const order = toOrder(data.createOrder);
  return designFile || documents.length
    ? update(order.id, { designFile, documents })
    : order;
}

/** Orders are never deleted (guide section 9); no screen offers it. */
function remove(): Promise<string> {
  return Promise.reject(new Error('Orders cannot be deleted'));
}

export const ordersApi = { list, get, findByNumber, create, update, remove };
