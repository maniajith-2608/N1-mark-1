import { createMMKV, type MMKV } from 'react-native-mmkv';

/** The small storage interface the saved session needs. */
export type KeyValueStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

let mmkv: MMKV | undefined;

/**
 * iOS / Android: MMKV, a file in the app's own data folder. It survives the
 * app being killed, and goes with an uninstall or "Clear storage" (Android
 * backups are off, so a reinstall starts signed out). The web build uses
 * keyValueStorage.web.ts.
 */
export function keyValueStorage(): KeyValueStorage {
  const store = (mmkv ??= createMMKV({ id: 'n1.session' }));
  return {
    getItem: key => store.getString(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: key => {
      store.remove(key);
    },
  };
}
