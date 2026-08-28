import { useRef, useState } from 'react';

interface HorizontalDragHandlers {
  /** Called on mousedown, before the first move. */
  onDragStart?: () => void;
  onDrag: (deltaX: number) => void;
  /** Called once on release. */
  onDragEnd?: () => void;
}

export function useHorizontalDrag({ onDragStart, onDrag, onDragEnd }: HorizontalDragHandlers) {
  const lastClientXRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  function onMouseDown(event: React.MouseEvent) {
    lastClientXRef.current = event.clientX;
    setIsDragging(true);
    onDragStart?.();
    // The pointer regularly leaves the narrow handle mid-drag, so the cursor
    // and selection are pinned on <body> for the duration — same as the
    // mockup's own resize handler.
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - lastClientXRef.current;
      lastClientXRef.current = moveEvent.clientX;
      onDrag(deltaX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setIsDragging(false);
      onDragEnd?.();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  return { onMouseDown, isDragging };
}
