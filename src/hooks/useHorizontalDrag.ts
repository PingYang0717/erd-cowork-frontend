import { useRef, useState } from 'react';

interface HorizontalDragHandlers {
  /** Called on pointer down, before the first move. */
  onDragStart?: () => void;
  onDrag: (deltaX: number) => void;
  /** Called once when the drag ends, however it ends. */
  onDragEnd?: () => void;
}

/** Drag tracking for a pane divider.
 *
 *  Uses **pointer** events with `setPointerCapture`, not mouse events. The Artifact panel
 *  on the right of one of these dividers is an `<iframe>`, and a document does not see
 *  mouse events that happen over a nested browsing context: release the button there and
 *  the parent's `mouseup` never fires. The drag stayed armed (the pane then followed the
 *  pointer with no button held) and its listeners were never detached, so every further
 *  drag piled another set on — the "it gets laggier the more I drag it" part.
 *
 *  Capture routes every event for this pointer to the handle regardless of what sits
 *  underneath, iframes included. Listeners still go on `window` so they work where capture
 *  is unavailable (jsdom, older browsers), and `buttons === 0` is a last-resort net for any
 *  release we still never hear about. */
export const useHorizontalDrag = ({ onDragStart, onDrag, onDragEnd }: HorizontalDragHandlers) => {
  const lastClientXRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = (event: React.PointerEvent) => {
    // Secondary buttons do not resize anything, and would otherwise arm a drag that only
    // the context menu could end.
    if (event.button !== 0) return;

    const handle = event.currentTarget;
    const { pointerId } = event;
    lastClientXRef.current = event.clientX;
    setIsDragging(true);
    onDragStart?.();
    // The pointer regularly leaves the narrow handle mid-drag, so the cursor
    // and selection are pinned on <body> for the duration — same as the
    // mockup's own resize handler.
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Not available in jsdom, and absent on older browsers; the window listeners below
    // carry the drag on their own there.
    handle.setPointerCapture?.(pointerId);

    const endDrag = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('lostpointercapture', endDrag);
      if (handle.hasPointerCapture?.(pointerId)) {
        handle.releasePointerCapture?.(pointerId);
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setIsDragging(false);
      onDragEnd?.();
    };

    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      // The button is no longer down but we never saw it come up. Finish here rather than
      // dragging the pane around after a release we missed.
      if (moveEvent.buttons === 0) {
        endDrag();
        return;
      }
      const deltaX = moveEvent.clientX - lastClientXRef.current;
      lastClientXRef.current = moveEvent.clientX;
      onDrag(deltaX);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    window.addEventListener('lostpointercapture', endDrag);
  };

  return { onPointerDown, isDragging };
};
