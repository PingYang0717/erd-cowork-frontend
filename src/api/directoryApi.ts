import type { DirectoryEntry } from '@/types/api';

import { apiClient } from './apiClient';

/** How many characters the user must type before a search is worth making. The
 *  directory is org-wide, so a one- or two-character key matches most of it — the
 *  request would be large, slow, and useless to read. */
export const DIRECTORY_SEARCH_MIN_LENGTH = 3;

/** The HR directory answers inside a `content` envelope rather than as a bare array. */
interface DirectorySearchResponse {
  content?: DirectoryEntry[];
}

/** Searches people and org units by a free-text keyword (department code, section code,
 *  NT account or name). A search rather than a full listing: the directory is the whole
 *  organisation, which is far too large to send and filter client-side.
 *
 *  The envelope is unwrapped here so nothing downstream has to know about it — and read
 *  defensively, because a body without `content` (an error rendered as JSON, a shape
 *  change) must not reach the picker's `for…of`.
 *
 *  It raises rather than answering with an empty list. "No such person" is a real answer
 *  and a useful one; a broken response wearing that answer sends the user off to re-check
 *  a spelling that was never the problem. */
export const searchDirectory = async (
  keyword: string,
  signal?: AbortSignal,
): Promise<DirectoryEntry[]> => {
  const body = await apiClient.get<DirectorySearchResponse>('/hr/employeesAndOrgs', {
    params: { keyword },
    signal,
  });
  if (!Array.isArray(body?.content)) {
    throw new Error('The directory search came back without a `content` list.');
  }
  return body.content;
};
