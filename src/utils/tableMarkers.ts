import type { TableResult } from '@/types/api';

/** Matches `[[table:tbl_abc123]]` — the backend's display-level marker, the same
 *  convention as the legacy `[[step:]]` one: it says where a table belongs in the
 *  answer, and never drives control flow. */
const TABLE_MARKER_PATTERN = /\[\[table:([^\]]+)\]\]/g;

export interface AnswerTextSegment {
  type: 'text';
  content: string;
}

export interface AnswerTableSegment {
  type: 'table';
  table: TableResult;
}

export type AnswerSegment = AnswerTextSegment | AnswerTableSegment;

/** Splits an answer on its `[[table:<tableId>]]` markers, resolving each id against the
 *  TABLE events the run produced. A marker whose table never arrived is dropped — the
 *  raw marker text must never reach the reader. */
export const splitAnswerByTableMarkers = (
  text: string,
  tables: TableResult[] | undefined,
): AnswerSegment[] => {
  const tablesById = new Map((tables ?? []).map((table) => [table.tableId, table]));
  const segments: AnswerSegment[] = [];
  let cursor = 0;

  // A fresh regex per call: the shared literal carries lastIndex between calls.
  const pattern = new RegExp(TABLE_MARKER_PATTERN.source, 'g');
  let match = pattern.exec(text);

  while (match !== null) {
    pushText(segments, text.slice(cursor, match.index));

    const resolved = tablesById.get(match[1]);
    if (resolved) {
      segments.push({ type: 'table', table: resolved });
    }

    cursor = match.index + match[0].length;
    match = pattern.exec(text);
  }

  pushText(segments, text.slice(cursor));

  return segments;
};

/** Empty runs between two adjacent markers (or at either end) are not segments —
 *  rendering them would put a stray empty paragraph between tables. */
const pushText = (segments: AnswerSegment[], content: string): void => {
  if (content !== '') {
    segments.push({ type: 'text', content });
  }
};
