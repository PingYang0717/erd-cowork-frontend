import { describe, expect, it } from 'vitest';

import { injectCspMeta } from './artifactCsp';

const ORIGIN = 'https://erd.example.com';

const policyOf = (html: string): string => {
  const match = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
  return match ? match[1] : '';
};

/** Parses the injected document the way a browser would, and reports where the policy
 *  actually landed. String matching cannot answer this: a `<meta>` sitting inside a
 *  comment or a JS string literal still matches a regex, but the document it produces
 *  has no policy at all. */
const parsedPolicy = (html: string): { inHead: boolean; isFirstInHead: boolean } => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const meta = doc.head.querySelector('meta[http-equiv="Content-Security-Policy"]');
  return {
    inHead: meta !== null,
    isFirstInHead: meta !== null && doc.head.firstElementChild === meta,
  };
};

describe('injectCspMeta', () => {
  it('puts the policy first inside <head>, before anything the document loads', () => {
    const html = '<!doctype html><html><head><title>x</title></head><body></body></html>';

    const injected = injectCspMeta(html, ORIGIN);

    expect(injected.indexOf('Content-Security-Policy')).toBeLessThan(injected.indexOf('<title>'));
  });

  it('denies everything by default, and network access outright', () => {
    const policy = policyOf(injectCspMeta('<html><head></head></html>', ORIGIN));

    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("connect-src 'none'");
  });

  it('allows the inline script and style an artifact is built from', () => {
    const policy = policyOf(injectCspMeta('<html><head></head></html>', ORIGIN));

    expect(policy).toContain("'unsafe-inline'");
  });

  it('names the parent origin explicitly — an opaque origin matches no self', () => {
    const policy = policyOf(injectCspMeta('<html><head></head></html>', ORIGIN));

    expect(policy).toContain(`script-src ${ORIGIN}`);
    expect(policy).toContain(`img-src ${ORIGIN}`);
    expect(policy).not.toContain("'self'");
  });

  it('keeps a head with attributes, injecting after the open tag', () => {
    const injected = injectCspMeta('<html><head lang="en"><title>x</title></head></html>', ORIGIN);

    expect(injected).toContain('<head lang="en"><meta http-equiv="Content-Security-Policy"');
  });

  /** The artifact is HTML an agent wrote, and dashboards that generate HTML routinely
   *  mention `<head>` in a comment or a string. Matching the first literal occurrence
   *  put the policy inside that comment — the document then had NO policy, rendered
   *  perfectly, and reported no error. */
  it('is not fooled by a <head> inside an HTML comment', () => {
    const html = '<body><!-- builds a <head> for the export --><p>x</p></body>';

    expect(parsedPolicy(injectCspMeta(html, ORIGIN))).toEqual({
      inHead: true,
      isFirstInHead: true,
    });
  });

  it('is not fooled by a <head> inside a script string literal', () => {
    const html = `<body><script>var shell = "<head>" + title;</script></body>`;

    expect(parsedPolicy(injectCspMeta(html, ORIGIN))).toEqual({
      inHead: true,
      isFirstInHead: true,
    });
  });

  /** A script written before `<head>` is hoisted by the parser into the head — ahead of
   *  a policy that was inserted after the literal `<head>` tag. A meta CSP only binds
   *  requests made after it is parsed, so that script ran unpoliced and could take the
   *  data baked into the document with it. */
  it('puts the policy ahead of a script that the parser hoists into head', () => {
    const html = '<html><script>exfiltrate()</script><head><title>x</title></head></html>';

    expect(parsedPolicy(injectCspMeta(html, ORIGIN))).toEqual({
      inHead: true,
      isFirstInHead: true,
    });
  });

  it('still protects a document with no head at all', () => {
    const injected = injectCspMeta('<p>bare</p>', ORIGIN);

    expect(policyOf(injected)).toContain("default-src 'none'");
    expect(injected).toContain('<p>bare</p>');
  });
});
