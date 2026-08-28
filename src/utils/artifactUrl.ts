/** Where an Artifact lives, in the two forms the app needs.
 *
 *  The router is a **hash** router, so anything that reaches the browser directly —
 *  `window.open`, the clipboard, an `href` — needs the `#` that `navigate()` adds for
 *  free. Getting that wrong produces a link that simply does not open, with no error
 *  anywhere. Both forms come from here so the routing strategy is known in one place;
 *  switching back to a history router means changing `artifactHref` here plus the
 *  factory in `app/router.tsx` — and the `/#/` assertions in `artifactUrl.test.ts`. */

/** The in-app route, for `navigate()` and `<Route path>` — no `#`, React Router owns it. */
export function artifactRoute(artifactId: string): string {
  return `/cowork/artifact/${artifactId}`;
}

/** A full URL that survives leaving the app: pasted into a chat, opened in a new tab. */
export function artifactHref(artifactId: string): string {
  return `${window.location.origin}/#${artifactRoute(artifactId)}`;
}
