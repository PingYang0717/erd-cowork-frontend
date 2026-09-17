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
