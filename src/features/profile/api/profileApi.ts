import { apiClient, ApiError, graphqlRequest } from '../../../services/api';
import {
  fromFileReference,
  uploadAttachment,
  type FileReference,
} from '../../../services/files/fileStorage';
import type { ActivityEntry, Attachment } from '../../../shared/types';
import { normalizeGstin } from '../../../shared/utils';
import { BACKEND_ROLE_TO_APP, type BackendRole } from '../../auth/constants';
import { PROFILE_STRINGS } from '../constants';
import type {
  MyProfile,
  Organization,
  OrganizationUpdate,
  PasswordChangeInput,
  ProfileInput,
  Session,
} from '../types';

// N1 Core API: me / updateMyProfile / changeMyPassword / organisation /
// updateOrganisation on POST /graphql (guide section 6, "Sign-in and profile"
// and "Organisation and people").

const FILE = 'id name kind sizeBytes';

const MY_USER_FIELDS = `
  fragment MyUserFields on User {
    id name email phone role designation
    address city state pinCode country joinedAt hasPassword
    photo { ${FILE} }
    activity(first: 10) { edges { node { id label detail at tone } } }
  }
`;

const ORGANISATION_FIELDS = `
  fragment OrganisationFields on Organisation {
    id code name shortName createdAt phone email website
    businessType industry registrationDetails
    address { address city state pinCode country }
    gstRegistered gstin gstState taxRates { id rate active } defaultTaxRate
    invoicePrefix invoiceStartNumber invoiceFooter
    logo { ${FILE} } invoiceLogo { ${FILE} } signature { ${FILE} }
    termsAndConditions
  }
`;

type UserNode = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: BackendRole;
  designation: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  joinedAt: string;
  hasPassword: boolean;
  photo: FileReference | null;
  activity: {
    edges: {
      node: Omit<ActivityEntry, 'detail' | 'tone'> & {
        detail: string | null;
        tone: Uppercase<ActivityEntry['tone']>;
      };
    }[];
  };
};

type OrganisationNode = Omit<
  Organization,
  | 'address'
  | 'city'
  | 'state'
  | 'pinCode'
  | 'country'
  | 'gstNumber'
  | 'logo'
  | 'invoiceLogo'
  | 'signature'
> & {
  address: {
    address: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
  };
  gstin: string | null;
  logo: FileReference | null;
  invoiceLogo: FileReference | null;
  signature: FileReference | null;
};

// Whose files an upload belongs to (POST /files/upload-url takes the owner).
let myUserId = '';
let organisationId = '';

// Shown images (photo, logo): a stored file has no address of its own, so a
// short-lived download link is fetched once per file. A just-picked image
// keeps its preview.
const imageUris = new Map<string, string>();

async function withImageUri(
  ref: FileReference | null,
): Promise<Attachment | null> {
  if (!ref) {
    return null;
  }
  const file = fromFileReference(ref);
  if (!imageUris.has(ref.id)) {
    try {
      // One try, no waiting: a file still being virus-checked shows initials.
      const { data } = await apiClient.post<{ url: string }>(
        `/files/${ref.id}/download-url`,
      );
      imageUris.set(ref.id, data.url);
    } catch {
      return file;
    }
  }
  return { ...file, uri: imageUris.get(ref.id) };
}

/** Uploads a newly picked image and remembers its preview for the new id. */
async function uploadImage(
  entityType: 'user' | 'organisation',
  entityId: string,
  file: Attachment,
): Promise<FileReference> {
  const ref = await uploadAttachment(entityType, entityId, file);
  if (file.uri) {
    imageUris.set(ref.id, file.uri);
  }
  return ref;
}

async function toMyProfile(node: UserNode): Promise<MyProfile> {
  myUserId = node.id;
  return {
    id: node.id,
    name: node.name,
    email: node.email ?? '',
    designation: node.designation,
    phone: node.phone ?? '',
    photo: await withImageUri(node.photo),
    hasPassword: node.hasPassword,
    address: node.address,
    city: node.city,
    state: node.state,
    pinCode: node.pinCode,
    country: node.country,
    role: BACKEND_ROLE_TO_APP[node.role],
    status: 'active',
    memberSince: node.joinedAt,
    activity: node.activity.edges.map(({ node: entry }) => ({
      ...entry,
      detail: entry.detail ?? undefined,
      tone: entry.tone.toLowerCase() as ActivityEntry['tone'],
    })),
  };
}

async function toOrganization(node: OrganisationNode): Promise<Organization> {
  organisationId = node.id;
  const { address, gstin, logo, invoiceLogo, signature, ...rest } = node;
  return {
    ...rest,
    address: address.address,
    city: address.city,
    state: address.state,
    pinCode: address.pinCode,
    country: address.country,
    gstNumber: gstin ?? '',
    logo: await withImageUri(logo),
    invoiceLogo: invoiceLogo && fromFileReference(invoiceLogo),
    signature: signature && fromFileReference(signature),
  };
}

