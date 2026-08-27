import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';

import { fileApi } from './fileApi';

function csv(name: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'text/csv' });
}

/** A CSV here runs to gigabytes; an upload with no reported progress is a frozen screen. */
describe('fileApi.uploadFiles progress', () => {
  it('reports progress and finishes at 100', async () => {
    const seen: number[] = [];

    await fileApi.uploadFiles('session-2', [csv('lots.csv', 2048)], (percent) =>
      seen.push(percent),
    );

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.at(-1)).toBe(100);
    expect(seen.every((percent) => percent >= 0 && percent <= 100)).toBe(true);
  });

  it('never reports backwards', async () => {
    const seen: number[] = [];

    await fileApi.uploadFiles('session-2', [csv('lots.csv', 4096)], (percent) =>
      seen.push(percent),
    );

    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });

  it('rejects when the backend refuses the upload', async () => {
    server.use(
      http.post('/api/sessions/:sessionId/files', () =>
        HttpResponse.json({ code: 'TOO_LARGE', message: 'nope' }, { status: 413 }),
      ),
    );

    await expect(fileApi.uploadFiles('session-2', [csv('lots.csv', 16)])).rejects.toThrow();
  });

  it('still uploads when no one is listening for progress', async () => {
    const uploaded = await fileApi.uploadFiles('session-2', [csv('lots.csv', 16)]);

    expect(uploaded[0]).toMatchObject({ name: 'lots.csv' });
  });
});
