/** Backend contract, 定版 2026-08-27.
 *
 *  What is deliberately absent: the Artifact's own kind (dashboard / slides). It is
 *  coming back as `type`, which the backend has yet to add — until then nothing on
 *  screen distinguishes the two, and the Gallery's thumbnail and Dash/Deck tag are
 *  gone rather than defaulting every card to the same wrong answer.
 */
export interface Artifact {
  id: string;
  title: string;
  sessionId: string;
  /** The producing session's title, denormalised — the Gallery card no longer has to
   *  fetch the session list to name where an Artifact came from. */
  sessionTitle: string;
  /** 釘選的時間戳（ISO 8601），未釘選為 null。 */
  pinnedAt: string | null;
  /** 發布的時間戳（ISO 8601），未發布為 null. Publishing is what makes an Artifact
   *  available to other people — the button the mockup labels 生成 Artifact. Not to be
   *  confused with 重新生成, which asks the Agent for a whole new version. */
  publishedAt: string | null;
  createdAt: string;
  /** Owner's id. `ownerDisplay` is who to show; this is who to compare. */
  owner: string;
  ownerDisplay: string;
  /** Whether the signed-in user may pin this Artifact. A permission, decided by the
   *  backend — not a statement about whether the pin endpoint exists. */
  canPin: boolean;
  /** Owner and non-copy only: a personal copy of someone else's Artifact cannot be
   *  shared onward. */
  canShare: boolean;
  isOwn: boolean;
  /** Whether this Artifact has been shared out — the owner's view of it. Whether it
   *  was shared *to* you is `!isOwn`. */
  isShared: boolean;
  /** Whether the signed-in user already holds a personal copy of this Artifact. The
   *  copy itself is not modelled yet: there is no endpoint and no UI to make one. */
  hasPersonalCopy: boolean;
}

/** Backend contract shape (cowork master): a version is an artifact-bearing message,
 *  derived client-side from the session's history — there is no versions endpoint.
 *  `createdAt` and `publishedAt` are enrichments the version menu reads. */
/** One Artifact produced in a conversation. These are independent Artifacts, not
 *  versions of a single thing — iterating in chat yields a new Artifact that is
 *  published, pinned and shared on its own. Arrival order is the list's order; there is
 *  no version number, because there is no lineage for one to count along. */
export interface ArtifactVersion {
  artifactId: string;
  title: string;
  createdAt?: string;
  publishedAt?: string | null;
}
