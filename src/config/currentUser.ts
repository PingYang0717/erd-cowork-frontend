import { getAuthHeaders } from '@/api/identity';

export interface CurrentUser {
  /** Whoever this browser is, as far as the backend is concerned. */
  readonly id: string;
  readonly name: string;
  readonly department: string;
}

/** The signed-in user.
 *
 *  `id` is not a fixture: it is the same value that travels as `X-User-Id`, so anything
 *  that resolves ownership (the Gallery's "Yours" filter, the mock backend's `mine`)
 *  agrees with what the backend would decide. `name` and `department` are still
 *  placeholders — v1 has no directory lookup for the current user.
 */
export const currentUser: CurrentUser = {
  get id() {
    return getAuthHeaders()['X-User-Id'] ?? 'anonymous';
  },
  name: 'Alex Chen',
  department: 'Process Integration',
};
