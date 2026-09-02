import type { Artifact, ArtifactShareUpdate, DirectoryEntry } from '@/types/api/index';

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

/** What the pin endpoint answers with. Not an `Artifact`: it names the subject
 *  `artifactId` rather than `id`, and carries only what the toggle settled. */
export interface ArtifactPinResult {
  artifactId: string;
  pinnedAt: string | null;
  owner: string;
  isOwn: boolean;
}

/** Toggles the pin. One endpoint and no body: the backend decides the direction, and the
 *  answer carries the `pinnedAt` that resulted — which is what the button reads its new
 *  state from. Asserting a direction from state the client read a while ago would be
 *  guessing at what the server already knows. */
export const toggleArtifactPin = (id: string) =>
  apiClient.post<ArtifactPinResult>(`/artifacts/${id}/pin`);

/** Publishing is what makes an Artifact available to other people — and what sharing
 *  rests on. It carries the title the Artifact goes on the shelf under: the Gallery names
 *  a card by it, so it is the user's to write rather than the run's to inherit.
 *
 *  The two directions are split by method rather than a body flag, and the backend stamps
 *  `publishedAt` itself: the client never sends a time it believes it is. */
export const publishArtifact = (id: string, title: string) =>
  apiClient.post<Artifact>(`/artifacts/${id}/publish`, { title });

/** Takes an Artifact off the shelf — the reverse of `publishArtifact`, on the same path.
 *
 *  "Unpublish" rather than "delete" because that is what actually happens: the Gallery
 *  lists published work, and removing something from it does not destroy the Artifact,
 *  which goes on living in the conversation that produced it. */
export const unpublishArtifact = (id: string) => apiClient.delete<void>(`/artifacts/${id}/publish`);

/** Who this Artifact is already shared with. The dialog opens on this list rather than
 *  on an empty field: sharing is an edit to something that exists, not a fresh act each
 *  time.
 *
 *  Rows come back in the same shape the directory search returns, so a recipient already
 *  on the list reads with its name rather than as a bare id — no mapping in between.
 *  Narrowed rather than trusted: a body that is not a list has to come out as "nobody
 *  yet", not as something the dialog will try to map over. */
export const listArtifactShares = async (id: string): Promise<DirectoryEntry[]> => {
  const body = await apiClient.get<DirectoryEntry[]>(`/artifacts/${id}/share`);
  return Array.isArray(body) ? body : [];
};

/** Changes the share list by delta. PATCH with what to add and what to remove, rather
 *  than PUT with the whole list: sending the list would make two people editing the same
 *  Artifact overwrite each other, the second one silently undoing the first. */
export const updateArtifactShares = (id: string, update: ArtifactShareUpdate) =>
  apiClient.patch<DirectoryEntry[]>(`/artifacts/${id}/share`, update);
