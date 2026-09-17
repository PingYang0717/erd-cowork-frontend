import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { FESTIVAL_PREVIEW_STORAGE_KEY } from '@/constants/storage';
import { EmptyPorthole } from './EmptyStateFestive';

/** The porthole in the empty panels, and the koi that leaves it. Decoration: hidden from
 *  anyone reading the page, and drawn only for the festival it has been built for. */
describe('The empty panels’ porthole', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('draws the window and the escapee, out of the reader’s way', () => {
    const { container } = render(<EmptyPorthole festival="lunarNewYear" panel="left" />);

    const porthole = container.querySelector('[data-festive-porthole="left"]');
    expect(porthole).toHaveAttribute('aria-hidden', 'true');
    // The window, and the koi that is out in the panel: one drawing each.
    expect(porthole?.querySelectorAll('svg')).toHaveLength(2);
    expect(porthole?.querySelector('[data-festive-escape="left"]')).toBeInTheDocument();
  });

  /** The hand-off is a phase, not a message: the right-hand panel runs the same loop, far
   *  enough behind that its koi arrives as the left one's leaves. If these ever match, the
   *  two fish swim side by side and the trick is gone. */
  it('runs the right-hand panel a crossing behind the left', () => {
    const { container: left } = render(<EmptyPorthole festival="lunarNewYear" panel="left" />);
    const { container: right } = render(<EmptyPorthole festival="lunarNewYear" panel="right" />);

    const phase = (root: HTMLElement) =>
      root.querySelector<HTMLElement>('[data-festive-porthole]')?.style.getPropertyValue('--phase');

    expect(phase(left)).toBe('0s');
    expect(phase(right)).toBe('-12.88s');
  });

  /** The other three festivals have not been drawn yet, and a half-built window is worse
   *  than none: the panel keeps its own icon until they are. */
  it('leaves the panel its own icon for a festival it has no window for', () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'christmas');
    const { container } = render(<EmptyPorthole festival="christmas" panel="left" />);

    expect(container).toBeEmptyDOMElement();
  });
});
