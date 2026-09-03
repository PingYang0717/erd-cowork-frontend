/** The short mark the version switcher shows for an Artifact — `v1`, `v2`.
 *
 *  `version` is a number on the wire (confirmed 2026-09-03). This existed to dig the
 *  digits out of a worded value (`version 1`), and that parsing is gone with the
 *  assumption behind it: a field that stops being a number should break here, not be
 *  quietly reinterpreted.
 *
 *  What remains is the absent case. A freshly produced Artifact is not in the artifacts
 *  list yet, so the menu can hold a row whose version has not arrived — it shows no mark
 *  rather than a lone `v`, which would read as a version named nothing.
 */
export const artifactVersionLabel = (version: number | undefined): string | null =>
  version === undefined ? null : `v${version}`;
