import { describe, expect, it } from 'vitest';

import { stripTableMarkers } from './tableMarkers';

/** A guard, not a feature. TABLE has left the contract, so nothing resolves a marker any
 *  more — which is exactly why this has to keep working: an unresolved marker would be
 *  printed verbatim, and `[[table:tbl_9f]]` is display plumbing the reader must never see. */
describe('stripTableMarkers', () => {
  it('leaves text with no marker in it alone', () => {
    expect(stripTableMarkers('No markers here.')).toBe('No markers here.');
  });

  it('removes a marker without leaving a double space behind it', () => {
    expect(stripTableMarkers('Before [[table:t1]] after')).toBe('Before after');
  });

  it('removes every marker, not only the first', () => {
    expect(stripTableMarkers('[[table:t2]] then [[table:t1]]')).toBe(' then ');
  });

  it('removes one whose table never existed — the point of the guard', () => {
    expect(stripTableMarkers('Look: [[table:missing]] done')).not.toContain('[[table:');
  });
});
