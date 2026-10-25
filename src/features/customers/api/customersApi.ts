import {
  fetchAllNodes,
  fromPaise,
  fromWireEnum,
  graphqlRequest,
  textOrNull,
  toWireEnum,
} from '../../../services/api';
import { isBlank, toE164Phone } from '../../../shared/utils';
import type { ActivityEntry } from '../../../shared/types';
import type { Customer, CustomerInput, CustomerType } from '../types';

// N1 Core API: customers / customer / createCustomer / updateCustomer /
// deleteCustomer on POST /graphql.

const CUSTOMER_FIELDS = `
  fragment CustomerFields on Customer {
    id name type contactPerson mobile alternateMobile email gstin notes
    address { address city state pinCode country }
    currentProjects previousProjects totalRevenue outstandingBalance
    customerSince
    activity(first: 10) { edges { node { id label detail at tone } } }
  }
`;

type CustomerNode = {
  id: string;
  name: string;
  type: Uppercase<CustomerType>;
  contactPerson: string;
  mobile: string;
  alternateMobile: string;
  email: string | null;
  gstin: string | null;
  notes: string;
  address: {
    address: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
  };
  currentProjects: number;
  previousProjects: number;
  totalRevenue: number;
  outstandingBalance: number;
  customerSince: string;
  activity: {
    edges: {
      node: Omit<ActivityEntry, 'detail' | 'tone'> & {
        detail: string | null;
        tone: string;
      };
    }[];
  };
};

// The last-loaded customers, so a section save that sends only the street or
// only the city still sends the whole billing address the API requires.
const known = new Map<string, Customer>();

function toCustomer(node: CustomerNode): Customer {
  const customer: Customer = {
    id: node.id,
    type: fromWireEnum<CustomerType>(node.type),
    name: node.name,
    contactPerson: node.contactPerson,
    mobile: node.mobile,
    alternateMobile: node.alternateMobile,
    email: node.email ?? '',
    gstNumber: node.gstin ?? '',
    address: node.address.address,
    city: node.address.city,
    state: node.address.state,
    pinCode: node.address.pinCode,
    country: node.address.country,
    notes: node.notes,
    currentProjects: node.currentProjects,
    previousProjects: node.previousProjects,
    totalRevenue: fromPaise(node.totalRevenue),
    outstandingBalance: fromPaise(node.outstandingBalance),
    customerSince: node.customerSince,
    activity: node.activity.edges.map(({ node: entry }) => ({
      id: entry.id,
      label: entry.label,
      detail: entry.detail ?? undefined,
      at: entry.at,
      tone: fromWireEnum<ActivityEntry['tone']>(entry.tone),
    })),
  };
  known.set(customer.id, customer);
  return customer;
}

/** A phone as the API stores it; blank clears it. */
const phoneOrEmpty = (value: string) =>
  isBlank(value) ? '' : toE164Phone(value);

/**
 * The CustomerInput for the fields that were given. Text the API returns as
 * non-null (contact, phones, notes) is cleared with "", since null there
 * means "leave as is"; email and GSTIN are cleared with null.
 */
function toWireInput(
  input: Partial<CustomerInput>,
  current?: Customer,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (input.type !== undefined) {
    fields.type = toWireEnum(input.type);
  }
  if (input.name !== undefined) {
    fields.name = input.name.trim();
  }
  if (input.contactPerson !== undefined) {
    fields.contactPerson = input.contactPerson.trim();
  }
  if (input.mobile !== undefined) {
    fields.mobile = phoneOrEmpty(input.mobile);
  }
  if (input.alternateMobile !== undefined) {
    fields.alternateMobile = phoneOrEmpty(input.alternateMobile);
  }
  if (input.email !== undefined) {
    fields.email = textOrNull(input.email);
  }
  if (input.gstNumber !== undefined) {
    fields.gstin = textOrNull(input.gstNumber)?.toUpperCase() ?? null;
  }
  if (input.notes !== undefined) {
    fields.notes = input.notes.trim();
  }
  const addressKeys = ['address', 'city', 'state', 'pinCode', 'country'];
  if (addressKeys.some(key => key in input)) {
    const pick = (key: 'address' | 'city' | 'state' | 'pinCode' | 'country') =>
      (input[key] ?? current?.[key] ?? '').trim();
    fields.country = textOrNull(pick('country'));
    fields.billingAddress = {
      line1: pick('address'),
      city: pick('city'),
      state: pick('state'),
      pincode: pick('pinCode'),
      country: textOrNull(pick('country')),
    };
  }
  return fields;
}

// A literal: the cost check counts a page size passed as a variable as 100,
// and with each customer's recent activity 50 rows is already too many.
const PAGE_SIZE = 25;

/** Every customer, busiest (most current projects) first. */
async function list(): Promise<Customer[]> {
  const nodes = await fetchAllNodes<CustomerNode>(
    `query Customers($after: String) {
      customers(
        first: ${PAGE_SIZE}
        after: $after
        sort: { field: CURRENT_PROJECTS, direction: DESC }
      ) {
        edges { node { ...CustomerFields } }
        pageInfo { hasNextPage endCursor }
      }
    }
    ${CUSTOMER_FIELDS}`,
    'customers',
  );
  return nodes.map(toCustomer);
}

/** One customer, fresh: Customer details reloads its stats and activity. */
async function get(id: string): Promise<Customer> {
  const data = await graphqlRequest<{ customer: CustomerNode }>(
    `query Customer($id: ID!) { customer(id: $id) { ...CustomerFields } }
    ${CUSTOMER_FIELDS}`,
    { id },
  );
  return toCustomer(data.customer);
}

// Required to create; the app has no payment terms field yet.
const DEFAULT_PAYMENT_TERMS_DAYS = 30;

async function create(input: CustomerInput): Promise<Customer> {
  const data = await graphqlRequest<{ createCustomer: CustomerNode }>(
    `mutation CreateCustomer($input: CustomerInput!) {
      createCustomer(input: $input) { ...CustomerFields }
    }
    ${CUSTOMER_FIELDS}`,
    {
      input: {
        ...toWireInput(input),
        paymentTermsDays: DEFAULT_PAYMENT_TERMS_DAYS,
      },
    },
  );
  return toCustomer(data.createCustomer);
}

/** Sends only the given fields: a section save changes only that section. */
async function update(
  id: string,
  changes: Partial<CustomerInput>,
): Promise<Customer> {
  const data = await graphqlRequest<{ updateCustomer: CustomerNode }>(
    `mutation UpdateCustomer($id: ID!, $input: CustomerInput!) {
      updateCustomer(id: $id, input: $input) { ...CustomerFields }
    }
    ${CUSTOMER_FIELDS}`,
    { id, input: toWireInput(changes, known.get(id)) },
  );
  return toCustomer(data.updateCustomer);
}

/** Only customers without orders or invoices can go (CUSTOMER_IN_USE). */
async function remove(id: string): Promise<string> {
  await graphqlRequest(
    `mutation DeleteCustomer($id: ID!) { deleteCustomer(id: $id) }`,
    { id },
  );
  known.delete(id);
  return id;
}

export const customersApi = { list, get, create, update, remove };
