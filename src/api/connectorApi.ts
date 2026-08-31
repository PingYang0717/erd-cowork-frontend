import { CONNECTOR_PREFS_STORAGE_KEY } from '@/constants/storage';
import type { Connector } from '@/types/api/index';

import { apiClient } from './apiClient';

/** Custom sources the user added. Still localStorage: adding a source to the catalogue
 *  is a different act from attaching one to a conversation, and only the latter has an
 *  endpoint (PATCH /sessions/{id}/data-source). */
interface ConnectorPrefs {
  custom: Connector[];
}

function readPrefs(): ConnectorPrefs {
  try {
    const raw = localStorage.getItem(CONNECTOR_PREFS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<ConnectorPrefs>;
      return { custom: parsed.custom ?? [] };
    }
  } catch {
    // A corrupt entry reads as "no preferences" and gets overwritten on the next write.
  }
  return { custom: [] };
}

function writePrefs(prefs: ConnectorPrefs): void {
  localStorage.setItem(CONNECTOR_PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

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
