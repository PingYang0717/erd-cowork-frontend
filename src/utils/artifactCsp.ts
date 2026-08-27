/** An Artifact is a whole HTML document the agent wrote, and `sandbox="allow-scripts"`
 *  only stops it reaching back into this app. It does not stop it reaching out: a buggy
 *  or hostile artifact can still fetch, and take the data it was given with it. The
 *  policy below closes that, and it travels as a `<meta>` tag because a `srcdoc`
 *  document never sees a response header.
 *
 *  `'self'` is useless here — a sandboxed document has an opaque origin that matches no
 *  source — so the host has to be the parent's origin, written out. */
const HEAD_OPEN_TAG = /<head\b[^>]*>/i;

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

/** Returns `html` with the policy as the first thing inside `<head>`, so it is in force
 *  before the document loads anything. A document with no head gets it at the very
 *  front, which parsers hoist into the head they synthesise. */
export function injectCspMeta(html: string, origin: string): string {
  const metaTag = `<meta http-equiv="Content-Security-Policy" content="${buildPolicy(origin)}">`;
  const headMatch = HEAD_OPEN_TAG.exec(html);

  if (!headMatch) {
    return metaTag + html;
  }

  const insertAt = headMatch.index + headMatch[0].length;
  return html.slice(0, insertAt) + metaTag + html.slice(insertAt);
}
