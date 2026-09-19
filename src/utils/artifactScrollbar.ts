/** The app's scrollbar (index.css: 9px, a soft thumb, no track) stops at the Artifact's
 *  edge — the iframe is its own document, and a stylesheet does not cross that line.
 *  So the thread scrolled with the mockup's bar and the Artifact beside it with the
 *  browser's, and the two panes looked like two apps. The same rules travel into the
 *  Artifact as a `<style>` in its head, the way the policy does (`addCspMeta`), and
 *  for the same reason: a srcdoc document gets nothing from outside itself.
 *
 *  The thumb is a mid grey at low alpha rather than the app's token: the Artifact
 *  cannot read the parent's theme, its page is whatever colour the agent chose, and
 *  re-rendering the frame on a theme switch would restart the dashboard. One colour that
 *  reads on light and dark alike. */
export const ARTIFACT_SCROLLBAR_CSS = [
  '::-webkit-scrollbar{width:9px;height:9px}',
  '::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:5px}',
  '::-webkit-scrollbar-thumb:hover{background:rgba(128,128,128,.55)}',
  '::-webkit-scrollbar-track{background:transparent}',
].join('');

/** Writes the scrollbar rules as the last element in `<head>` — after the Artifact's
 *  own `<style>`s, so on equal specificity ours is the one that applies; the Artifact
 *  can still override from its body, which is its business. Called inside `withHead`,
 *  for the reasons it gives. */
export const addScrollbarStyle = (doc: Document): void => {
  const style = doc.createElement('style');
  style.setAttribute('data-erd', 'scrollbar');
  style.textContent = ARTIFACT_SCROLLBAR_CSS;
  doc.head.appendChild(style);
};
