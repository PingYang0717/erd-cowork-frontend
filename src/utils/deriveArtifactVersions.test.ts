import { describe, expect, it } from 'vitest';

import type { Message } from '@/types/api';

import { deriveArtifactVersions } from './deriveArtifactVersions';

function message(overrides: Partial<Message>): Message {
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
}

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
      // No version number: these are independent Artifacts, listed in the order the
      // conversation produced them.
      {
        artifactId: 'a1',
        title: 'SPC analysis',
        createdAt: '2026-08-20T09:01:00.000Z',
      },
      {
        artifactId: 'a2',
        title: 'SPC analysis v2',
        createdAt: '2026-08-20T09:05:00.000Z',
      },
    ]);
  });

  it('falls back to the first 50 chars of the message text when artifactTitle is null', () => {
    const versions = deriveArtifactVersions([
      message({ artifactId: 'a1', artifactTitle: null, text: 'x'.repeat(80) }),
    ]);

    expect(versions[0].title).toBe('x'.repeat(50));
  });

  it('returns an empty list when no message carries an artifact', () => {
    expect(deriveArtifactVersions([message({ sender: 'USER', text: 'hi' })])).toEqual([]);
  });
});
