import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import EmptyPorthole from './EmptyStateFestive';

/** A pane 950px wide with its window centred 475px from the edge the creature crosses:
 *  the left pane's right edge, the right pane's left. jsdom lays nothing out, so the
 *  boxes are stated. */
const rect = (left: number, right: number, top = 0, height = 0): DOMRect =>
  ({
    left,
    right,
    width: right - left,
    top,
    bottom: top + height,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

const layOut = () =>
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const pane = this.getAttribute('data-pane');
    if (pane === 'left') return rect(0, 950);
    if (pane === 'right') return rect(1000, 1950);
    if (this.hasAttribute('data-festive-porthole')) {
      // The left window 386px down a 900px viewport, the right 449px: the thread pane's
      // sits higher, pushed up by the composer under it.
      return this.closest('[data-pane="left"]') ? rect(416, 534, 327, 118) : rect(1416, 1534, 390, 118);
    }
    return rect(0, 0);
  });

const renderInPane = (panel: 'left' | 'right') =>
  render(
    <div data-pane={panel} style={{ overflow: 'hidden' }}>
      <EmptyPorthole festival="lunarNewYear" panel={panel} />
    </div>
  );

const phase = (root: HTMLElement) =>
  root.querySelector<HTMLElement>('[data-festive-porthole]')?.style.getPropertyValue('--phase');

const drift = (root: HTMLElement) =>
  root.querySelector<HTMLElement>('[data-festive-porthole]')?.style.getPropertyValue('--dy');

/** The porthole in the empty panes, and the creature that leaves it. Decoration: hidden
 *  from anyone reading the page, one creature a festival. */
describe('The empty panes’ porthole', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const viewportOf900 = () => vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900);

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

  /** The hand-off is a phase, not a message: both panes read the clock and agree on one
   *  instant — 75% of the 46s loop — at which the creature is at the rule between them.
   *  Each shifts its own copy so that the creature crosses its own edge right then.
   *  With the edge 475px from either window, that is 76.9% of the way through
   *  `escape-out` on the left (a shift of +0.870s) and 57.1% through `escape-in` on the
   *  right (−8.230s).
   *  Both read the clock, so the offset holds however far apart the two panes mounted. */
  it('shifts each pane so its creature crosses the rule at the one instant both agree on', () => {
    layOut();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(46_000 * 100 + 10_000));
    const { container: left } = renderInPane('left');
    const { container: right } = renderInPane('right');

    expect(phase(left)).toBe('-10.870s');
    expect(phase(right)).toBe('-1.770s');
  });

  /** At the hand-off itself the left copy stands 76.9% in and the right 57.1% in: the
   *  one creature at the rule from both sides. */
  it('has both copies at the rule at the hand-off', () => {
    layOut();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(46_000 * 100 + 34_500));
    const { container: left } = renderInPane('left');
    const { container: right } = renderInPane('right');

    expect(phase(left)).toBe('-35.370s');
    expect(phase(right)).toBe('-26.270s');
  });

  /** The two windows are not at one height, so each flight drifts towards the one line
   *  both panes agree on — 46.5% of the viewport, 418.5px here — and is on it at the
   *  edge. The drift is stated for the flight's far end (744px), so at the edge (459px
   *  past the flight's start) it is the 32.5px down the left window needs and the 30.5px
   *  up the right one does. */
  it('drifts each flight onto the shared line by the pane’s edge', () => {
    layOut();
    viewportOf900();
    const { container: left } = renderInPane('left');
    const { container: right } = renderInPane('right');

    expect(drift(left)).toBe('52.7px');
    expect(drift(right)).toBe('-49.4px');
  });
});
