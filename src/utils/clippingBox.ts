/** The box an element's overflow is cut to: the nearest ancestor that clips, or the
 *  viewport when nothing does. Every pane in the Studio clips (`overflow: hidden` on the
 *  columns), so this is a pane's edge as seen from anything inside it — the edge a
 *  tooltip must stay inside of, the edge the porthole's creature leaves the pane at. */
export const clippingElement = (element: HTMLElement): HTMLElement | null => {
  for (let node = element.parentElement; node !== null && node !== document.body; node = node.parentElement) {
    const { overflow, overflowX, overflowY } = getComputedStyle(node);
    if ([overflow, overflowX, overflowY].some((value) => value !== '' && value !== 'visible')) {
      return node;
    }
  }
  return null;
};

export const clippingBox = (element: HTMLElement): { top: number; left: number; right: number } => {
  const clipper = clippingElement(element);
  if (clipper === null) {
    return { top: 0, left: 0, right: window.innerWidth };
  }
  const { top, left, right } = clipper.getBoundingClientRect();
  return { top, left, right };
};
