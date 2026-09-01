import type { Artifact } from '@/types/api/index';

import { apiClient } from './apiClient';

export interface ArtifactShareResult {
  url: string;
  artifact: Artifact;
}

export const listArtifacts = () => apiClient.get<Artifact[]>('/artifacts');

/** The backend returns the artifact's HTML as text/html directly. `responseType` is
 *  explicit so a document that happens to parse as JSON still arrives as text. `r` is a
 *  cache-buster carrying the reload nonce, sent only after an actual reload (nonce > 0)
 *  so the initial load stays cache-friendly. */
export const getArtifactContent = (artifactId: string, reloadNonce: number) =>
  apiClient.get<string>(`/artifacts/${encodeURIComponent(artifactId)}`, {
    params: reloadNonce > 0 ? { r: reloadNonce } : undefined,
    responseType: 'text',
  });

/** The artifact's source before assembly (text/plain). Read by the chat bubble's
 *  "view HTML" panel, and the text a later turn iterates from. */
export const getArtifactRawHtml = (artifactId: string, signal?: AbortSignal) =>
  apiClient.get<string>(`/artifacts/${artifactId}/raw`, {
    responseType: 'text',
    signal,
  });

/** Toggles the pin. One endpoint, no body: which way it goes is the backend's call, not
 *  something the client asserts from state it may have read a while ago. */
export const toggleArtifactPin = (id: string) => apiClient.post<Artifact>(`/artifacts/${id}/pin`);

/** Publishing is what makes an Artifact available to other people — and what sharing
 *  rests on. The two directions are split by method rather than a body flag, and the
 *  backend stamps `publishedAt` itself: the client never sends a time it believes it is. */
export const publishArtifact = (id: string) => apiClient.post<Artifact>(`/artifacts/${id}/publish`);

/** Removes the Artifact. There is no separate unpublish: taking something off the shelf
 *  and deleting it are the same act here, so offering both would be two buttons for one
 *  outcome — and the one that sounded reversible would not be. */
export const deleteArtifact = (id: string) => apiClient.delete<void>(`/artifacts/${id}`);

export const shareArtifact = (id: string, targetIds: string[]) =>
  apiClient.post<ArtifactShareResult>(`/artifacts/${id}/share`, {
    targetIds,
  });
