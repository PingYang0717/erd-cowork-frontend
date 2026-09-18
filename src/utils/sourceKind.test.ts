import { describe, expect, it } from 'vitest';

import { sourceKindOf } from './sourceKind';

describe('sourceKindOf', () => {
  it('is undecided before either kind is attached', () => {
    expect(sourceKindOf({ files: [], connectors: [] })).toBeNull();
  });

  it('reads the kind off whichever the conversation holds', () => {
    expect(sourceKindOf({ files: [{}], connectors: [] })).toBe('files');
    expect(sourceKindOf({ files: [], connectors: ['inline'] })).toBe('connectors');
  });

  /** From before the rule: the Connectors entry stays the way to the sources, files clear
   *  from their chips regardless. */
  it('reads a conversation holding both as drawing on connectors', () => {
    expect(sourceKindOf({ files: [{}], connectors: ['inline'] })).toBe('connectors');
  });
});
