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

const phase = (root: HTMLElement, leg: 'out' | 'in') =>
  root.querySelector<HTMLElement>(`[data-festive-escape][data-leg="${leg}"]`)?.style.getPropertyValue('--phase');

const drift = (root: HTMLElement) =>
  root.querySelector<HTMLElement>('[data-festive-porthole]')?.style.getPropertyValue('--dy');

/** The porthole in the empty panes, and the one creature that crosses between them.
 *  Decoration: hidden from anyone reading the page, one creature a festival. */
describe('The empty panes’ porthole', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const viewportOf900 = () => vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900);

  it.each(['lunarNewYear', 'christmas', 'halloween', 'midAutumn'] as const)(
    'draws the window and the creature on both its legs for %s, out of the reader’s way',
    (festival) => {
      const { container } = render(<EmptyPorthole festival={festival} panel="left" />);

      const porthole = container.querySelector('[data-festive-porthole="left"]');
      expect(porthole).toHaveAttribute('aria-hidden', 'true');
      // The window, and the creature leaving and the creature arriving: one drawing each.
      expect(porthole?.querySelectorAll('svg')).toHaveLength(3);
      expect(porthole?.querySelector('[data-festive-escape="left"][data-leg="out"]')).toBeInTheDocument();
      expect(porthole?.querySelector('[data-festive-escape="left"][data-leg="in"]')).toBeInTheDocument();
    }
  );

  /** The hand-off is a phase, not a message: both panes read the clock and agree on two
   *  instants in the 16s loop — 25% going right, 75% coming back — at which the creature
   *  is at the rule between them. Each pane shifts each of its legs so that the creature
   *  crosses its own edge right then. With the edge 475px from either window, a leg out
   *  crosses it 29.8% of the way through its keyframes and a leg in 71.7% (the steady
   *  flights are 25.8–32.9% and 68.6–75.7%, 100px to 760px): the left pane's `out` leg
   *  runs +0.773s ahead of the clock to land on 25%, its `in` leg −0.533s to land on
   *  75%; the right pane's `in` leg +7.467s for 25% (wrapping past the loop's end), its
   *  `out` leg −7.227s for 75%. Both read the clock, so the offsets hold however far
   *  apart the two panes mounted. */
  it('shifts each leg so its creature crosses the rule at the instant both panes agree on', () => {
    layOut();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(16_000 * 100 + 10_000));
    const { container: left } = renderInPane('left');
    const { container: right } = renderInPane('right');

    expect(phase(left, 'out')).toBe('-10.773s');
    expect(phase(left, 'in')).toBe('-9.467s');
    expect(phase(right, 'in')).toBe('-1.467s');
    expect(phase(right, 'out')).toBe('-2.773s');
  });

  /** The two windows are not at one height, so each flight drifts towards the one line
   *  both panes agree on — 46.5% of the viewport, 418.5px here — and is on it at the
   *  edge. The drift is stated for the flight's far end (760px from the window), so at
   *  the edge (475px out) it is the 32.5px down the left window needs and the 30.5px up
   *  the right one does. */
  it('drifts each flight onto the shared line by the pane’s edge', () => {
    layOut();
    viewportOf900();
    const { container: left } = renderInPane('left');
    const { container: right } = renderInPane('right');

    expect(drift(left)).toBe('52.0px');
    expect(drift(right)).toBe('-48.8px');
  });
});
