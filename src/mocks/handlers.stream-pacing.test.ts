import { describe, expect, it } from 'vitest';

import { setStreamPace } from './handlers';

/** Reads a mocked run off the wire and reports how many network chunks it arrived in.
 *  One chunk means the whole run landed in a single microtask — React batches it into
 *  one render and the working card, step statuses and typewriter reply are never
 *  painted, which is exactly the regression this guards. */
async function chunkCount(sessionId: string): Promise<number> {
  const response = await fetch(`/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ text: 'Generate the Daily Monitor dashboard for A14.' }),
  });

  const reader = response.body!.getReader();
  let chunks = 0;
  while (true) {
    const { done } = await reader.read();
    if (done) break;
    chunks += 1;
  }
  return chunks;
}

describe('mock run pacing', () => {
  it('delivers a run as many chunks, not one, so the progress is watchable', async () => {
    // Tests run unpaced by default (src/test/setup.ts); this is what dev mode does.
    setStreamPace(1, 1);
    try {
      expect(await chunkCount('session-pacing')).toBeGreaterThan(1);
    } finally {
      setStreamPace(0, 0);
    }
  });
});
