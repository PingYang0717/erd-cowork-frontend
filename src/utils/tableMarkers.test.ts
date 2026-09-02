import { describe, expect, it } from 'vitest';

import type { TableResult } from '@/types/api';

import { splitAnswerByTableMarkers } from './tableMarkers';

const table = (tableId: string): TableResult => {
  return {
    tableId,
    intent: `intent for ${tableId}`,
    columns: ['lot', 'value'],
    rows: [['L1', 1]],
    truncated: false,
  };
};

describe('splitAnswerByTableMarkers', () => {
  it('returns the whole answer as one text segment when there is no marker', () => {
    expect(splitAnswerByTableMarkers('No tables here.', [])).toEqual([
      { type: 'text', content: 'No tables here.' },
    ]);
  });

  it('resolves a marker into the table it names, keeping the text either side', () => {
    const segments = splitAnswerByTableMarkers('Before [[table:t1]] after', [table('t1')]);

    expect(segments).toEqual([
      { type: 'text', content: 'Before ' },
      { type: 'table', table: table('t1') },
      { type: 'text', content: ' after' },
    ]);
  });

  it('resolves several markers in the order they appear, not the order the tables arrived', () => {
    const segments = splitAnswerByTableMarkers('[[table:t2]] then [[table:t1]]', [
      table('t1'),
      table('t2'),
    ]);

    expect(
      segments.map((segment) => (segment.type === 'table' ? segment.table.tableId : 'text')),
    ).toEqual(['t2', 'text', 't1']);
  });

  it('drops a marker whose table never arrived rather than leaking it to the reader', () => {
    const segments = splitAnswerByTableMarkers('Look: [[table:missing]] done', []);

    expect(segments).toEqual([
      { type: 'text', content: 'Look: ' },
      { type: 'text', content: ' done' },
    ]);
    expect(JSON.stringify(segments)).not.toContain('[[table:');
  });

  it('omits empty text runs so a marker-only answer renders as just the table', () => {
    expect(splitAnswerByTableMarkers('[[table:t1]]', [table('t1')])).toEqual([
      { type: 'table', table: table('t1') },
    ]);
  });

  it('treats an absent table list as no tables at all', () => {
    expect(splitAnswerByTableMarkers('a [[table:t1]] b', undefined)).toEqual([
      { type: 'text', content: 'a ' },
      { type: 'text', content: ' b' },
    ]);
  });
});
