/** The small storage interface the saved session needs. */
export type KeyValueStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

/** Web: the browser's localStorage, so a refresh stays signed in. */
export function keyValueStorage(): KeyValueStorage | null {
  return (
    (globalThis as { localStorage?: KeyValueStorage }).localStorage ?? null
  );
}
