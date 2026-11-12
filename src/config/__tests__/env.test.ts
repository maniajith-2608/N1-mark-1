const originalApiUrl = process.env.N1_API_URL;
const originalAppEnv = process.env.N1_APP_ENV;

const restore = (key: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

afterEach(() => {
  restore('N1_API_URL', originalApiUrl);
  restore('N1_APP_ENV', originalAppEnv);
  jest.restoreAllMocks();
  jest.resetModules();
});

const loadEnvOn = (platform: string) => {
  jest.resetModules();
  const { Platform } = require('react-native');
  jest
    .spyOn(Platform, 'select')
    .mockImplementation(
      (values: Record<string, string>) => values[platform] ?? values.default,
    );
  return require('../env');
};

test.each([
  ['web', undefined, '/api'],
  ['web', '', '/api'],
  [
    'web',
    'https://api.staging.app.none1.in',
    'https://api.staging.app.none1.in',
  ],
  [
    'android',
    'https://api.staging.app.none1.in',
    'https://api.staging.app.none1.in',
  ],
  ['ios', undefined, 'https://api.staging.app.none1.in'],
])('API URL for %s with N1_API_URL=%s', (platform, apiUrl, expected) => {
  delete process.env.N1_APP_ENV;
  restore('N1_API_URL', apiUrl);

  expect(loadEnvOn(platform).API_BASE_URL).toBe(expected);
});

test.each([
  [undefined, 'android', 'https://api.staging.app.none1.in'],
  ['dev', 'android', 'https://api.staging.app.none1.in'],
  ['sit', 'ios', 'https://api.staging.app.none1.in'],
  ['prod', 'android', 'https://api.app.none1.in'],
  ['prod', 'ios', 'https://api.app.none1.in'],
  ['prod', 'web', '/api'],
])('N1_APP_ENV=%s on %s calls %s', (appEnv, platform, expected) => {
  delete process.env.N1_API_URL;
  restore('N1_APP_ENV', appEnv);

  expect(loadEnvOn(platform).API_BASE_URL).toBe(expected);
});

test('N1_APP_ENV defaults to sit', () => {
  delete process.env.N1_APP_ENV;

  expect(loadEnvOn('android').APP_ENV).toBe('sit');
});
