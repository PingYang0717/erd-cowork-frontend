import React from 'react';

import { useHorizontalDrag } from '@/hooks/useHorizontalDrag';

import styles from './ResizeHandle.module.css';

/** One arrow press moves the boundary this much. Matches the smallest useful visual
 *  step — fine enough to hit any width, coarse enough not to need thirty presses. */
const KEYBOARD_STEP_PX = 16;

// The draggable pane divider, matching eRDWorkspace20260819.html's `erd-resize`:
// a 9px grab area with a 1px line that is always visible and turns primary on
// hover or while dragging, so the boundary between two panes stays findable.
interface ResizeHandleProps {
  label: string;
  /** The pane's committed width and its limits — what aria-valuenow/min/max report,
   *  so a reader hears where the boundary is and how far it can go (A-4). */
  value: number;
  min: number;
  max: number;
  /** From `useResizablePane`: the width is written to the DOM during the drag and only
   *  reaches React on release. All three are required — every divider resizes a pane,
   *  and an optional start/end here would just let a call site forget the commit. */
  onDragStart: () => void;
  onDrag: (deltaX: number) => void;
  onDragEnd: () => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
  label,
  value,
  min,
  max,
  onDragStart,
  onDrag,
  onDragEnd,
}) => {
  const { onPointerDown, isDragging } = useHorizontalDrag({ onDragStart, onDrag, onDragEnd });

  /** A key press is a complete one-step drag: read the committed width, move it,
   *  commit. Going through the same start/drag/end protocol as the pointer keeps the
   *  clamp and the store write in one place (A-4 — this control was pointer-only). */
  const stepBy = (deltaX: number) => {
    onDragStart();
    onDrag(deltaX);
    onDragEnd();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepBy(-KEYBOARD_STEP_PX);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepBy(KEYBOARD_STEP_PX);
    }
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      title="Drag to resize"
      className={`${styles.handle} ${isDragging ? styles.dragging : ''}`}
      onPointerDown={onPointerDown}
      onKeyDown={handleKeyDown}
    >
      <i aria-hidden className={styles.line} />
    </div>
  );
};

export default ResizeHandle;
