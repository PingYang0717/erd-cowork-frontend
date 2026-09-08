import { CONNECTOR_PREFS_STORAGE_KEY } from '@/constants/storage';
import type { Connector } from '@/types/api';
import { apiClient } from './apiClient';

/** What this browser remembers about the user's own habits.
 *
 *  `lastSelected` is the combination they last worked with. The same person grants the
 *  agent roughly the same capabilities every time, so opening the panel on a conversation
 *  that has chosen nothing yet starts from what they picked last rather than from empty.
 *
 *  It is a default offered in the dialog and nothing more: it is never written to a
 *  session on the user's behalf. localStorage rather than backend state because it is
 *  about this person's habits, not about any one conversation — which sources a given
 *  conversation actually draws on is the session's business
 *  (PATCH /sessions/{id}/data-source). */
interface ConnectorPrefs {
  lastSelected: string[];
}

const readPrefs = (): ConnectorPrefs => {
  try {
    const raw = localStorage.getItem(CONNECTOR_PREFS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<ConnectorPrefs>;
      return { lastSelected: parsed.lastSelected ?? [] };
    }
  } catch {
    // A corrupt entry reads as "no preferences" and gets overwritten on the next write.
  }
  return { lastSelected: [] };
};

/** The combination to open the panel on when a conversation has chosen nothing yet.
 *  Callers intersect it with the catalogue: a remembered id the catalogue no longer
 *  serves cannot be offered, and must never reach the backend as part of a selection. */
export const readRememberedSelection = (): string[] => readPrefs().lastSelected;

/** Remembers what the user is working with now, so the next conversation opens on it. */
export const rememberSelection = (connectorIds: string[]): void => {
  localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify({ lastSelected: connectorIds }));
};

/** What data sources this user may reach. Whether a given conversation is drawing on one
 *  is the session's business — `useConnectors` holds the two side by side rather than
 *  folding them into one value. */
export const listCatalogue = () => apiClient.get<Connector[]>('/connectors');
