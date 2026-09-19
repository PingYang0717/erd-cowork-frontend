import { useCallback, useSyncExternalStore } from 'react';

import { readDefaultConnectors, writeDefaultConnectors } from '@/api/connectorApi';
import { CONNECTOR_PREFS_STORAGE_KEY } from '@/constants/storage';

/** The user's default Connectors (CONTEXT.md, 預設 Connectors), read and written.
 *
 *  The one seam between "the user has a default combination" and where it is kept. It
 *  is this browser's localStorage today; it becomes a backend user setting later, and
 *  the shape here — a value that is what it is now, and one call that replaces it —
 *  is the same either way. Consumers do not learn which. */
interface DefaultConnectors {
  ids: string[];
  setIds: (ids: string[]) => void;
}

const listeners = new Set<() => void>();

// The snapshot has to be the same reference until the value changes, or React sees a
// new array every render and loops. Keyed on the raw string, so a write from another
// tab (the `storage` event) invalidates it too.
let cached: { raw: string | null; ids: string[] } | null = null;

const snapshot = (): string[] => {
  const raw = localStorage.getItem(CONNECTOR_PREFS_STORAGE_KEY);
  if (cached === null || cached.raw !== raw) {
    cached = { raw, ids: readDefaultConnectors() };
  }
  return cached.ids;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

export const useDefaultConnectors = (): DefaultConnectors => {
  const ids = useSyncExternalStore(subscribe, snapshot, snapshot);
  const setIds = useCallback((next: string[]) => {
    writeDefaultConnectors(next);
    listeners.forEach((listener) => listener());
  }, []);
  return { ids, setIds };
};
