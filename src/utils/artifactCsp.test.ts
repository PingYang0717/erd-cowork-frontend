import { describe, expect, it } from 'vitest';

import { injectCspMeta } from './artifactCsp';

const ORIGIN = 'https://erd.example.com';

function policyOf(html: string): string {
  const match = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
  return match ? match[1] : '';
}

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

  it('still protects a document with no head at all', () => {
    const injected = injectCspMeta('<p>bare</p>', ORIGIN);

    expect(policyOf(injected)).toContain("default-src 'none'");
    expect(injected).toContain('<p>bare</p>');
  });
});
