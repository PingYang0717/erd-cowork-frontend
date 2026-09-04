import { describe, expect, it } from 'vitest';

import type { Message } from '@/types/api';
import { deriveArtifactVersions } from './deriveArtifactVersions';

const message = (overrides: Partial<Message>): Message => {
  return {
    id: crypto.randomUUID(),
    sender: 'AI',
    text: 'reply',
    stepsJson: null,
    artifactId: null,
    createdAt: '2026-08-20T09:00:00.000Z',
    artifactTitle: null,
    questionsJson: null,
    ...overrides,
  };
};

describe('deriveArtifactVersions', () => {
  it('lists artifact-bearing messages in arrival order, skipping messages without artifacts', () => {
    const versions = deriveArtifactVersions([
      message({ sender: 'USER', text: 'question 1' }),
      message({
        artifactId: 'a1',
        artifactTitle: 'SPC analysis',
        createdAt: '2026-08-20T09:01:00.000Z',
      }),
      message({ sender: 'USER', text: 'question 2' }),
      message({
        artifactId: 'a2',
        artifactTitle: 'SPC analysis v2',
        createdAt: '2026-08-20T09:05:00.000Z',
      }),
    ]);

    expect(versions).toEqual([
      // Numbered by arrival — the same rule the backend numbers by, so the two agree.
      // The menu used to read this from the artifacts list, which a just-produced
      // Artifact is not in yet; deriving it here needs nothing that has not arrived.
      {
        artifactId: 'a1',
        title: 'SPC analysis',
        createdAt: '2026-08-20T09:01:00.000Z',
        version: 1,
      },
      {
        artifactId: 'a2',
        title: 'SPC analysis v2',
        createdAt: '2026-08-20T09:05:00.000Z',
        version: 2,
      },
    ]);
  });

  /** Numbering counts artifact-bearing messages, not messages — a question between two
   *  outputs must not push the second one to v3. */
  it('numbers by position among artifacts, ignoring the messages between them', () => {
    const versions = deriveArtifactVersions([
      message({ sender: 'USER', text: 'q' }),
      message({ artifactId: 'a1' }),
      message({ sender: 'USER', text: 'q' }),
      message({ sender: 'USER', text: 'q' }),
      message({ artifactId: 'a2' }),
    ]);

    expect(versions.map((v) => v.version)).toEqual([1, 2]);
  });

  it('falls back to the first 50 chars of the message text when artifactTitle is null', () => {
    const versions = deriveArtifactVersions([message({ artifactId: 'a1', artifactTitle: null, text: 'x'.repeat(80) })]);

    expect(versions[0].title).toBe('x'.repeat(50));
  });

  it('returns an empty list when no message carries an artifact', () => {
    expect(deriveArtifactVersions([message({ sender: 'USER', text: 'hi' })])).toEqual([]);
  });
});
