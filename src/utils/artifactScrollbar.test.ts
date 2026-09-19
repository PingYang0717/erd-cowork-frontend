import { describe, expect, it } from 'vitest';

import { withHead } from './artifactHead';
import { addScrollbarStyle, ARTIFACT_SCROLLBAR_CSS } from './artifactScrollbar';

/** The rules written the way `ArtifactFrame` writes them: through one `withHead`. */
const injectScrollbarStyle = (html: string): string => withHead(html, addScrollbarStyle);

const scrollbarStyle = (html: string): HTMLStyleElement | null =>
  new DOMParser().parseFromString(html, 'text/html').head.querySelector('style[data-erd="scrollbar"]');

describe('addScrollbarStyle', () => {
  it('puts the rules last in <head>, after the artifact’s own styles', () => {
    const html = '<!doctype html><html><head><style>body{margin:0}</style></head><body></body></html>';

    const injected = injectScrollbarStyle(html);

    const style = scrollbarStyle(injected);
    expect(style?.textContent).toBe(ARTIFACT_SCROLLBAR_CSS);
    expect(style?.previousElementSibling?.textContent).toBe('body{margin:0}');
    expect(style?.nextElementSibling).toBeNull();
    expect(injected.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  it('gives a document without a <head> one to carry them', () => {
    const style = scrollbarStyle(injectScrollbarStyle('<p>hi</p>'));

    expect(style).not.toBeNull();
  });
});
