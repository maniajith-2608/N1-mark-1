import { delay, respond } from '../../../services/mock/mockServer';
import { ApiError } from '../../../services/api';
import { shortNameOf } from '../organization';
import type {
  MyProfile,
  Organization,
  OrganizationUpdate,
  PasswordChangeInput,
  ProfileInput,
  Session,
} from '../types';
import { PROFILE_STRINGS } from '../constants';
import { MOCK_SESSION } from './mockData';

/** Typed as the current password, it is rejected as wrong. */
export const MOCK_WRONG_PASSWORD = 'wrong-password-1';

// Stands in for profileApi under Jest (jest.setup.js).
let session: Session = MOCK_SESSION;

export const profileApi = {
  fetchSession: () => respond(session),
  updateOrganization: async (
    changes: OrganizationUpdate,
  ): Promise<Organization> => {
    const organization = { ...session.organization, ...changes };
    if (changes.name !== undefined) {
      organization.shortName = shortNameOf(changes.name);
    }
    session = { ...session, organization };
    return respond(session.organization);
  },
  updateProfile: async (changes: ProfileInput): Promise<MyProfile> => {
    session = { ...session, profile: { ...session.profile, ...changes } };
    return respond(session.profile);
  },
  changePassword: async (input: PasswordChangeInput): Promise<void> => {
    await delay();
    if (input.currentPassword === MOCK_WRONG_PASSWORD) {
      throw new ApiError(PROFILE_STRINGS.currentPasswordWrong, 200, undefined, {
        code: 'INVALID_CREDENTIALS',
      });
    }
    session = {
      ...session,
      profile: { ...session.profile, hasPassword: true },
    };
  },
  reset: () => {
    session = MOCK_SESSION;
  },
};
