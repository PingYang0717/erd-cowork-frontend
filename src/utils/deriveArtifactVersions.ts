import type { ArtifactVersion, Message } from '@/types/api/index';

/** Versions are not a backend resource: every artifact-bearing message in a session is
 *  one version, numbered in arrival order (cowork master's model — iterating sends
 *  baseArtifactId and yields a new artifact per turn). */
export function deriveArtifactVersions(messages: Message[]): ArtifactVersion[] {
  return messages
    .filter((message) => message.artifactId != null)
    .map((message, index) => ({
      artifactId: message.artifactId as string,
      title: message.artifactTitle ?? message.text.slice(0, 50),
      version: index + 1,
      createdAt: message.createdAt,
    }));
}
