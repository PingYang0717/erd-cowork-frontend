import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';

import { uploadFiles, type UploadProgress } from './fileApi';

const csv = (name: string, sizeBytes: number): File => {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'text/csv' });
};

/** A CSV here runs to gigabytes; an upload with no reported progress is a frozen screen. */
describe('fileApi.uploadFiles progress', () => {
  /** The transfer maps to 0–90 and the last report says `processing`: bytes out is
   *  all this side can measure, and the old 0–100 mapping claimed completion while
   *  the backend was still receiving and parsing. */
  it('reports transfer progress capped at 90, ending in the processing phase', async () => {
    const seen: UploadProgress[] = [];

    await uploadFiles('session-2', [csv('lots.csv', 2048)], (progress) => seen.push(progress));

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.at(-1)).toEqual({ percent: 90, phase: 'processing' });
    expect(seen.every(({ percent }) => percent >= 0 && percent <= 90)).toBe(true);
    // Only the final report may claim the server's turn.
    expect(seen.slice(0, -1).every(({ phase }) => phase === 'transferring')).toBe(true);
  });

  it('never reports backwards', async () => {
    const seen: number[] = [];

    await uploadFiles('session-2', [csv('lots.csv', 4096)], ({ percent }) => seen.push(percent));

    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });

  it('rejects when the backend refuses the upload', async () => {
    server.use(
      http.post('/api/sessions/:sessionId/files', () =>
        HttpResponse.json({ code: 'TOO_LARGE', message: 'nope' }, { status: 413 }),
      ),
    );

    await expect(uploadFiles('session-2', [csv('lots.csv', 16)])).rejects.toThrow();
  });

  it('still uploads when no one is listening for progress', async () => {
    const uploaded = await uploadFiles('session-2', [csv('lots.csv', 16)]);

    expect(uploaded[0]).toMatchObject({ name: 'lots.csv' });
  });
});
