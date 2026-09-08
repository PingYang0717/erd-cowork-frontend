/** Matches `[[table:tbl_abc123]]` — the backend's display-level marker, the same
 *  convention as the legacy `[[step:]]` one. */
const TABLE_MARKER_PATTERN = /\[\[table:([^\]]+)\]\]/g;

/** Removes every marker from text on its way to the reader.
 *
 *  A guard, not a feature. The markers said where a TABLE event's result belonged in the
 *  answer; TABLE has left the contract, so nothing resolves them any more and a marker
 *  that still turned up would be printed as the literal `[[table:…]]` — display plumbing
 *  the reader must never see. Both the answer and the thinking panel run through this,
 *  because both print what the backend sent.
 *
 *  Delete it once the backend is confirmed to have stopped emitting the markers as well
 *  as the events. */
export const stripTableMarkers = (text: string): string =>
  text.replace(new RegExp(TABLE_MARKER_PATTERN.source, 'g'), '').replace(/  +/g, ' ');
