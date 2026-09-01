import type { Artifact, ArtifactShare, ArtifactShareUpdate } from '@/types/api/index';

import { apiClient } from './apiClient';

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

/** Toggles the pin. One endpoint and no body: the backend decides the direction, and the
 *  Artifact it answers with carries the `pinnedAt` that resulted — which is what the
 *  button reads its new state from. Asserting a direction from state the client read a
 *  while ago would be guessing at what the server already knows. */
export const toggleArtifactPin = (id: string) => apiClient.post<Artifact>(`/artifacts/${id}/pin`);

/** Publishing is what makes an Artifact available to other people — and what sharing
 *  rests on. The two directions are split by method rather than a body flag, and the
 *  backend stamps `publishedAt` itself: the client never sends a time it believes it is. */
export const publishArtifact = (id: string) => apiClient.post<Artifact>(`/artifacts/${id}/publish`);

/** Takes an Artifact off the shelf — the reverse of `publishArtifact`, on the same path.
 *
 *  "Unpublish" rather than "delete" because that is what actually happens: the Gallery
 *  lists published work, and removing something from it does not destroy the Artifact,
 *  which goes on living in the conversation that produced it. */
export const unpublishArtifact = (id: string) => apiClient.delete<void>(`/artifacts/${id}/publish`);

/** The share list answers inside a `shares` envelope rather than as a bare array. */
interface ArtifactSharesResponse {
  shares?: ArtifactShare[];
}

/** Who this Artifact is already shared with. The dialog opens on this list rather than
 *  on an empty field: sharing is an edit to something that exists, not a fresh act each
 *  time.
 *
 *  The envelope is unwrapped here, and read defensively for the same reason the directory
 *  search is: a body without `shares` has to come out as "nobody yet" rather than as
 *  something the dialog will try to map over. */
export const listArtifactShares = async (id: string): Promise<ArtifactShare[]> => {
  const body = await apiClient.get<ArtifactSharesResponse>(`/artifacts/${id}/share`);
  return Array.isArray(body?.shares) ? body.shares : [];
};

/** Changes the share list by delta. PATCH with what to add and what to remove, rather
 *  than PUT with the whole list: sending the list would make two people editing the same
 *  Artifact overwrite each other, the second one silently undoing the first. */
export const updateArtifactShares = (id: string, update: ArtifactShareUpdate) =>
  apiClient.patch<ArtifactShare[]>(`/artifacts/${id}/share`, update);
