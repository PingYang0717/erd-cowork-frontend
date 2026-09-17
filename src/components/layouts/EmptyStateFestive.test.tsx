import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { EmptyPorthole } from './EmptyStateFestive';

/** The porthole in the empty panes, and the creature that leaves it. Decoration: hidden
 *  from anyone reading the page, one creature a festival. */
describe('The empty panes’ porthole', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(['lunarNewYear', 'christmas', 'halloween', 'midAutumn'] as const)(
    'draws the window and the escapee for %s, out of the reader’s way',
    (festival) => {
      const { container } = render(<EmptyPorthole festival={festival} panel="left" />);

      const porthole = container.querySelector('[data-festive-porthole="left"]');
      expect(porthole).toHaveAttribute('aria-hidden', 'true');
      // The window, and the creature that is out in the pane: one drawing each.
      expect(porthole?.querySelectorAll('svg')).toHaveLength(2);
      expect(porthole?.querySelector('[data-festive-escape="left"]')).toBeInTheDocument();
    }
  );

  /** The hand-off is a phase, not a message: the right-hand pane runs the same loop, a
   *  crossing behind, so its creature arrives as the left one's leaves. Both read the
   *  clock, so the offset holds however far apart the two panes mounted. */
  it('runs the right-hand pane a crossing behind the left, off the clock', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(46_000 * 100 + 10_000));
    const { container: left } = render(<EmptyPorthole festival="lunarNewYear" panel="left" />);
    const { container: right } = render(<EmptyPorthole festival="lunarNewYear" panel="right" />);

    const phase = (root: HTMLElement) =>
      root.querySelector<HTMLElement>('[data-festive-porthole]')?.style.getPropertyValue('--phase');

    expect(phase(left)).toBe('-10.000s');
    expect(phase(right)).toBe('-22.880s');
  });
});
