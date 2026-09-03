/** The short mark the version switcher shows for an Artifact — `v1`, `v2`.
 *
 *  The backend names this field's value in words (`version 1`), so rendering it behind a
 *  `v` produced `vversion 1`. Only the ordinal is wanted; the word is the backend's way
 *  of saying what the number counts, not something to repeat on a button 40px wide.
 *
 *  Reads the digits out of whatever arrives rather than assuming a shape: the field has
 *  been a number here and a sentence there, and a menu row is not the place to find out
 *  which. Anything with no number in it answers `null`, and the caller shows no mark at
 *  all — better than a `v` on its own, which would read as a version named nothing.
 */
export const artifactVersionLabel = (version: string | number | undefined): string | null => {
  if (version === undefined || version === null) {
    return null;
  }
  const digits = String(version).match(/\d+/);
  return digits ? `v${digits[0]}` : null;
};
