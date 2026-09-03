import { describe, expect, it } from 'vitest';

import { artifactVersionLabel } from './artifactVersionLabel';

describe('artifactVersionLabel', () => {
  /** The shape the backend actually sends. Rendered behind a `v` it read `vversion 1`. */
  it('takes the ordinal out of the backend wording', () => {
    expect(artifactVersionLabel('version 1')).toBe('v1');
    expect(artifactVersionLabel('version 12')).toBe('v12');
  });

  /** The mock and the fixtures used to hand over a plain number, and old data may still. */
  it('accepts a bare number', () => {
    expect(artifactVersionLabel(3)).toBe('v3');
    expect(artifactVersionLabel('3')).toBe('v3');
  });

  /** No number means no mark. A lone `v` would read as a version named nothing. */
  it('answers null when there is no number to show', () => {
    expect(artifactVersionLabel(undefined)).toBeNull();
    expect(artifactVersionLabel('')).toBeNull();
    expect(artifactVersionLabel('draft')).toBeNull();
  });
});
