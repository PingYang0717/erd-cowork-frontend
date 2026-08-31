import type { Artifact } from '@/types/api/index';

import { apiClient } from './apiClient';

export interface ArtifactShareResult {
  url: string;
  artifact: Artifact;
}

export const artifactApi = {
  listArtifacts: () => apiClient.get<Artifact[]>('/artifacts'),

  /** The backend returns the artifact's HTML as text/html directly. `responseType`
   *  is explicit so a document that happens to parse as JSON still arrives as text.
   *  `r` is a cache-buster carrying the reload nonce, sent only after an actual
   *  reload (nonce > 0) so the initial load stays cache-friendly. */
  getContent: (artifactId: string, reloadNonce: number) =>
    apiClient.get<string>(`/artifacts/${encodeURIComponent(artifactId)}`, {
      params: reloadNonce > 0 ? { r: reloadNonce } : undefined,
      responseType: 'text',
    }),

  /** The artifact's source before assembly (text/plain). Read by the chat bubble's
   *  "view HTML" panel, and the text a later turn iterates from. */
  getRawHtml: (artifactId: string, signal?: AbortSignal) =>
    apiClient.get<string>(`/artifacts/${artifactId}/raw`, {
      responseType: 'text',
      signal,
    }),

  /** Toggles the pin. One endpoint, no body: which way it goes is the backend's call,
   *  not something the client asserts from state it may have read a while ago. */
  togglePin: (id: string) => apiClient.post<Artifact>(`/artifacts/${id}/pin`),

  /** Publishing is what makes an Artifact available to other people. The two
   *  directions are split by method rather than a body flag, and the backend stamps
   *  `publishedAt` itself — the client never sends a time it believes it is. */
  publish: (id: string) => apiClient.post<Artifact>(`/artifacts/${id}/publish`),

  /** No UI reaches this yet: unpublishing belongs on the Artifact management page,
   *  which does not exist. The function is here so that page starts from the contract
   *  rather than rediscovering it. */
  unpublish: (id: string) => apiClient.delete<Artifact>(`/artifacts/${id}/publish`),

  // Live since 10e61cc: the Gallery card's delete and the share dialog both reach the
  // backend for real (ADR-0006).
  deleteArtifact: (id: string) => apiClient.delete<void>(`/artifacts/${id}`),

  share: (id: string, targetIds: string[]) =>
    apiClient.post<ArtifactShareResult>(`/artifacts/${id}/share`, {
      targetIds,
    }),
};
