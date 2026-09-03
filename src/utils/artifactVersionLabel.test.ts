import { describe, expect, it } from 'vitest';

import { artifactVersionLabel } from './artifactVersionLabel';

describe('artifactVersionLabel', () => {
  it('marks a version by its number', () => {
    expect(artifactVersionLabel(1)).toBe('v1');
    expect(artifactVersionLabel(12)).toBe('v12');
  });

  /** A freshly produced Artifact is not in the artifacts list yet, so the menu can hold
   *  a row whose version has not arrived. No mark is right; a lone `v` would read as a
   *  version named nothing. */
  it('shows no mark while the version is still missing', () => {
    expect(artifactVersionLabel(undefined)).toBeNull();
  });
});
