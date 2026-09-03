import type { ArtifactVersion, Message } from '@/types/api';

/** The Artifacts a session produced, in arrival order: every artifact-bearing message
 *  carries one. Each is an independent Artifact (iterating sends baseArtifactId and the
 *  backend answers with a new one), so this is a list of siblings, not a version chain. */
export const deriveArtifactVersions = (messages: Message[]): ArtifactVersion[] => {
  return messages
    .filter((message) => message.artifactId != null)
    .map((message, index) => ({
      artifactId: message.artifactId as string,
      title: message.artifactTitle ?? message.text.slice(0, 50),
      createdAt: message.createdAt,
      // Numbered here, from the order they arrived in — the same rule the backend
      // numbers by. The menu used to take this from the artifacts list instead, and a
      // just-produced Artifact is not in that list yet (nothing refetches it when a run
      // ends), so the newest row showed a title with no `vN` beside it. Deriving it
      // needs nothing that has not already arrived.
      version: index + 1,
    }));
};
