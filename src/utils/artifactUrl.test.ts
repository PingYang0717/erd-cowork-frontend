import { describe, expect, it } from 'vitest';

import { artifactHref, artifactRoute } from './artifactUrl';

describe('artifactUrl', () => {
  it('gives React Router a plain path — the router owns the fragment', () => {
    expect(artifactRoute('artifact-1')).toBe('/cowork/artifact/artifact-1');
  });

  /** The failure this guards against is silent: a link without the `#` resolves to a
   *  path the server has no route for, so it 404s (or lands on the shell at `/`) instead
   *  of opening the Artifact. Nothing in the app would report it. */
  it('gives the browser an absolute URL carrying the hash', () => {
    const href = artifactHref('artifact-1');

    expect(href).toBe(`${window.location.origin}/#/cowork/artifact/artifact-1`);
    expect(href).toContain('/#/');
  });

  it('keeps the two forms in step', () => {
    expect(artifactHref('abc')).toBe(`${window.location.origin}/#${artifactRoute('abc')}`);
  });
});
