import type { DirectoryEntry, ShareTarget } from '@/types/api';

/** What identifies a row: an employee by NT account, an organisation by its id. Also the
 *  option value the picker uses, so the two kinds cannot collide on a shared number. */
export const directoryEntryKey = (entry: DirectoryEntry): string => {
  return entry.type === 'EMPLOYEE' ? `EMPLOYEE:${entry.employeeNt}` : `ORG:${entry.orgId}`;
};

/** Where a person's photo lives.
 *
 *  PLACEHOLDER HOST. The real address is confidential and is not committed — only the
 *  shape is, so the picker can be built and reviewed. Swap the base in before this reaches
 *  anyone's screen for real.
 *
 *  Null rather than a URL when the row has no employee id: an <img> pointed at
 *  `.../undefined.jpg` is a broken image on screen, which reads as "this person's photo
 *  failed" rather than "there is no photo to fetch". */
const AVATAR_BASE = 'https://intranet.example.internal/hr/photo';

export const employeeAvatarUrl = (emplId: string | undefined): string | null => {
  return emplId ? `${AVATAR_BASE}/${emplId}.jpg` : null;
};

/** How a row reads in the option list — where rows are being told apart from one another.
 *
 *  An organisation carries its code, because two units can share a name and the code is
 *  what settles it. A person does not: their photo is beside the name, and that is what
 *  tells two people with the same name apart. */
export const directoryEntryOptionText = (entry: DirectoryEntry): string => {
  if (entry.type === 'EMPLOYEE') {
    return entry.sortName ?? entry.employeeName ?? entry.employeeNt ?? '';
  }
  const name = entry.orgName ?? entry.sortName;
  return name ? `${name} (${entry.orgId ?? ''})` : (entry.orgId ?? '');
};

/** How a row reads once chosen. One short name for both kinds: a chosen recipient is
 *  settled, so the code and the org that told it apart in the list have no work left to
 *  do, and a row of long labels is a row nobody reads. */
export const directoryEntrySelectedName = (entry: DirectoryEntry): string => {
  return (
    entry.sortName ??
    (entry.type === 'EMPLOYEE' ? (entry.employeeName ?? entry.employeeNt ?? '') : (entry.orgName ?? entry.orgId ?? ''))
  );
};

/** Every text a row can be found by — not only the parts the label happens to show.
 *
 *  A person is as findable by their org as by their name, and an organisation by either
 *  its code or its name. Matching on the label alone would quietly make some of these
 *  unsearchable, which reads as "that person is not in the directory". */
export const directoryEntryHaystack = (entry: DirectoryEntry): string => {
  return [
    entry.employeeName,
    entry.employeeNt,
    entry.employeeOrgName,
    entry.orgName,
    entry.orgId,
    entry.orgLevel,
    entry.sortName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

/** Whether a row answers to what the user typed. */
export const directoryEntryMatches = (entry: DirectoryEntry, keyword: string): boolean => {
  const needle = keyword.trim().toLowerCase();
  return needle === '' || directoryEntryHaystack(entry).includes(needle);
};

/** The row as a share recipient.
 *
 *  An employee's type is the constant `EMPLOYEE`; an organisation's is its `orgLevel` —
 *  the backend distinguishes a department from a section by level rather than by a
 *  separate field, so the level is what travels. */
export const directoryShareTarget = (entry: DirectoryEntry): ShareTarget => {
  return entry.type === 'EMPLOYEE'
    ? { type: 'EMPLOYEE', id: entry.employeeNt ?? '' }
    : { type: entry.orgLevel ?? 'ORG', id: entry.orgId ?? '' };
};
