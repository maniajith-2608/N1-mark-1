const originalApiUrl = process.env.N1_API_URL;

afterEach(() => {
  if (originalApiUrl === undefined) {
    delete process.env.N1_API_URL;
  } else {
    process.env.N1_API_URL = originalApiUrl;
  }
  jest.restoreAllMocks();
  jest.resetModules();
});

test.each([
  ['web', undefined, '/api'],
  ['web', '', '/api'],
  [
    'web',
    'https://api.staging.app.none1.in',
    'https://api.staging.app.none1.in',
  ],
  ['android', 'https://api.staging.app.none1.in', 'http://10.0.2.2:3000'],
  ['ios', 'https://api.staging.app.none1.in', 'http://127.0.0.1:3000'],
])('API URL for %s with N1_API_URL=%s', (platform, apiUrl, expected) => {
  jest.resetModules();
  const { Platform } = require('react-native');
  jest
    .spyOn(Platform, 'select')
    .mockImplementation(
      (values: Record<string, string>) => values[platform] ?? values.default,
    );
  if (apiUrl === undefined) {
    delete process.env.N1_API_URL;
  } else {
    process.env.N1_API_URL = apiUrl;
  }

  expect(require('../env').API_BASE_URL).toBe(expected);
});
