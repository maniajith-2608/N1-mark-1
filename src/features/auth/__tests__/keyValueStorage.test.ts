const mockData = new Map<string, string>();
const mockCreateMMKV = jest.fn(() => ({
  getString: (key: string) => mockData.get(key),
  set: (key: string, value: string) => {
    mockData.set(key, value);
  },
  remove: (key: string) => mockData.delete(key),
}));

jest.mock('react-native-mmkv', () => ({ createMMKV: mockCreateMMKV }));

// jest.setup.js swaps this module for the web version; test the native one.
const { keyValueStorage } =
  jest.requireActual<typeof import('../keyValueStorage')>('../keyValueStorage');

test('native storage saves, reads and removes values in MMKV', () => {
  const storage = keyValueStorage();

  expect(storage.getItem('n1.session.role')).toBeNull();
  storage.setItem('n1.session.role', 'qc');
  expect(storage.getItem('n1.session.role')).toBe('qc');
  expect(mockData.get('n1.session.role')).toBe('qc');

  storage.removeItem('n1.session.role');
  expect(storage.getItem('n1.session.role')).toBeNull();
});

test('every call shares one MMKV instance for the session', () => {
  keyValueStorage().setItem('n1.session.tokens', '{}');

  expect(keyValueStorage().getItem('n1.session.tokens')).toBe('{}');
  expect(mockCreateMMKV).toHaveBeenCalledTimes(1);
  expect(mockCreateMMKV).toHaveBeenCalledWith({ id: 'n1.session' });
});
