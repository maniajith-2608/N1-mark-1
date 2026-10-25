import { PASSWORD_MIN_LENGTH } from '../../config/constants';
import { parseDisplayDate } from './formatters';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS = { min: 10, max: 13 } as const;

export const isBlank = (value: string | undefined | null) =>
  !value || value.trim().length === 0;

export const isEmail = (value: string) => EMAIL_PATTERN.test(value.trim());

/**
 * Indian GSTIN: 2-digit state code, 10-character PAN, entity number, "Z",
 * check character, e.g. "33ABCDE1234F1Z5". Case and spaces don't matter.
 */
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** "33abcde1234f1z5 " → "33ABCDE1234F1Z5" */
export const normalizeGstin = (value: string) =>
  value.replace(/\s/g, '').toUpperCase();

export const isGstin = (value: string) =>
  GSTIN_PATTERN.test(normalizeGstin(value));

/** Indian PIN code: 6 digits, not starting with 0, e.g. "600098". */
const PIN_PATTERN = /^[1-9]\d{5}$/;

export const isPinCode = (value: string) => PIN_PATTERN.test(value.trim());

/** Allows +, spaces and dashes; counts the digits only. */
export function isPhone(value: string): boolean {
  if (/[^\d\s+()-]/.test(value)) {
    return false;
  }
  const digits = value.replace(/\D/g, '').length;
  return digits >= PHONE_DIGITS.min && digits <= PHONE_DIGITS.max;
}

/**
 * The +91… form the backend stores and signs in with: "98765 43210",
 * "+91 98765-43210" and "919876543210" all become "+919876543210".
 */
export function toE164Phone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+')) {
    return `+${digits}`;
  }
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

export const isNumeric =(value: string) =>
  value.trim() !== '' && Number.isFinite(Number(value));

export const isDisplayDate = (value: string) =>
  parseDisplayDate(value) !== undefined;

export type PasswordRules = {
  minLength: boolean;
  lettersAndNumbers: boolean;
  matches: boolean;
};

export function checkPassword(
  password: string,
  confirm: string,
): PasswordRules {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    lettersAndNumbers: /[a-z]/i.test(password) && /\d/.test(password),
    matches: password.length > 0 && password === confirm,
  };
}

export const isStrongPassword = (password: string) => {
  const rules = checkPassword(password, password);
  return rules.minLength && rules.lettersAndNumbers;
};

/** Turns user text into a number; blank or invalid text becomes 0. */
export function toNumber(value: string | number | undefined): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
