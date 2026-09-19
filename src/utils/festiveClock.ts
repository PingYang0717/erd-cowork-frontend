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
 *  changes while the animation runs moves it, by exactly the time since the last read. */
export const phaseNow = (periodSeconds: number, now: number = Date.now()): string =>
  `-${((now % (periodSeconds * 1000)) / 1000).toFixed(3)}s`;

/** The phase a hung thing swings at, from where it hangs (a fraction of its line's
 *  width) — so neighbours are never in step, and a lantern on the rail and one in the
 *  header at the same fraction move together. Pairs with `.sway` in
 *  festiveMotion.module.css. */
export const swayAt = (at: number): CSSProperties => ({ animationDelay: `${-(at * 9.7).toFixed(2)}s` });
