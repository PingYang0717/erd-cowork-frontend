import type { Artifact, ArtifactShareUpdate, DirectoryEntry } from '@/types/api';
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
  apiClient.get<string>(`/artifacts/${encodeURIComponent(artifactId)}/raw`, {
    responseType: 'text',
    signal,
  });

/** What the pin endpoint answers with. Not an `Artifact`: it names the subject
 *  `artifactId` rather than `id`, and carries only what the toggle settled.
 *
 *  Only `pinnedAt` is required — it is the one thing a pin toggle can actually
 *  change, and an answer without it says nothing. The rest are enrichments the
 *  cache merges when present: optional in the type so the hook must handle their
 *  absence, which is what "merged, not replaced" means. */
export interface ArtifactPinResult {
  artifactId?: string;
  pinnedAt: string | null;
  owner?: string;
  isOwn?: boolean;
}

/** Toggles the pin. One endpoint and no body: the backend decides the direction, and the
 *  answer carries the `pinnedAt` that resulted — which is what the button reads its new
 *  state from. Asserting a direction from state the client read a while ago would be
 *  guessing at what the server already knows.
 *
 *  PATCH, not POST: the call edits one field of something that already exists rather than
 *  creating anything. */
export const toggleArtifactPin = (id: string) => apiClient.patch<ArtifactPinResult>(`/artifacts/${id}/pin`);

/** Publishing is what makes an Artifact available to other people — and what sharing
 *  rests on. It carries the title the Artifact goes on the shelf under: the Gallery names
 *  a card by it, so it is the user's to write rather than the run's to inherit.
 *
 *  The two directions are split by method rather than a body flag, and the backend stamps
 *  `publishedAt` itself: the client never sends a time it believes it is.
 *
 *  Like the pin, the answer names its subject `artifactId` rather than `id`, and carries
 *  only what the call settled. No caller reads it — the list is refetched, because
 *  publishing is what puts a card on the Gallery's shelf and the shelf is worth re-reading
 *  whole. It is typed anyway so that the next person to reach for it sees the real shape
 *  instead of guessing at an `Artifact`. */
export interface ArtifactPublishResult {
  artifactId: string;
  publishedAt: string | null;
}

export const publishArtifact = (id: string, title: string) =>
  apiClient.post<ArtifactPublishResult>(`/artifacts/${id}/publish`, { title });

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
 *
 *  Narrowed rather than trusted — but a body that is not a list raises rather than coming
 *  back as an empty one. "The list could not be read" and "this Artifact is shared with
 *  nobody" are different facts, and the second is the one a user would act on: it says an
 *  Artifact is private while the Gallery card beside it may still be showing a Shared
 *  badge from the same data. Failing here lets the dialog tell them which it is. */
export const listArtifactShares = async (id: string): Promise<DirectoryEntry[]> => {
  const body = await apiClient.get<unknown>(`/artifacts/${id}/shares`);
  if (!Array.isArray(body)) {
    throw new Error('The share list came back in a shape this client cannot read.');
  }
  return body as DirectoryEntry[];
};

/** Changes the share list by delta. PATCH with what to add and what to remove, rather
 *  than PUT with the whole list: sending the list would make two people editing the same
 *  Artifact overwrite each other, the second one silently undoing the first.
 *
 *  The answer is `unknown`, not `DirectoryEntry[]`. It was typed as the list once, and it
 *  is not always one — which is why the caller narrows before using it. Under the old
 *  type that narrowing read as dead code inviting deletion, and deleting it writes a
 *  non-list into the cache the dialog maps over. `unknown` makes the check the compiler's
 *  business rather than a comment's. */
export const updateArtifactShares = (id: string, update: ArtifactShareUpdate) =>
  apiClient.patch(`/artifacts/${id}/shares`, update);

/** One JS error an Artifact's document reported while running, verbatim as its
 *  injected collector posts it. Lives here because it is a wire shape — the repair
 *  endpoint's body carries a list of these. */
export interface BrowserJsError {
  message: string;
  line: number;
  col: number;
}

/** Asks the agent to rebuild an Artifact whose HTML threw while running. The answer
 *  is one honest boolean: a repair that produced no improvement says so rather than
 *  being reported as success. */
export const repairArtifact = (id: string, errors: BrowserJsError[]) =>
  apiClient.post<{ repaired: boolean }>(`/artifacts/${encodeURIComponent(id)}/repair`, {
    errors,
  });
