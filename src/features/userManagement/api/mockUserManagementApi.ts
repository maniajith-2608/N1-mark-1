import {
  createMockCollection,
  nextSequentialId,
} from '../../../services/mock/mockServer';
import { DEFAULT_PERMISSIONS } from '../constants';
import type { AdminUser, UserInput } from '../types';
import { MOCK_USERS } from './mockData';

// Stands in for userManagementApi under Jest (jest.setup.js).
const users = createMockCollection<AdminUser, UserInput>({
  seed: MOCK_USERS,
  nextId: rows => nextSequentialId(rows, 'USR-'),
  build: ({ password: _password, ...input }, id) => ({
    id,
    name: input.name.trim(),
    email: input.email.trim(),
    designation: input.designation.trim(),
    phone: input.phone ?? '',
    department: input.department ?? '',
    address: input.address ?? '',
    city: input.city ?? '',
    state: input.state ?? '',
    pinCode: input.pinCode ?? '',
    country: input.country ?? '',
    role: input.role,
    status: input.status,
    joinedAt: new Date().toISOString(),
    permissions: input.permissions ?? DEFAULT_PERMISSIONS[input.role],
    attachments: [],
    activity: [
      {
        id: 'a1',
        label: 'Account created',
        at: new Date().toISOString(),
        tone: 'neutral',
      },
    ],
  }),
});

export const userManagementApi = {
  list: users.list,
  create: users.create,
  // The password is sent to the server but never stored on the record.
  update: (
    id: string,
    { password: _password, ...changes }: Partial<UserInput>,
  ) => users.update(id, changes),
  remove: users.remove,
  reset: users.reset,
};
