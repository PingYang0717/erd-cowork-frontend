import { CONNECTOR_PREFS_STORAGE_KEY } from '@/constants/storage';
import type { Connector } from '@/types/api';
import { apiClient } from './apiClient';

/** The user's default sources (CONTEXT.md, 預設資料來源): the combination a new
 *  conversation opens the Connectors panel on. Theirs, not any conversation's — set in
 *  the preferences, and never written to a session on their behalf.
 *
 *  Kept in this browser for now. It belongs on the backend as a user setting, and will
 *  move there; `useDefaultSources` is the seam, and nothing else reads this key. */
interface ConnectorPrefs {
  defaultSources: string[];
  /** The earlier shape: the combination last submitted in any conversation, which the
   *  panel then opened new conversations on. Read once as the starting default so the
   *  move is silent; never written again. */
  lastSelected?: string[];
}

const readPrefs = (): ConnectorPrefs => {
  try {
    const raw = localStorage.getItem(CONNECTOR_PREFS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<ConnectorPrefs>;
      return { defaultSources: parsed.defaultSources ?? parsed.lastSelected ?? [] };
    }
  } catch {
    // A corrupt entry reads as "no preferences" and gets overwritten on the next write.
  }
  return { defaultSources: [] };
};

/** The user's default sources. Callers intersect it with the catalogue: an id the
 *  catalogue no longer serves cannot be offered, and must never reach the backend as
 *  part of a selection. */
export const readDefaultSources = (): string[] => readPrefs().defaultSources;

export const writeDefaultSources = (connectorIds: string[]): void => {
  localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify({ defaultSources: connectorIds }));
};

/** What data sources this user may reach. Whether a given conversation is drawing on one
 *  is the session's business — `useConnectors` holds the two side by side rather than
 *  folding them into one value. */
export const listCatalogue = () => apiClient.get<Connector[]>('/connectors');
