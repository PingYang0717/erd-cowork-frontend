import React from 'react';

import { useHorizontalDrag } from '@/hooks/useHorizontalDrag';

import styles from './ResizeHandle.module.css';

// The draggable pane divider, matching eRDWorkspace20260819.html's `erd-resize`:
// a 9px grab area with a 1px line that is always visible and turns primary on
// hover or while dragging, so the boundary between two panes stays findable.
interface ResizeHandleProps {
  label: string;
  /** From `useResizablePane`: the width is written to the DOM during the drag and only
   *  reaches React on release. All three are required — every divider resizes a pane,
   *  and an optional start/end here would just let a call site forget the commit. */
  onDragStart: () => void;
  onDrag: (deltaX: number) => void;
  onDragEnd: () => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ label, onDragStart, onDrag, onDragEnd }) => {
  const { onPointerDown, isDragging } = useHorizontalDrag({ onDragStart, onDrag, onDragEnd });

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title="Drag to resize"
      className={`${styles.handle} ${isDragging ? styles.dragging : ''}`}
      onPointerDown={onPointerDown}
    >
      <i aria-hidden className={styles.line} />
    </div>
  );
};

export default ResizeHandle;
