import type { N1DropDownOption, N1RadioOption } from '../../shared/components';
import type { CustomerType } from './types';

export const CUSTOMER_STRINGS = {
  title: 'Customers',
  add: 'Add Customer',
  addA11y: 'Add customer',
  search: 'Search customers',
  noun: 'customers',
  columns: {
    customer: 'Customer',
    current: 'Current projects',
    previous: 'Previous projects',
    revenue: 'Total revenue',
    outstanding: 'Outstanding balance',
    address: 'Address',
    billed: 'Billed',
    outstandingShort: 'Outstanding',
  },
  active: (n: number) => `${n} active`,
  completed: (n: number) => `${n} completed`,
  activeDone: (active: number, done: number) =>
    `${active} active · ${done} done`,
  stats: {
    customers: 'Customers',
    activeOrders: 'Active orders',
    orders: 'orders',
  },
  form: {
    addTitle: 'Add customer',
    addSubtitle: (org: string) => `Add a new customer account to ${org}.`,
    editTitle: 'Edit customer',
    editSubtitle: (name: string) => `Update ${name}'s account details.`,
    submitAdd: 'Save Customer',
    type: 'Customer Type',
    name: 'Company / Customer Name',
    namePlaceholder: 'e.g. Acme Metalworks',
    contact: 'Contact Person',
    contactPlaceholder: 'e.g. Rajesh Kumar',
    mobile: 'Mobile Number',
    mobilePlaceholder: 'e.g. +91 98765 43210',
    alternateMobile: 'Alternate Phone',
    alternateMobilePlaceholder: 'e.g. +91 98400 12345',
    email: 'Email',
    emailPlaceholder: 'e.g. accounts@acmemetalworks.com',
    gst: 'GST Number',
    gstPlaceholder: 'e.g. 33AAAAA0000A1Z5',
    gstInvalid: 'GST numbers are 15 letters and digits',
    address: 'Address',
    addressPlaceholder: 'Street, area',
    city: 'City',
    cityPlaceholder: 'e.g. Chennai',
    state: 'State',
    pinCode: 'PIN Code',
    pinCodePlaceholder: 'e.g. 600032',
    pinCodeInvalid: 'Enter a 6-digit PIN code',
    country: 'Country',
    countryPlaceholder: 'Select country',
    notes: 'Notes',
    notesPlaceholder: 'Anything worth knowing about this account',
  },
  details: {
    title: 'Customer details',
    compactTitle: 'Customer',
    since: (date: string) => `Customer since ${date}`,
    contactPersonSuffix: 'Contact person',
    editDetails: 'Edit details',
    message: 'Message',
    mobile: 'Mobile number',
    email: 'Email',
    gst: 'GST number',
    cityState: 'City / State',
    address: 'Address',
    contactPerson: 'Contact person',
    contact: 'Contact',
    notes: 'Notes',
    currentProjects: 'Current projects',
    previousProjects: 'Previous projects',
    totalRevenue: 'Total revenue',
    outstanding: 'Outstanding balance',
    notFound: 'This customer no longer exists.',
    backToCustomers: 'Back to customers',
    backTo: {
      dashboard: 'Back to dashboard',
      orders: 'Back to orders',
      order: 'Back to order',
    },
    tabs: {
      info: 'Customer info',
      address: 'Address info',
      stats: 'Stats',
      orders: 'Orders',
      quotes: 'Quotes',
      notes: 'Notes',
    },
    deleteCustomer: 'Delete customer',
    noNotes: 'No notes for this customer.',
    orderHistory: 'Order history',
    noOrders: 'No orders from this customer yet.',
    quoteHistory: 'Quote history',
    noQuotes: 'No quotes shared with this customer yet.',
    columns: {
      order: 'Order',
      part: 'Part',
      qty: 'Qty',
      due: 'Due',
      quote: 'Quote',
      amount: 'Amount',
      date: 'Date',
      status: 'Status',
    },
  },
  delete: {
    title: 'Delete customer?',
    message: (name: string, org: string) =>
      [
        'This will permanently remove ',
        name,
        ` and their order history${
          org ? ` from ${org}` : ''
        }. This can’t be undone.`,
      ] as const,
    confirm: 'Delete customer',
  },
  a11y: {
    edit: (name: string) => `Edit ${name}`,
    delete: (name: string) => `Delete ${name}`,
    open: (name: string) => `Open ${name}`,
  },
} as const;

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  business: 'Business',
  individual: 'Individual',
};

export const CUSTOMER_TYPE_BADGE: Record<CustomerType, string> = {
  business: 'Business customer',
  individual: 'Individual customer',
};

export const CUSTOMER_TYPE_OPTIONS: N1RadioOption<CustomerType>[] = [
  { value: 'business', label: CUSTOMER_TYPE_LABELS.business },
  { value: 'individual', label: CUSTOMER_TYPE_LABELS.individual },
];

const STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export const STATE_OPTIONS: N1DropDownOption<string>[] = STATES.map(s => ({
  value: s,
  label: s,
}));

export const DEFAULT_STATE = 'Tamil Nadu';
export const DEFAULT_COUNTRY = 'India';

/** How many customers the dashboard lists before "View more". */
export const TOP_CUSTOMERS_COUNT = 4;
