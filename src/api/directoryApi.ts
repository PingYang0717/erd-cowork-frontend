import type { DirectoryEntry } from '@/types/api/index';

import { apiClient } from './apiClient';

/** How many characters the user must type before a search is worth making. The
 *  directory is org-wide, so a one- or two-character key matches most of it — the
 *  request would be large, slow, and useless to read. */
export const DIRECTORY_SEARCH_MIN_LENGTH = 3;

export const directoryApi = {
  /** Searches people and org units by a free-text key (department code, section code,
   *  NT account or name). A search rather than a full listing: the directory is the
   *  whole organisation, which is far too large to send and filter client-side. */
  search: (key: string, signal?: AbortSignal) =>
    apiClient.get<DirectoryEntry[]>('/hr/employeesAndOrgs', {
      params: { key },
      signal,
    }),
};
