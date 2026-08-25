import { USER_ID_STORAGE_KEY } from '@/constants/storage';

export { USER_ID_STORAGE_KEY };

export type AuthHeaderProvider = () => Record<string, string>;

let cachedUserId: string | null = null;
let provider: AuthHeaderProvider | null = null;

/** Reads the browser's anonymous id, minting and persisting one on first use.
 *
 *  v1 has no sign-in: a user is whoever holds this id, and the backend filters every
 *  session by it (accessing someone else's returns 404). Clearing site data therefore
 *  means starting over, which is the intended v1 trade-off.
 */
function anonymousUserId(): string {
  if (cachedUserId !== null) {
    return cachedUserId;
  }

  let stored: string | null = null;
  try {
    stored = localStorage.getItem(USER_ID_STORAGE_KEY);
  } catch {
    // Private mode or blocked storage — fall through and mint a per-session id.
  }

  const id = stored ?? crypto.randomUUID();
  if (stored === null) {
    try {
      localStorage.setItem(USER_ID_STORAGE_KEY, id);
    } catch {
      // Not persistable; the cache below still keeps it stable for this page load.
    }
  }

  cachedUserId = id;
  return id;
}

/** Headers every request carries, whichever transport it uses. Shared by the axios
 *  interceptor and `agentApi`'s raw fetch — a stream that skipped the header would be
 *  answered for the wrong user, or not at all. */
export function getAuthHeaders(): Record<string, string> {
  if (provider !== null) {
    return provider();
  }
  return { 'X-User-Id': anonymousUserId() };
}

/** Seam for the internal deployment, where SSO / the gateway owns identity. Installing a
 *  provider that returns `{}` lets the gateway stamp the header on the way through
 *  without the browser overwriting it. Pass `null` to go back to the anonymous id. */
export function setAuthHeaderProvider(next: AuthHeaderProvider | null): void {
  provider = next;
}

/** Drops the in-memory cache. Only for tests — a real session keeps one id throughout. */
export function resetIdentity(): void {
  cachedUserId = null;
}
