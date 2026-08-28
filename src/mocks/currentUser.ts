import { getAuthHeaders } from '@/api/apiClient';

export interface CurrentUser {
  /** Whoever this browser is, as far as the backend is concerned. */
  readonly id: string;
  readonly name: string;
  readonly department: string;
}

/** The signed-in user, as the mock backend sees them (test-only — the app itself never
 *  imports this; ownership like `isOwn` comes from the real backend).
 *
 *  `id` is not a fixture: it reads the same value that travels as `X-User-Id`, so the
 *  mock's ownership deriving (`toArtifactDto`) agrees with what a backend filtering by
 *  that header would decide. `name` and `department` are placeholders. */
export const currentUser: CurrentUser = {
  get id() {
    return getAuthHeaders()['X-User-Id'] ?? 'anonymous';
  },
  name: 'Alex Chen',
  department: 'Process Integration',
};
