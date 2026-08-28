import { describe, expect, it } from 'vitest';

const API_BASE = '/api';

/** The limits the backend enforces, published so the UI can say them out loud instead
 *  of hard-coding a second copy that drifts. */
describe('GET /api/config', () => {
  it('publishes the retention period and the upload limits', async () => {
    const response = await fetch(`${API_BASE}/config`);
    expect(response.status).toBe(200);

    const config = (await response.json()) as {
      retentionDays: number;
      maxFiles: number;
      maxSessionBytes: number;
      singleFileLimits: Record<string, number>;
    };

    expect(config.retentionDays).toBeGreaterThan(0);
    expect(config.maxFiles).toBeGreaterThan(0);
    expect(config.maxSessionBytes).toBeGreaterThan(0);
    expect(Object.keys(config.singleFileLimits)).toContain('csv');
  });
});
