import {
  checkPassword,
  findMockUser,
  generateOrganizationCode,
  randomCodeSuffix,
  isCompleteCode,
  isPasswordValid,
  isValidEmail,
  passwordChecklist,
  sanitizeCode,
} from '../utils';

describe('generateOrganizationCode', () => {
  test('uses the first letters and digits, upper-cased, then the number', () => {
    expect(generateOrganizationCode('ABC Engineering Pvt Ltd', '4821')).toBe(
      'ABCENG-4821',
    );
    expect(generateOrganizationCode('n1 labs', '1007')).toBe('N1LABS-1007');
  });

  test('ignores punctuation and handles short or empty names', () => {
    expect(generateOrganizationCode('A&B', '4821')).toBe('AB-4821');
    expect(generateOrganizationCode('  ', '4821')).toBe('');
  });
});

describe('randomCodeSuffix', () => {
  test('is four digits that never start with 0', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(randomCodeSuffix()).toMatch(/^[1-9][0-9]{3}$/);
    }
  });
});

describe('isValidEmail', () => {
  test.each([
    ['owner@abc.com', true],
    ['  owner@abc.com  ', true],
    ['owner@abc', false],
    ['owner abc.com', false],
    ['', false],
  ])('%p → %p', (email, expected) => {
    expect(isValidEmail(email)).toBe(expected);
  });
});

describe('checkPassword', () => {
  test('all rules pass for a strong matching password', () => {
    expect(checkPassword('secret1234', 'secret1234')).toEqual({
      minLength: true,
      lettersAndNumbers: true,
      matches: true,
    });
  });

  test('flags short, letters-only and mismatched passwords', () => {
    expect(checkPassword('abc', 'abd')).toEqual({
      minLength: false,
      lettersAndNumbers: false,
      matches: false,
    });
  });

  test('two empty passwords do not count as matching', () => {
    expect(checkPassword('', '').matches).toBe(false);
  });
});

describe('isPasswordValid', () => {
  test('needs every rule to pass', () => {
    expect(isPasswordValid(checkPassword('secret1234', 'secret1234'))).toBe(
      true,
    );
    expect(isPasswordValid(checkPassword('secret1234', 'secret1235'))).toBe(
      false,
    );
  });
});

describe('passwordChecklist', () => {
  test('maps rules to checklist rows', () => {
    expect(passwordChecklist(checkPassword('secret1234', 'x'))).toEqual([
      { label: 'Minimum 10 characters', done: true },
      { label: 'Letters and numbers', done: true },
      { label: 'Passwords match', done: false },
    ]);
  });
});

describe('verification code helpers', () => {
  test('sanitizeCode keeps digits only, capped at 6', () => {
    expect(sanitizeCode('12-34 56 78')).toBe('123456');
    expect(sanitizeCode('abc')).toBe('');
  });

  test('isCompleteCode needs exactly 6 digits', () => {
    expect(isCompleteCode('123456')).toBe(true);
    expect(isCompleteCode('12345')).toBe(false);
  });
});

describe('findMockUser', () => {
  test('matches each role and rejects bad credentials', () => {
    expect(findMockUser('admin@n1.com', 'Admin@123')?.role).toBe('admin');
    expect(findMockUser('supervisor@n1.com', 'Supervisor@123')?.role).toBe(
      'supervisor',
    );
    expect(findMockUser(' Operator@N1.com ', 'Operator@123')?.role).toBe(
      'operator',
    );
    expect(findMockUser('qc@n1.com', 'Qc@12345')?.role).toBe('qc');
    expect(findMockUser('admin@n1.com', 'Qc@12345')).toBeUndefined();
    expect(findMockUser('nobody@n1.com', 'Admin@123')).toBeUndefined();
  });

  test('matches a phone number, ignoring spaces and the country code', () => {
    expect(findMockUser('9000000001', 'Admin@123')?.role).toBe('admin');
    expect(findMockUser('+91 90000 00004', 'Qc@12345')?.role).toBe('qc');
    expect(findMockUser('9000000001', 'Qc@12345')).toBeUndefined();
    expect(findMockUser('9999999999', 'Admin@123')).toBeUndefined();
  });
});
