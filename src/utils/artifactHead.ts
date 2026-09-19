/** Runs `edit` on the parsed document and serialises it back: how anything the app owes
 *  an Artifact's document — the policy, the scrollbar — gets written into its head.
 *  Parsed rather than pattern-matched, because "where is the head" is a question only a
 *  parser can answer (artifactCsp.ts gives the two silent ways a regex got it wrong), and
 *  this is the same parse the iframe will do, so the head found here is the head the
 *  browser will build — including anything it hoisted into it. */
export const withHead = (html: string, edit: (doc: Document) => void): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  edit(doc);
  const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : '';
  return doctype + doc.documentElement.outerHTML;
};
