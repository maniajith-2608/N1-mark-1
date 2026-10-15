import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Same paths for every non-admin role: /dashboard/qc (Jobs),
// and /dashboard/qc/profile.
const ROLE_PATHS = {
  Home: '',
  Profile: 'profile',
};

// Maps every screen to a URL path. On web this drives the browser address bar
// (and refresh / back / forward); on native it handles n1mark1:// deep links.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['n1mark1://'],
  config: {
    screens: {
      // Admin modules: /dashboard, /dashboard/orders/1042, /dashboard/job-cards/1042/flow…
      Dashboard: {
        path: 'dashboard',
        screens: {
          Admin: {
            path: '',
            screens: {
              Overview: {
                path: '',
                screens: {
                  DashboardHome: '',
                  JobCardDetails: 'priority-jobs/:jobCardId',
                },
              },
              Users: {
                path: 'users',
                screens: {
                  UsersList: '',
                  JobCardDetails: 'job-cards/:jobCardId',
                  // Phones swipe between sections (a top-tab navigator).
                  UserDetails: {
                    path: ':userId',
                    screens: {
                      profile: '',
                      address: 'address',
                      work: 'work',
                      security: 'security',
                      documents: 'documents',
                    },
                  },
                },
              },
              Customers: {
                path: 'customers',
                screens: {
                  CustomersList: '',
                  // A customer's orders and quotes, opened from the customer.
                  OrderDetails: 'orders/:orderId',
                  OrderForm: 'orders/form/:orderId?',
                  JobCardDetails: 'job-cards/:jobCardId',
                  QuoteDetails: 'quotes/:quoteId',
                  // Phones swipe between sections (a top-tab navigator).
                  CustomerDetails: {
                    path: ':customerId',
                    screens: {
                      info: '',
                      address: 'address',
                      stats: 'stats',
                      orders: 'orders',
                      quotes: 'quotes',
                      notes: 'notes',
                    },
                  },
                },
              },
              Orders: {
                path: 'orders',
                screens: {
                  OrdersList: '',
                  JobCardDetails: 'job-cards/:jobCardId',
                  // Optional id: blank creates a new order.
                  OrderForm: 'form/:orderId?',
                  OrderDetails: ':orderId',
                },
              },
              JobCards: {
                path: 'job-cards',
                screens: {
                  JobCardsList: '',
                  JobCardDetails: ':jobCardId',
                },
              },
              Machines: {
                path: 'machines',
                screens: {
                  MachinesList: '',
                  MachineDetails: ':machineId',
                },
              },
              Profile: {
                path: 'profile',
                screens: { MyProfile: '', ProfileSection: ':section' },
              },
              // Phones swipe between sections (a top-tab navigator); the
              // first one has the plain path.
              Organization: {
                path: 'organization',
                screens: {
                  general: '',
                  business: 'business',
                  address: 'address',
                  gst: 'gst',
                  invoice: 'invoice',
                  documents: 'documents',
                },
              },
              Billing: {
                path: 'billing',
                screens: {
                  // ?tab=quotes opens the Quotes tab.
                  BillingHome: '',
                  InvoiceDetails: 'invoices/:invoiceId',
                  // Optional id: blank creates a new quote.
                  QuoteForm: 'quotes/form/:quoteId?',
                  QuoteDetails: 'quotes/:quoteId',
                },
              },
            },
          },
          // Non-admin roles (see ROLE_PATHS).
          // /dashboard/supervisor/orders/1042, …/job-cards/1042/flow
          Supervisor: {
            path: 'supervisor',
            screens: {
              ...ROLE_PATHS,
              ScanJob: 'scan',
              EnterJobCode: 'job-code',
              ImportOrder: 'orders/:orderId',
              RawMaterial: 'orders/:orderId/raw-material',
              JobCardDetails: 'job-cards/:jobCardId',
              Drawing: 'orders/:orderId/drawing',
            },
          },
          // /dashboard/operator/jobs/1042, …/jobs/1042/machine
          Operator: {
            path: 'operator',
            screens: {
              ...ROLE_PATHS,
              ScanJob: 'scan',
              EnterJobCode: 'job-code',
              OperatorJob: 'jobs/:jobCardId',
              AssignMachine: 'jobs/:jobCardId/machine',
              OrderDetails: 'orders/:orderId',
              Drawing: 'orders/:orderId/drawing',
            },
          },
          // /dashboard/qc/checks/rm/1042, …/checks/machine/1042/fail
          Qc: {
            path: 'qc',
            screens: {
              ...ROLE_PATHS,
              ScanJob: 'scan',
              EnterJobCode: 'job-code',
              QcCheck: 'checks/:kind/:jobCardId',
              QcFail: 'checks/:kind/:jobCardId/fail',
              OrderDetails: 'orders/:orderId',
              Drawing: 'orders/:orderId/drawing',
            },
          },
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          CreateOrganization: 'create-organization',
          ForgotPasswordFlow: {
            path: 'forgot-password',
            screens: {
              ForgotPassword: '',
              VerifyCode: 'verify',
              ResetPassword: 'reset',
            },
          },
        },
      },
    },
  },
};
