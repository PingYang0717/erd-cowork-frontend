import type { DirectoryEntry } from '@/types/api';
import { apiClient } from './apiClient';

/** Where an employee's picture lives, by their employee id.
 *
 *  A placeholder. The real address is confidential and must not be committed — when it
 *  arrives it should reach the client the way other deployment facts do (`GET /config`)
 *  or through the internal bootstrap seam (ADR-0007), not by being written here. Recorded
 *  in `backend-feedback.md`. */
const AVATAR_URL_TEMPLATE = 'https://avatar.example.internal/employees/{emplId}.jpg';

/** The signed-in employee, as `GET /hr/userInfo` describes them.
 *
 *  The same row shape as the directory search — one endpoint's people are the other's —
 *  plus the employee id, which only this one carries. `avatarUrl` is not on the wire: it
 *  is derived here so no screen has to know the rule for turning an id into an address. */
export interface UserInfo extends DirectoryEntry {
  emplId?: string;
  avatarUrl: string | null;
}

/** Who this browser is signed in as.
 *
 *  A single object, not the `content` envelope the directory search answers with: the
 *  question has one answer, so there is no list to wrap. Reading one shape as the other
 *  finds nothing and says nothing about why.
 *
 *  Never throws for a missing picture — an employee with no id simply has no address, and
 *  the header falls back to their initials. Identity is what this answers; the picture is
 *  a decoration on it. */
export const getUserInfo = async (): Promise<UserInfo> => {
  const entry = await apiClient.get<DirectoryEntry & { emplId?: string }>('/hr/userInfo');
  return {
    ...entry,
    avatarUrl: entry?.emplId ? AVATAR_URL_TEMPLATE.replace('{emplId}', entry.emplId) : null,
  };
};
