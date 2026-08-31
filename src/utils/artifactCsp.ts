/** An Artifact is a whole HTML document the agent wrote, and `sandbox="allow-scripts"`
 *  only stops it reaching back into this app. It does not stop it reaching out: a buggy
 *  or hostile artifact can still fetch, and take the data it was given with it. The
 *  policy below closes that, and it travels as a `<meta>` tag because a `srcdoc`
 *  document never sees a response header.
 *
 *  `'self'` is useless here — a sandboxed document has an opaque origin that matches no
 *  source — so the host has to be the parent's origin, written out. */

function buildPolicy(origin: string): string {
  return [
    // Nothing loads unless a directive below says otherwise.
    "default-src 'none'",
    // The artifact's own inline script; the origin covers anything this app serves it.
    `script-src ${origin} 'unsafe-inline'`,
    "style-src 'unsafe-inline'",
    `img-src ${origin} data:`,
    // No fetch, no XHR, no WebSocket: an artifact renders what it was given and has no
    // business talking to anyone.
    "connect-src 'none'",
  ].join('; ');
}

/** Returns `html` with the policy as the first element in `<head>`, so it is in force
 *  before the document loads anything.
 *
 *  The insertion goes through `DOMParser` rather than a regex, because "where is the
 *  head" is a question only a parser can answer, and two ways of getting it wrong were
 *  both silent:
 *
 *  - **A `<head>` inside a comment or a string literal.** Matching the first literal
 *    occurrence put the `<meta>` inside that comment. The document then carried NO
 *    policy at all, rendered perfectly, and reported nothing — and an agent writing a
 *    dashboard that generates HTML mentions `<head>` in a string routinely.
 *  - **A script written before `<head>`.** The parser hoists it into the head, ahead of
 *    a policy inserted after the literal tag. A meta CSP only binds requests made after
 *    it is parsed, so that script ran unpoliced.
 *
 *  Parsing here is the same parse the iframe will do, so the head we find is the head
 *  the browser will build — including any element it hoisted into it. */
export function injectCspMeta(html: string, origin: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const meta = doc.createElement('meta');
  meta.setAttribute('http-equiv', 'Content-Security-Policy');
  meta.setAttribute('content', buildPolicy(origin));
  doc.head.insertBefore(meta, doc.head.firstChild);

  const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : '';
  return doctype + doc.documentElement.outerHTML;
}
