import { describe, expect, it } from 'vitest';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/** The backend serves an artifact's content as text/html directly — not JSON-wrapped.
 *  theme / versionId stay as query extensions only the mock reads. */
describe('GET /api/artifacts/:id (content)', () => {
  it('serves the artifact content as text/html', async () => {
    const response = await fetch(`${API_BASE}/artifacts/artifact-1?theme=light`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    const html = await response.text();
    expect(html.trimStart().toLowerCase().startsWith('<!doctype')).toBe(true);
  });

  it('404s for an unknown artifact', async () => {
    const response = await fetch(`${API_BASE}/artifacts/no-such-artifact`);
    expect(response.status).toBe(404);
  });
});
