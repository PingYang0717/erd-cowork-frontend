import type { DirectoryEntry } from '@/types/api';

import { apiClient } from './apiClient';
import { asArrayIn, type Contract } from './responseContract';

/** How many characters the user must type before a search is worth making. The
 *  directory is org-wide, so a one- or two-character key matches most of it — the
 *  request would be large, slow, and useless to read. */
export const DIRECTORY_SEARCH_MIN_LENGTH = 3;

/** One directory row. Every field is optional because that is the truth of the wire:
 *  one shape carries both kinds (`ORG` / `EMPLOYEE`) and nothing guarantees the other
 *  kind's fields are absent — only `type` is promised. Exported because the share
 *  list (`GET /artifacts/{id}/shares`) answers in this same shape. */
export const DIRECTORY_ENTRY: Contract<DirectoryEntry> = {
  label: 'the directory entry',
  fields: {
    type: { kind: 'string' },
    employeeName: { kind: 'string', optional: true },
    employeeNt: { kind: 'string', optional: true },
    employeeOrgName: { kind: 'string', optional: true },
    orgName: { kind: 'string', optional: true },
    orgId: { kind: 'string', optional: true },
    orgLevel: { kind: 'string', optional: true },
  },
};

/** Searches people and org units by a free-text keyword (department code, section code,
 *  NT account or name). A search rather than a full listing: the directory is the whole
 *  organisation, which is far too large to send and filter client-side.
 *
 *  The HR directory answers inside a `content` envelope rather than as a bare array;
 *  `readArrayIn` unwraps it here so nothing downstream has to know about it — and
 *  raises on a body without one (an error rendered as JSON, a shape change), because
 *  "no such person" is a real answer and a useful one: a broken response wearing that
 *  answer sends the user off to re-check a spelling that was never the problem. */
export const searchDirectory = (keyword: string, signal?: AbortSignal): Promise<DirectoryEntry[]> =>
  apiClient
    .get('/hr/employeesAndOrgs', { params: { keyword }, signal })
    .then(asArrayIn('content', DIRECTORY_ENTRY));