/** A picked file uploaded (or a kept one passed on); null removes it. */
const fileInput = async (file: Attachment | null | undefined) =>
  file === undefined
    ? undefined
    : file && uploadImage('organisation', organisationId, file);

/**
 * UpdateOrganisationInput from the section that was saved. Text fields are
 * never null here: the backend clears one with "" and rejects null.
 */
async function organisationInput(changes: OrganizationUpdate) {
  const input: Record<string, unknown> = {};
  (
    [
      'name',
      'phone',
      'email',
      'website',
      'businessType',
      'industry',
      'registrationDetails',
      'invoicePrefix',
      'invoiceStartNumber',
      'invoiceFooter',
      'termsAndConditions',
      'gstRegistered',
      'gstState',
      'taxRates',
      'defaultTaxRate',
    ] as const
  ).forEach(key => {
    if (changes[key] !== undefined) {
      input[key] = changes[key];
    }
  });
  // The address section saves its fields together, as one AddressInput.
  if (changes.address !== undefined) {
    input.address = {
      line1: changes.address,
      city: changes.city,
      state: changes.state,
      pincode: changes.pinCode,
      country: changes.country || null,
    };
  }
  if (changes.country !== undefined) {
    input.country = changes.country;
  }
  if (changes.gstNumber !== undefined) {
    // Not registered: null clears the GSTIN ("" is not a valid GSTIN).
    const gstin = normalizeGstin(changes.gstNumber);
    input.gstin = gstin || null;
    if (gstin) {
      // GST state code for invoices: the GSTIN's first two digits.
      input.stateCode = gstin.slice(0, 2);
    }
  }
  const [logo, invoiceLogo, signature] = await Promise.all([
    fileInput(changes.logo),
    fileInput(changes.invoiceLogo),
    fileInput(changes.signature),
  ]);
  Object.assign(
    input,
    Object.fromEntries(
      Object.entries({ logo, invoiceLogo, signature }).filter(
        ([, value]) => value !== undefined,
      ),
    ),
  );
  return input;
}

export const profileApi = {
  /** me: the signed-in person, their organisation and permission codes. */
  fetchSession: async (): Promise<Session> => {
    const { me } = await graphqlRequest<{
      me: {
        permissions: string[];
        user: UserNode;
        organisation: OrganisationNode;
      };
    }>(
      `query AppSession {
        me {
          permissions
          user { ...MyUserFields }
          organisation { ...OrganisationFields }
        }
      }
      ${MY_USER_FIELDS}
      ${ORGANISATION_FIELDS}`,
    );
    const [profile, organization] = await Promise.all([
      toMyProfile(me.user),
      toOrganization(me.organisation),
    ]);
    return { profile, organization, permissions: me.permissions };
  },

  updateOrganization: async (
    changes: OrganizationUpdate,
  ): Promise<Organization> => {
    const { updateOrganisation } = await graphqlRequest<{
      updateOrganisation: OrganisationNode;
    }>(
      `mutation AppOrganisationSettings($input: UpdateOrganisationInput!) {
        updateOrganisation(input: $input) { ...OrganisationFields }
      }
      ${ORGANISATION_FIELDS}`,
      { input: await organisationInput(changes) },
    );
    return toOrganization(updateOrganisation);
  },

  /** updateMyProfile. Text is sent as typed ("" clears it); the phone isn't edited here. */
  updateProfile: async (changes: ProfileInput): Promise<MyProfile> => {
    const { photo, ...text } = changes;
    // The phone is the sign-in and isn't edited here (undefined isn't sent).
    const input: Record<string, unknown> = { ...text, phone: undefined };
    if (photo !== undefined) {
      input.photo = photo && (await uploadImage('user', myUserId, photo));
    }
    const { updateMyProfile } = await graphqlRequest<{
      updateMyProfile: UserNode;
    }>(
      `mutation AppProfile($input: UpdateMyProfileInput!) {
        updateMyProfile(input: $input) { ...MyUserFields }
      }
      ${MY_USER_FIELDS}`,
      { input },
    );
    return toMyProfile(updateMyProfile);
  },

  /** changeMyPassword: a wrong current password says so, not "wrong login". */
  changePassword: async ({
    currentPassword,
    newPassword,
  }: PasswordChangeInput): Promise<void> => {
    try {
      await graphqlRequest(
        `mutation ChangeMyPassword($currentPassword: String!, $newPassword: String!) {
          changeMyPassword(currentPassword: $currentPassword, newPassword: $newPassword)
        }`,
        { currentPassword, newPassword },
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_CREDENTIALS') {
        throw new ApiError(
          PROFILE_STRINGS.currentPasswordWrong,
          error.status,
          error.data,
          error,
        );
      }
      throw error;
    }
  },
};
