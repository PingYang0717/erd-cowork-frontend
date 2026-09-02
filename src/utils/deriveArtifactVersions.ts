import type { ArtifactVersion, Message } from '@/types/api';

/** The Artifacts a session produced, in arrival order: every artifact-bearing message
 *  carries one. Each is an independent Artifact (iterating sends baseArtifactId and the
 *  backend answers with a new one), so this is a list of siblings, not a version chain. */
export const deriveArtifactVersions = (messages: Message[]): ArtifactVersion[] => {
  return messages
    .filter((message) => message.artifactId != null)
    .map((message) => ({
      artifactId: message.artifactId as string,
      title: message.artifactTitle ?? message.text.slice(0, 50),
      createdAt: message.createdAt,
    }));
};
