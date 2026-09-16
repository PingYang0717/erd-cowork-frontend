import { describe, expect, it } from 'vitest';

import type { Message } from '@/types/api';
import { turnDurationMs } from './turnDuration';

const row = (sender: 'USER' | 'AI', createdAt: string, id = `${sender}-${createdAt}`): Message => ({
  id,
  sender,
  text: '',
  stepsJson: null,
  artifactId: null,
  artifactTitle: null,
  questionsJson: null,
  createdAt,
});

describe('turnDurationMs', () => {
  it('is the reply stamp less the stamp of the question above it', () => {
    const history = [row('USER', '2026-09-15T10:00:00.000Z'), row('AI', '2026-09-15T10:00:12.400Z')];
    expect(turnDurationMs(history, 1)).toBe(12400);
  });

  /** A reask's answer sits between: the nearest USER row is the one that counts. */
  it('measures from the nearest question, not the first', () => {
    const history = [
      row('USER', '2026-09-15T10:00:00.000Z'),
      row('AI', '2026-09-15T10:00:02.000Z'),
      row('USER', '2026-09-15T10:01:00.000Z'),
      row('AI', '2026-09-15T10:01:05.000Z'),
    ];
    expect(turnDurationMs(history, 3)).toBe(5000);
  });

  it.each([
    ['a USER row', [row('USER', '2026-09-15T10:00:00.000Z')], 0],
    ['a reply with no question above it', [row('AI', '2026-09-15T10:00:00.000Z')], 0],
    ['stamps that do not parse', [row('USER', 'nope'), row('AI', '2026-09-15T10:00:00.000Z')], 1],
    ['a reply stamped no later than its question', [row('USER', '2026-09-15T10:00:00.000Z'), row('AI', '2026-09-15T10:00:00.000Z')], 1],
  ])('is null for %s', (_what, history, index) => {
    expect(turnDurationMs(history, index)).toBeNull();
  });
});
