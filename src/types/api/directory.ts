/** What a directory row stands for. Organisations and people come back from the same
 *  search, distinguished only by this. */
export type DirectoryEntryType = 'ORG' | 'EMPLOYEE';

/** One row of `GET /hr/employeesAndOrgs`, verbatim.
 *
 *  One shape carries both kinds, so which fields are populated depends on `type` — the
 *  `org*` fields for an ORG, the `employee*` fields for an EMPLOYEE. They are all
 *  optional here because that is the truth of the wire: nothing guarantees the other
 *  kind's fields are absent, and reading one that is missing must not throw.
 */
export interface DirectoryEntry {
  type: DirectoryEntryType;
  employeeName?: string;
  employeeNt?: string;
  employeeOrgName?: string;
  orgName?: string;
  orgId?: string;
  /** Which level of the org tree this is (department, section, …). It is what the share
   *  payload sends as the target's `type`, so an ORG's level IS its kind to the backend. */
  orgLevel?: string;
}

/** A recipient as the share endpoint names one: an `EMPLOYEE` with an NT account, or an
 *  org level (department, section, …) with an org id. */
export interface ShareTarget {
  type: string;
  id: string;
}

/** The change to an Artifact's share list. A delta rather than the whole list: two people
 *  editing the same Artifact then add and remove their own recipients instead of the
 *  second one silently reverting the first. */
export interface ArtifactShareUpdate {
  add: ShareTarget[];
  remove: ShareTarget[];
}
