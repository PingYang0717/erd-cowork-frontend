import { describe, expect, it } from 'vitest';

import { DEFAULT_LIST_HEIGHT, listHeightUnder, listHeightWithin, MIN_LIST_HEIGHT } from '@/utils/dropdownListHeight';

/** A stand-in for a laid-out element: jsdom measures everything as zero, so the two
 *  rects this rule reads have to be supplied. */
const elementWithBottom = (bottom: number, bounds?: Element): Element => {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => ({ bottom }) as DOMRect;
  bounds?.appendChild(element);
  return element;
};

const boundsWithBottom = (bottom: number): Element => {
  const element = document.createElement('div');
  element.setAttribute('data-popup-bounds', '');
  element.getBoundingClientRect = () => ({ bottom }) as DOMRect;
  return element;
};

describe('dropdown list height', () => {
  it('takes the room available, up to antd’s own default', () => {
    expect(listHeightWithin(200)).toBe(200);
    expect(listHeightWithin(1000)).toBe(DEFAULT_LIST_HEIGHT);
  });

  /** A list capped to two rows is a worse answer than a little overhang: at that size the
   *  reader is scrolling a peephole rather than choosing from a list. */
  it('will not shrink a list into a sliver', () => {
    expect(listHeightWithin(40)).toBe(MIN_LIST_HEIGHT);
    expect(listHeightWithin(-80)).toBe(MIN_LIST_HEIGHT);
  });

  /** The regression: antd portals the popup to <body> and decides whether it fits by
   *  measuring against the viewport, which in a three-pane layout is far taller than the
   *  scrolling conversation — so a list that fitted on screen opened straight out of the
   *  thread and hung over the composer. */
  it('measures down to the region the trigger sits in, not to the viewport', () => {
    const bounds = boundsWithBottom(500);
    const anchor = elementWithBottom(300, bounds);

    // 200px of room, less the popup's own offset and padding.
    expect(listHeightUnder(anchor)).toBe(180);
  });

  it('leaves the list alone when there is no region to measure against', () => {
    expect(listHeightUnder(elementWithBottom(300))).toBe(DEFAULT_LIST_HEIGHT);
    expect(listHeightUnder(null)).toBe(DEFAULT_LIST_HEIGHT);
  });
});
