import { describe, expect, it } from 'vitest';

const API_BASE = '/api';

/** The raw endpoint serves the artifact's HTML before assembly — the source an
 *  engineer reads in the chat bubble, and the text a later turn is iterated from. */
describe('GET /api/artifacts/:id/raw', () => {
  it('serves the artifact source as text/plain', async () => {
    const response = await fetch(`${API_BASE}/artifacts/artifact-1/raw`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(await response.text()).toContain('<');
  });

  it('404s for an unknown artifact', async () => {
    const response = await fetch(`${API_BASE}/artifacts/no-such-artifact/raw`);
    expect(response.status).toBe(404);
  });
});
