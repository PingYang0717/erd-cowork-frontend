import type { DirectoryEntry, ShareTarget } from '@/types/api';

/** What identifies a row: an employee by NT account, an organisation by its id. Also the
 *  option value the picker uses, so the two kinds cannot collide on a shared number. */
export const directoryEntryKey = (entry: DirectoryEntry): string => {
  return entry.type === 'EMPLOYEE' ? `EMPLOYEE:${entry.employeeNt}` : `ORG:${entry.orgId}`;
};

/** How a row reads in the picker. Both forms lead with the organisation, because that is
 *  what tells two similarly-named people apart. */
export const directoryEntryLabel = (entry: DirectoryEntry): string => {
  return entry.type === 'EMPLOYEE'
    ? `${entry.employeeOrgName} | ${entry.employeeNt} | ${entry.employeeName}`
    : `${entry.orgId} | ${entry.orgName}`;
};

/** Every text a row can be found by — not only the parts the label happens to show.
 *
 *  A person is as findable by their org as by their name, and an organisation by either
 *  its code or its name. Matching on the label alone would quietly make some of these
 *  unsearchable, which reads as "that person is not in the directory". */
export const directoryEntryHaystack = (entry: DirectoryEntry): string => {
  return [entry.employeeName, entry.employeeNt, entry.employeeOrgName, entry.orgName, entry.orgId, entry.orgLevel]
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
