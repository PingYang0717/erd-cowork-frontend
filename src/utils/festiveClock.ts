import type { CSSProperties } from 'react';

/** Where a looping animation of `periodSeconds` stands right now, as a negative
 *  `animation-delay`, read off the wall clock.
 *
 *  The festive surfaces mount at different moments — the rail with the page, a panel's
 *  empty state whenever a session closes — and a CSS animation starts when its element
 *  does. Each surface hands its loops a delay computed from the same clock instead, so
 *  every copy of a loop is at the same point whatever the mount time: one walker drawn
 *  three times, clipped to three surfaces, is still one walker.
 *
 *  Read once per mount (in a `useState` initialiser), never per render: a delay that
 *  changes while the animation runs moves it, by exactly the time since the last read.
 *
 *  `shiftSeconds` runs this copy that much ahead of the clock (behind, when negative):
 *  how two loops that must meet at one instant — the porthole's creature leaving one pane
 *  and entering the other — each place that instant in their own keyframes. */
export const phaseNow = (periodSeconds: number, now: number = Date.now(), shiftSeconds = 0): string => {
  const periodMs = periodSeconds * 1000;
  const intoMs = (((now + shiftSeconds * 1000) % periodMs) + periodMs) % periodMs;
  return `-${(intoMs / 1000).toFixed(3)}s`;
};

/** The phase a hung thing swings at, from where it hangs (a fraction of its line's
 *  width) — so neighbours are never in step, and a lantern on the rail and one in the
 *  header at the same fraction move together. Pairs with `.sway` in
 *  festiveMotion.module.css. */
export const swayAt = (at: number): CSSProperties => ({ animationDelay: `${-(at * 9.7).toFixed(2)}s` });

/** Where a hung thing's hook is, in px down from the top of its line's box, when it hangs
 *  at fraction `at` of the line's width. Every line things hang from — the header's
 *  string, the rail's echo of it — is one quadratic curve, `M0 <top> q<w/2> <sag> <w> 0`,
 *  which is y = top + 2·sag·t·(1−t); reading the drop off the same curve as the path is
 *  drawn from is what keeps things on the line whatever width it ends up. */
export const hangAt = (at: number, sag: number, top: number): number => top + 2 * sag * at * (1 - at);
