import { type RefObject, useCallback, useRef } from 'react';

import { clamp } from '@/utils/clamp';

interface ResizablePaneOptions {
  min: number;
  max: number;
  /** The pane's committed width, read fresh at drag start. */
  read: () => number;
  /** Called once, on release, with the final width. */
  commit: (width: number) => void;
}

interface ResizablePane<T extends HTMLElement> {
  /** Put this on the pane element whose width the handle drags. */
  paneRef: RefObject<T>;
  onDragStart: () => void;
  onDrag: (deltaX: number) => void;
  onDragEnd: () => void;
}

/** A pane whose width is dragged directly on the DOM, and only reaches React on release.
 *
 *  A drag emits a mousemove per frame. Routing each one through a store would re-render
 *  the panes ~60 times a second — for the thread divider that means re-rendering the whole
 *  message list and the Artifact panel beside it, which is what made that divider feel
 *  heavy while the session rail's felt fine (the rail's subtree happens to sit behind a
 *  router `<Outlet/>`, which absorbed the re-render).
 *
 *  So the width lives on the DOM node for the duration of the drag and is committed to the
 *  store once, on release. The committed value is still what renders the pane, so nothing
 *  else has to know this happened. */
export const useResizablePane = <T extends HTMLElement>({
  min,
  max,
  read,
  commit,
}: ResizablePaneOptions): ResizablePane<T> => {
  const paneRef = useRef<T>(null);
  const widthRef = useRef(0);

  // Read at drag start rather than tracking the store: there is no draft to keep in sync,
  // so a width changed from elsewhere (a reset, a collapse) is picked up for free.
  const onDragStart = useCallback(() => {
    widthRef.current = read();
  }, [read]);

  const onDrag = useCallback(
    (deltaX: number) => {
      widthRef.current = clamp(widthRef.current + deltaX, min, max);
      if (paneRef.current) {
        paneRef.current.style.width = `${widthRef.current}px`;
      }
    },
    [min, max],
  );

  const onDragEnd = useCallback(() => {
    commit(widthRef.current);
  }, [commit]);

  return { paneRef, onDragStart, onDrag, onDragEnd };
};
