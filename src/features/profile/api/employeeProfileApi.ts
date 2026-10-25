import { graphqlRequest, textOrNull } from '../../../services/api';
import { toE164Phone } from '../../../shared/utils';
import { BACKEND_ROLE_TO_APP, type BackendRole } from '../../auth/constants';
import type {
  EmployeeProfile,
  EmployeeProfileInput,
  EmployeeRole,
  EmployeeSession,
} from '../types';

// N1 Core API: me / updateMyProfile for the supervisor, operator and QC
// Profile screen (guide section 6, "Employee Profile").

const EMPLOYEE_FIELDS = `
  fragment EmployeeFields on User {
    id name role employeeId department shift joinedAt phone email
  }
`;

type EmployeeNode = Omit<
  EmployeeProfile,
  'role' | 'joinedOn' | 'phone' | 'email'
> & {
  role: BackendRole;
  joinedAt: string;
  phone: string | null;
  email: string | null;
};

/** `role` is the area the person signed in to; it stands in for an admin's. */
function toEmployeeProfile(
  { role, joinedAt, phone, email, ...rest }: EmployeeNode,
  signedInAs: EmployeeRole,
): EmployeeProfile {
  const appRole = BACKEND_ROLE_TO_APP[role];
  return {
    ...rest,
    role: appRole === 'admin' ? signedInAs : appRole,
    joinedOn: joinedAt,
    phone: phone ?? '',
    email: email ?? '',
  };
}

export const employeeProfileApi = {
  fetchProfile: async (role: EmployeeRole): Promise<EmployeeSession> => {
    const { me } = await graphqlRequest<{
      me: { permissions: string[]; user: EmployeeNode };
    }>(
      `query EmployeeProfile {
        me { permissions user { ...EmployeeFields } }
      }
      ${EMPLOYEE_FIELDS}`,
    );
    return {
      profile: toEmployeeProfile(me.user, role),
      permissions: me.permissions,
    };
  },

  /** updateMyProfile. The shift has no field there, so it isn't sent. */
  updateProfile: async (
    role: EmployeeRole,
    { shift: _shift, ...changes }: EmployeeProfileInput,
  ): Promise<EmployeeProfile> => {
    const { updateMyProfile } = await graphqlRequest<{
      updateMyProfile: EmployeeNode;
    }>(
      `mutation EmployeeProfileUpdate($input: UpdateMyProfileInput!) {
        updateMyProfile(input: $input) { ...EmployeeFields }
      }
      ${EMPLOYEE_FIELDS}`,
      {
        input: {
          ...changes,
          // Phones are stored as +91…; an empty one is removed.
          phone: textOrNull(changes.phone) && toE164Phone(changes.phone),
        },
      },
    );
    return toEmployeeProfile(updateMyProfile, role);
  },
};
