/** Backend contract.
 *
 *  Deliberately absent: the Artifact's own kind (dashboard / slides). There is no `type`
 *  — nothing on screen distinguishes the two, and the Gallery's thumbnail and Dash/Deck
 *  tag are gone rather than defaulting every card to the same wrong answer. Permissions
 *  are absent too: pinning is the reader's own bookmark and sharing follows `isOwn`, so
 *  neither needs a field of its own.
 */
export interface Artifact {
  id: string;
  /** What the Gallery shows. The user writes it when they publish — an Artifact is put
   *  on the shelf under a name they chose, not under whatever the run was called. */
  title: string;
  /** Which version of its analysis this is, worded by the backend — `version 1`, not
   *  `1`. The version menu shows only the ordinal (`artifactVersionLabel`); the Gallery
   *  does not read it at all, because a card is named by its title. */
  version: string;
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
  /** Whether the signed-in user owns this Artifact — which is also what decides whether
   *  they may share it onward. There is no separate `canShare`: the two were always the
   *  same value, and keeping both invited them to drift apart. */
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
/** One Artifact produced in a conversation, as the version menu lists it.
 *
 *  `title` and `version` are enrichments joined from the Artifacts list — a freshly
 *  produced Artifact is not in that list yet, so both may be missing for a moment. The
 *  menu falls back to the message's own wording when they are. */
export interface ArtifactVersion {
  artifactId: string;
  title: string;
  version?: string;
  createdAt?: string;
  publishedAt?: string | null;
}
