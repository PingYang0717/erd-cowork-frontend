import { describe, expect, it } from 'vitest';

import { showOptimisticBubble } from './optimisticBubble';

describe('showOptimisticBubble', () => {
  it('shows while the history has not grown since the send', () => {
    // Sent from a 2-message history; still 2 -> the refetch has not landed yet.
    expect(showOptimisticBubble(2, 2)).toBe(true);
  });

  it('hides once the history has grown past the send point (refetch landed)', () => {
    expect(showOptimisticBubble(4, 2)).toBe(false);
  });

  /** C-3: sending the same text twice. The history ends with the previous identical
   *  message (length unchanged at send time), so a text comparison would suppress the
   *  second bubble. Length does not: same length as at send -> still shown. */
  it('shows a repeat of the same text as a second bubble', () => {
    // History ended with USER "hello" (length 1). Send "hello" again: baseline 1, still 1.
    expect(showOptimisticBubble(1, 1)).toBe(true);
  });
});
