// Public API of the Customers feature.
export { CustomersListScreen } from './screens/CustomersListScreen';
export { CustomerDetailsScreen } from './screens/CustomerDetailsScreen';
export { CustomerFormModal } from './components/CustomerFormModal';
export { default as CustomersNavigation } from './navigation/CustomersNavigation';
export {
  useCustomers,
  useCustomer,
  useCustomerShares,
} from './hooks/useCustomers';
export { TOP_CUSTOMERS_COUNT } from './constants';
export type {
  Customer,
  CustomerInput,
  CustomerShare,
  CustomersStackParamList,
} from './types';
