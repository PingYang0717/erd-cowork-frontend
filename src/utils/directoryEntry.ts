import type { ArtifactShare, DirectoryEntry, ShareTarget } from '@/types/api/index';

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

/** Every text a row can be found by — not only the parts the label happens to show.
 *
 *  A person is as findable by their org as by their name, and an organisation by either
 *  its code or its name. Matching on the label alone would quietly make some of these
 *  unsearchable, which reads as "that person is not in the directory". */
export function directoryEntryHaystack(entry: DirectoryEntry): string {
  return [
    entry.employeeName,
    entry.employeeNt,
    entry.employeeOrgName,
    entry.orgName,
    entry.orgId,
    entry.orgLevel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** Whether a row answers to what the user typed. */
export function directoryEntryMatches(entry: DirectoryEntry, keyword: string): boolean {
  const needle = keyword.trim().toLowerCase();
  return needle === '' || directoryEntryHaystack(entry).includes(needle);
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

/** The kind of recipient a share row names, under either spelling of the field. */
export function shareTargetType(share: ArtifactShare): string {
  return share.shareTargetType ?? share.sharesTargetType ?? '';
}

/** Which of the three id fields this row's kind puts the recipient in. */
export function shareTargetId(share: ArtifactShare): string {
  return share.shareTargetUserId ?? share.shareTargetDeptId ?? share.shareTargetSectionId ?? '';
}

/** An existing recipient, in the shape the picker works in.
 *
 *  A share row carries ids, not names — so the id is what the chip can show. That is the
 *  point of doing it at all: a recipient already on the list has to appear as something,
 *  and an id the user recognises beats an empty field or a silently missing chip.
 */
export function shareAsDirectoryEntry(share: ArtifactShare): DirectoryEntry {
  const id = shareTargetId(share);
  const type = shareTargetType(share);
  return share.shareTargetUserId !== undefined || type === 'EMPLOYEE'
    ? { type: 'EMPLOYEE', employeeNt: id, employeeName: id, employeeOrgName: '' }
    : { type: 'ORG', orgId: id, orgName: id, orgLevel: type };
}
