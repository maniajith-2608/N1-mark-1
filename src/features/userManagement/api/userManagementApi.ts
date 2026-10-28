import { graphqlRequest, textOrNull } from '../../../services/api';
import {
  fromFileReference,
  uploadAttachments,
} from '../../../services/files/fileStorage';
import { isBlank, toE164Phone } from '../../../shared/utils';
import {
  APP_ROLE_TO_BACKEND,
  BACKEND_ROLE_TO_APP,
  type BackendRole,
} from '../../auth/constants';
import type { AdminUser, UserInput } from '../types';

// N1 Core API: users / createUser / updateUser / resetUserPassword /
// setUserStatus on POST /graphql (schema: packages/schema/app.graphql).

const USER_FIELDS = `
  fragment UserFields on User {
    id name email phone designation department
    address city state pinCode country
    role status joinedAt
    permissions { viewOrders manageUsers exportReports }
    documents { id name kind sizeBytes }
  }
`;
// No activity: no users screen shows it, and 100 rows of it break the app's
// query cost limit (1,000).

type UserNode = Omit<
  AdminUser,
  'email' | 'phone' | 'role' | 'status' | 'attachments' | 'activity'
> & {
  email: string | null;
  phone: string | null;
  role: BackendRole;
  // The backend may still report INVITED or SUSPENDED; anything not ACTIVE shows as inactive.
  status: string;
  documents: {
    id: string;
    name: string;
    kind: string | null;
    sizeBytes: number;
  }[];
};

// Each user's backend role, so an edit only sends a role the admin changed:
// the app shows owners and accountants as "Admin", and saving that back would
// demote the owner.
const backendRoles = new Map<string, BackendRole>();

function toAdminUser(node: UserNode): AdminUser {
  backendRoles.set(node.id, node.role);
  return {
    ...node,
    email: node.email ?? '',
    phone: node.phone ?? '',
    role: BACKEND_ROLE_TO_APP[node.role],
    status: node.status === 'ACTIVE' ? 'active' : 'inactive',
    attachments: node.documents.map(fromFileReference),
    activity: [],
  };
}

/** The profile fields of a create or update, leaving out what wasn't given. */
function profileFields(input: Partial<UserInput>) {
  const fields: Record<string, unknown> = {};
  if (input.name !== undefined) {
    fields.name = input.name.trim();
  }
  (
    [
      'designation',
      'department',
      'address',
      'city',
      'state',
      'pinCode',
      'country',
      'email',
    ] as const
  ).forEach(key => {
    if (input[key] !== undefined) {
      fields[key] = textOrNull(input[key]);
    }
  });
  if (input.phone !== undefined) {
    fields.phone = isBlank(input.phone) ? null : toE164Phone(input.phone);
  }
  if (input.status !== undefined) {
    fields.status = input.status.toUpperCase();
  }
  if (input.permissions !== undefined) {
    fields.permissions = input.permissions;
  }
  return fields;
}

// A literal: the cost check counts a page size passed as a variable as 100,
// and 100 rows of these fields cost more than the app may ask for.
const PAGE_SIZE = 50;

async function list(): Promise<AdminUser[]> {
  const users: AdminUser[] = [];
  let after: string | null = null;
  do {
    const data: {
      users: {
        edges: { node: UserNode }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await graphqlRequest(
      `query Users($after: String) {
        users(first: ${PAGE_SIZE}, after: $after) {
          edges { node { ...UserFields } }
          pageInfo { hasNextPage endCursor }
        }
      }
      ${USER_FIELDS}`,
      { after },
    );
    users.push(...data.users.edges.map(edge => toAdminUser(edge.node)));
    after = data.users.pageInfo.hasNextPage
      ? data.users.pageInfo.endCursor
      : null;
  } while (after);
  return users;
}

async function create({
  attachments,
  ...input
}: UserInput): Promise<AdminUser> {
  const data = await graphqlRequest<{ createUser: UserNode }>(
    `mutation CreateUser($input: CreateUserInput!) {
      createUser(input: $input) { ...UserFields }
    }
    ${USER_FIELDS}`,
    {
      input: {
        ...profileFields(input),
        role: APP_ROLE_TO_BACKEND[input.role],
        initialPassword: input.password,
      },
    },
  );
  const user = toAdminUser(data.createUser);
  // Files are uploaded against the person, so they need the new id first.
  return attachments?.length ? update(user.id, { attachments }) : user;
}

async function fetchUser(id: string): Promise<AdminUser> {
  const data = await graphqlRequest<{ user: UserNode }>(
    `query User($id: ID!) { user(id: $id) { ...UserFields } }
    ${USER_FIELDS}`,
    { id },
  );
  return toAdminUser(data.user);
}

/**
 * updateUser for the profile; a new password goes through resetUserPassword,
 * the only way an admin may set someone else's.
 */
async function update(
  id: string,
  { password, role, attachments, ...changes }: Partial<UserInput>,
): Promise<AdminUser> {
  const input = profileFields(changes);
  if (attachments !== undefined) {
    input.documents = await uploadAttachments('user', id, attachments);
  }
  const current = backendRoles.get(id);
  if (role && (!current || BACKEND_ROLE_TO_APP[current] !== role)) {
    input.role = APP_ROLE_TO_BACKEND[role];
  }
  let user: AdminUser | undefined;
  if (Object.keys(input).length > 0) {
    const data = await graphqlRequest<{ updateUser: UserNode }>(
      `mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
        updateUser(id: $id, input: $input) { ...UserFields }
      }
      ${USER_FIELDS}`,
      { id, input },
    );
    user = toAdminUser(data.updateUser);
  }
  if (password) {
    await graphqlRequest(
      `mutation ResetUserPassword($id: ID!, $newPassword: String!) {
        resetUserPassword(id: $id, newPassword: $newPassword)
      }`,
      { id, newPassword: password },
    );
  }
  return user ?? fetchUser(id);
}

/**
 * People are deactivated, never deleted: they can't sign in, their history
 * stays, and they show in the list as Inactive.
 */
async function remove(id: string): Promise<string> {
  await graphqlRequest(
    `mutation DeactivateUser($id: ID!) {
      setUserStatus(id: $id, status: INACTIVE) { id }
    }`,
    { id },
  );
  return id;
}

export const userManagementApi = { list, create, update, remove };
