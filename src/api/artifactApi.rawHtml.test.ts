import { describe, expect, it } from 'vitest';

import { artifactApi } from './artifactApi';

/** The bubble's "view HTML" reads the artifact's source through the same authenticated
 *  channel as everything else — identity rides the shared interceptor. */
describe('artifactApi.getRawHtml', () => {
  it('returns the artifact source as a string', async () => {
    const html = await artifactApi.getRawHtml('artifact-1');

    expect(typeof html).toBe('string');
    expect(html).toContain('<');
  });

  it('rejects for an artifact that does not exist', async () => {
    await expect(artifactApi.getRawHtml('no-such-artifact')).rejects.toThrow();
  });
});
