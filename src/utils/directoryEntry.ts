import type { DirectoryEntry, ShareTarget } from '@/types/api/index';

/** What identifies a row: an employee by NT account, an organisation by its id. Also the
 *  option value the picker uses, so the two kinds cannot collide on a shared number. */
export function directoryEntryKey(entry: DirectoryEntry): string {
  return entry.type === 'EMPLOYEE' ? `EMPLOYEE:${entry.employeeNt}` : `ORG:${entry.orgId}`;
}

/** How a row reads in the picker. Both forms lead with the organisation, because that is
 *  what tells two similarly-named people apart. */
export function directoryEntryLabel(entry: DirectoryEntry): string {
  return entry.type === 'EMPLOYEE'
    ? `${entry.employeeOrgName} | ${entry.employeeNt} | ${entry.employeeName}`
    : `${entry.orgId} | ${entry.orgName}`;
}

/** The row as a share recipient.
 *
 *  An employee's type is the constant `EMPLOYEE`; an organisation's is its `orgLevel` —
 *  the backend distinguishes a department from a section by level rather than by a
 *  separate field, so the level is what travels. */
export function directoryShareTarget(entry: DirectoryEntry): ShareTarget {
  return entry.type === 'EMPLOYEE'
    ? { type: 'EMPLOYEE', id: entry.employeeNt ?? '' }
    : { type: entry.orgLevel ?? 'ORG', id: entry.orgId ?? '' };
}
