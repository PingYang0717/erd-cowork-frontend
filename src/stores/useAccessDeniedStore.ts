import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/** The refusal, as the backend stated it. `ACCESS_DENIED` (no rights to this resource) and
 *  `ENTITLEMENT_DENIED` (the account lacks the A4 entitlement) are told apart here and
 *  nowhere else — the screen shows the backend's own sentence, which already says which
 *  it was and what to do about it. The code is kept so a log can tell them apart. */
export interface AccessDenial {
  /** Null when the refusal arrived without one — a 403 is still a refusal. */
  code: string | null;
  message: string;
}

interface AccessDeniedState {
  /** Null until the account is refused. Never returns to null on its own. */
  denial: AccessDenial | null;
  deny: (denial: AccessDenial) => void;
  /** For tests. Nothing in the app clears a denial: it is a fact about the account, and
   *  the only honest way back is a reload, which asks the backend again. */
  clear: () => void;
}

/** Whether this account is refused outright.
 *
 *  Set from the two places every request goes through — the axios interceptor and the
 *  agent stream's raw `fetch` — rather than from call sites, so a new endpoint cannot
 *  forget to handle it. A 403 is a fact about the account, not about the one request that
 *  hit it, so this deliberately covers background refetches too: leaving the user on a
 *  screen whose every subsequent request will be refused only defers the same message.
 *
 *  The first denial wins. A denied account produces a burst of them as the queries in
 *  flight all come back, and the later ones say nothing the first did not.
 */
export const useAccessDeniedStore = create<AccessDeniedState>()(
  devtools(
    (set) => ({
      denial: null,
      deny: (denial) => set((state) => (state.denial === null ? { denial } : state), false, 'deny'),
      clear: () => set({ denial: null }, false, 'clear'),
    }),
    { name: 'accessDenied' }
  )
);
