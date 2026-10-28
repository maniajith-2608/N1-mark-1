import type { N1ChecklistItem } from '../../shared/components';
import {
  MOCK_USERS,
  type MockUser,
  ORGANIZATION_CODE_LENGTH,
  ORGANIZATION_CODE_SUFFIX_LENGTH,
  PASSWORD_MIN_LENGTH,
  VERIFICATION_CODE_LENGTH,
} from './constants';

/** A random number for the organization code, e.g. "4821" (never starts with 0). */
export function randomCodeSuffix(): string {
  const min = 10 ** (ORGANIZATION_CODE_SUFFIX_LENGTH - 1);
  return String(
    min +
      Math.floor(Math.random() * (10 ** ORGANIZATION_CODE_SUFFIX_LENGTH - min)),
  );
}

/**
 * "ABC Engineering Pvt Ltd" + "4821" → "ABCENG-4821": the name's first letters
 * and digits, then a random number so shops with similar names get different
 * codes. Empty when the name has no letters or digits.
 */
export function generateOrganizationCode(name: string, suffix: string): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ORGANIZATION_CODE_LENGTH);
  return prefix && `${prefix}-${suffix}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Last 10 digits, so "+91 90000 00001" and "9000000001" match. */
const phoneKey = (phone: string) => phone.replace(/\D/g, '').slice(-10);

export type PasswordRules = {
  minLength: boolean;
  lettersAndNumbers: boolean;
  matches: boolean;
};

export function checkPassword(
  password: string,
  confirmPassword: string,
): PasswordRules {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    lettersAndNumbers: /[a-z]/i.test(password) && /\d/.test(password),
    matches: password.length > 0 && password === confirmPassword,
  };
}

/** True when every password rule passes. */
export function isPasswordValid(rules: PasswordRules): boolean {
  return rules.minLength && rules.lettersAndNumbers && rules.matches;
}

/** The rules as rows for N1Checklist. */
export function passwordChecklist(rules: PasswordRules): N1ChecklistItem[] {
  return [
    {
      label: `Minimum ${PASSWORD_MIN_LENGTH} characters`,
      done: rules.minLength,
    },
    { label: 'Letters and numbers', done: rules.lettersAndNumbers },
    { label: 'Passwords match', done: rules.matches },
  ];
}

/** Keeps only digits, capped at the code length. */
export function sanitizeCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, VERIFICATION_CODE_LENGTH);
}

export function isCompleteCode(code: string): boolean {
  return sanitizeCode(code).length === VERIFICATION_CODE_LENGTH;
}

/**
 * The mock user matching these credentials, or undefined. The login ID is an
 * email (case and spaces ignored) or a phone number (only digits count).
 */
export function findMockUser(
  loginId: string,
  password: string,
): MockUser | undefined {
  const email = loginId.trim().toLowerCase();
  const phone = isValidEmail(loginId) ? '' : phoneKey(loginId);
  return MOCK_USERS.find(
    user =>
      (user.email === email ||
        (phone !== '' && phoneKey(user.phone) === phone)) &&
      user.password === password,
  );
}
