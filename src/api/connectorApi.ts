import { CONNECTOR_PREFS_STORAGE_KEY } from '@/constants/storage';
import type { Connector } from '@/types/api';
import { apiClient } from './apiClient';

/** What this browser remembers about the user's own preferences.
 *
 *  `lastSelected` is the combination they last worked with. A connector is a capability
 *  the user may grant the agent, and in practice the same person grants roughly the same
 *  ones every time — so a new conversation starts pre-selected on what they chose last
 *  rather than making them pick the same set again. It is a convenience, never a
 *  requirement: a conversation with nothing selected runs perfectly well.
 *
 *  `custom` holds sources they added themselves. Both are localStorage rather than
 *  backend state because both are about this person's habits, not about any one
 *  conversation — which of them a given conversation actually draws on is the session's
 *  business (PATCH /sessions/{id}/data-source). */
interface ConnectorPrefs {
  lastSelected: string[];
  custom: Connector[];
}

const readPrefs = (): ConnectorPrefs => {
  try {
    const raw = localStorage.getItem(CONNECTOR_PREFS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<ConnectorPrefs>;
      return { lastSelected: parsed.lastSelected ?? [], custom: parsed.custom ?? [] };
    }
  } catch {
    // A corrupt entry reads as "no preferences" and gets overwritten on the next write.
  }
  return { lastSelected: [], custom: [] };
};

/** The combination to start a fresh conversation on. */
export const readRememberedSelection = (): string[] => readPrefs().lastSelected;

/** Remembers what the user is working with now, so the next conversation opens on it. */
export const rememberSelection = (connectorIds: string[]): void => {
  writePrefs({ ...readPrefs(), lastSelected: connectorIds });
};

const writePrefs = (prefs: ConnectorPrefs): void => {
  localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify(prefs));
};

/** What data sources exist and whether the user may reach them. The user's own custom
 *  additions are merged on top of what the backend serves. Whether a given conversation
 *  is drawing on one is the session's business (useConnectors joins the two). */
export const listCatalogue = async (): Promise<Connector[]> => {
  const catalogue = await apiClient.get<Connector[]>('/connectors');
  return [...catalogue, ...readPrefs().custom];
};

/** Adds a source to the catalogue and answers its id, so the caller can attach it to the
 *  session it was added from — adding one IS choosing it.
 *
 *  Still localStorage rather than an endpoint: the backend has no way to register a
 *  source yet, and this is the half of the model that is genuinely the user's. */
export const addConnector = (name: string): Promise<string> => {
  const prefs = readPrefs();
  const id = `custom-${crypto.randomUUID()}`;
  writePrefs({
    ...prefs,
    custom: [
      ...prefs.custom,
      {
        id,
        name,
        description: 'Custom data source',
        category: 'Custom',
        status: 'available',
        custom: true,
      },
    ],
  });
  return Promise.resolve(id);
};
