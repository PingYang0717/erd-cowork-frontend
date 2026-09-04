import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import { getArtifactContent } from './artifactApi';

const API_BASE = '/api';

/** Captures the URL the next artifact-content request actually goes out with. */
const captureContentRequest = (): { url: () => URL } => {
  let captured: URL | null = null;
  server.use(
    http.get(`${API_BASE}/artifacts/:id`, ({ request }) => {
      captured = new URL(request.url);
      return new HttpResponse('<!doctype html><html></html>', {
        headers: { 'Content-Type': 'text/html' },
      });
    })
  );
  return {
    url: () => {
      if (captured === null) throw new Error('no artifact content request was made');
      return captured;
    },
  };
};

/** Artifact HTML has no theme variants (ADR-0001): the request carries no `theme`. What it may carry is `r`, the reload
 *  cache-buster, and only when a reload actually happened (nonce > 0). */
describe('getArtifactContent', () => {
  it('requests the artifact without a theme parameter', async () => {
    const request = captureContentRequest();

    await getArtifactContent('artifact-1', 0);

    expect(request.url().searchParams.has('theme')).toBe(false);
  });

  it('omits the reload cache-buster on the initial load (nonce 0)', async () => {
    const request = captureContentRequest();

    await getArtifactContent('artifact-1', 0);

    expect(request.url().searchParams.has('r')).toBe(false);
  });

  it('carries the reload nonce as the r cache-buster after a reload', async () => {
    const request = captureContentRequest();

    await getArtifactContent('artifact-1', 3);

    expect(request.url().searchParams.get('r')).toBe('3');
  });

  it('returns the artifact document as a string', async () => {
    const html = await getArtifactContent('artifact-1', 0);

    expect(typeof html).toBe('string');
    expect(html).toContain('<');
  });
});
