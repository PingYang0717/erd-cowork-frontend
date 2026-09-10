/** antd's own default, and the tallest this will ever ask for. */
export const DEFAULT_LIST_HEIGHT = 256;

/** A capped list still has to be a list. Below this it is a sliver you scroll through two
 *  rows at a time, which is a worse answer than a little overhang. */
export const MIN_LIST_HEIGHT = 120;

/** The popup's own chrome under the trigger: antd's 4px offset, the panel's padding, and
 *  enough left over that the last row does not sit flush against the region's edge. */
const CHROME = 20;

/** How tall the option list may be, given the room under the trigger.
 *
 *  Separated from the measuring below so the rule can be read and tested without a
 *  layout: never taller than antd's default, never shorter than a usable list.
 */
export const listHeightWithin = (room: number): number =>
  Math.max(MIN_LIST_HEIGHT, Math.min(DEFAULT_LIST_HEIGHT, Math.round(room)));

/** The room under `anchor` before a popup would leave the region it belongs to.
 *
 *  antd portals its popup to `<body>` and decides whether it fits by measuring against the
 *  viewport. In a three-pane layout the viewport is far taller than the scrolling
 *  conversation a card sits in, so a list that "fitted on screen" opened straight out of
 *  the thread and hung over the composer below it. Letting antd flip it upwards instead
 *  is worse: it covers the very question being answered.
 *
 *  The region marks itself with `data-popup-bounds`. Nothing to measure against — no such
 *  ancestor, or a layout that has not happened (jsdom) — means no constraint to apply.
 */
export const listHeightUnder = (anchor: Element | null | undefined): number => {
  const bounds = anchor?.closest('[data-popup-bounds]');
  if (!anchor || !bounds) {
    return DEFAULT_LIST_HEIGHT;
  }
  return listHeightWithin(bounds.getBoundingClientRect().bottom - anchor.getBoundingClientRect().bottom - CHROME);
};
