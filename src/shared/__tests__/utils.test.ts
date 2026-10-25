import {
  checkPassword,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatDayMonth,
  formatFileSize,
  formatLongDate,
  formatRelativeTime,
  formatTime,
  isBlank,
  isDisplayDate,
  isEmail,
  isGstin,
  normalizeGstin,
  isNumeric,
  isPhone,
  isStrongPassword,
  toE164Phone,
  parseDisplayDate,
  percentOf,
  toDisplayDate,
  toNumber,
} from '../utils';

describe('formatCurrency', () => {
  test.each([
    [0, '₹0'],
    [999, '₹999'],
    [42000, '₹42,000'],
    [1842000, '₹18,42,000'],
    [123456789, '₹12,34,56,789'],
    [26.666, '₹26.67'],
    [-1200, '-₹1,200'],
  ])('%p → %s', (amount, expected) =>
    expect(formatCurrency(amount)).toBe(expected),
  );
});

test.each([
  [1860000, '₹18.6L'],
  [100000, '₹1L'],
  [12500000, '₹1.3Cr'],
  [42000, '₹42,000'],
  [-250000, '-₹2.5L'],
])('formatCompactCurrency %p → %s', (amount, expected) =>
  expect(formatCompactCurrency(amount)).toBe(expected),
);

test('date formatting', () => {
  expect(formatDate('2026-09-12')).toBe('Sep 12, 2026');
  expect(formatDayMonth('2026-10-02')).toBe('02 Oct');
  expect(formatLongDate('2026-10-02')).toBe('02 Oct 2026');
  expect(formatTime('2026-10-02T09:45:00')).toBe('09:45 AM');
  expect(formatTime('2026-10-02T13:05:00')).toBe('01:05 PM');
  expect(formatDate('not a date')).toBe('');
  expect(formatDate(undefined)).toBe('');
  expect(formatTime(undefined)).toBe('');
  expect(formatLongDate('')).toBe('');
});

test('formatRelativeTime', () => {
  const now = new Date('2026-09-30T12:00:00').getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();
  expect(formatRelativeTime(ago(10_000), now)).toBe('Just now');
  expect(formatRelativeTime(ago(5 * 60_000), now)).toBe('5m ago');
  expect(formatRelativeTime(ago(2 * 3_600_000), now)).toBe('2h ago');
  expect(formatRelativeTime(ago(3 * 86_400_000), now)).toBe('3d ago');
  expect(formatRelativeTime('2026-09-12T09:00:00', now)).toBe('Sep 12, 2026');
  expect(formatRelativeTime('garbage', now)).toBe('');
});

test('formatFileSize and percentOf', () => {
  expect(formatFileSize(1.2 * 1024 * 1024)).toBe('1.2 MB');
  expect(formatFileSize(340 * 1024)).toBe('340 KB');
  expect(formatFileSize(10)).toBe('1 KB');
  expect(percentOf(12, 30)).toBe(40);
  expect(percentOf(1, 0)).toBe(0);
});

test('display dates round-trip and reject impossible dates', () => {
  expect(parseDisplayDate('02/10/2026')).toBe('2026-10-02');
  expect(parseDisplayDate('31/02/2026')).toBeUndefined();
  expect(parseDisplayDate('2026-10-02')).toBeUndefined();
  expect(toDisplayDate('2026-10-02')).toBe('02/10/2026');
  expect(toDisplayDate('')).toBe('');
  expect(isDisplayDate('01/01/2027')).toBe(true);
});

test('validators', () => {
  expect(isBlank('  ')).toBe(true);
  expect(isBlank(undefined)).toBe(true);
  expect(isBlank('a')).toBe(false);
  expect(isEmail('a@b.co')).toBe(true);
  expect(isEmail('a@b')).toBe(false);
  expect(isPhone('+91 98765 43210')).toBe(true);
  expect(isPhone('12345')).toBe(false);
  expect(isPhone('98765abc43210')).toBe(false);
  expect(isNumeric('12.5')).toBe(true);
  expect(isNumeric('')).toBe(false);
  expect(isNumeric('1a')).toBe(false);
  expect(toNumber('3')).toBe(3);
  expect(toNumber('x')).toBe(0);
  expect(toNumber(undefined)).toBe(0);
  expect(toNumber(4)).toBe(4);
});

test('password rules', () => {
  expect(checkPassword('abc1234567', 'abc1234567')).toEqual({
    minLength: true,
    lettersAndNumbers: true,
    matches: true,
  });
  expect(checkPassword('abcdefghij', 'x')).toEqual({
    minLength: true,
    lettersAndNumbers: false,
    matches: false,
  });
  expect(checkPassword('', '')).toMatchObject({ matches: false });
  expect(isStrongPassword('short1')).toBe(false);
  expect(isStrongPassword('longer1234')).toBe(true);
});

test('GST numbers follow the 15-character GSTIN format', () => {
  expect(isGstin('33ABCDE1234F1Z5')).toBe(true);
  // Case and spaces don't matter.
  expect(isGstin(' 33abcde1234f1z5 ')).toBe(true);
  expect(normalizeGstin(' 33abcde 1234f1z5')).toBe('33ABCDE1234F1Z5');
  expect(isGstin('33ABCDE1234F1Z')).toBe(false); // too short
  expect(isGstin('AAABCDE1234F1Z5')).toBe(false); // state code
  expect(isGstin('33ABCDE1234F1X5')).toBe(false); // 14th must be Z
});

test('toE164Phone gives the +91… form the backend matches', () => {
  expect(toE164Phone('98765 43210')).toBe('+919876543210');
  expect(toE164Phone('+91 98765-43210')).toBe('+919876543210');
  expect(toE164Phone('919876543210')).toBe('+919876543210');
});
