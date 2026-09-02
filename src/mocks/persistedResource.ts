/**
 * Backs a mock MSW resource with a named JSON collection in localStorage,
 * so handlers behave like a tiny persisted "database" that survives reloads.
 */
export const createPersistedResource = <T>(storageKey: string, seed: T[]) => {
  const read = (): T[] => {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) {
      localStorage.setItem(storageKey, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T[];
  };

  const write = (items: T[]): void => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  };

  return { read, write };
};
