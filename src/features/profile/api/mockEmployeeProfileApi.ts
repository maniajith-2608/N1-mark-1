import { respond } from '../../../services/mock/mockServer';
import type {
  EmployeeProfile,
  EmployeeProfileInput,
  EmployeeRole,
  EmployeeSession,
} from '../types';
import { MOCK_EMPLOYEES } from './employeeMockData';

// Stands in for employeeProfileApi under Jest (jest.setup.js).
let employees = MOCK_EMPLOYEES;

export const employeeProfileApi = {
  fetchProfile: (role: EmployeeRole): Promise<EmployeeSession> =>
    respond({ profile: employees[role], permissions: ['org.read'] }),
  updateProfile: async (
    role: EmployeeRole,
    changes: EmployeeProfileInput,
  ): Promise<EmployeeProfile> => {
    employees = { ...employees, [role]: { ...employees[role], ...changes } };
    return respond(employees[role]);
  },
  reset: () => {
    employees = MOCK_EMPLOYEES;
  },
};
