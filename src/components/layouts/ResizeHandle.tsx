import React from 'react';

import { useHorizontalDrag } from '@/hooks/useHorizontalDrag';

import styles from './ResizeHandle.module.css';

// The draggable pane divider, matching eRDWorkspace20260819.html's `erd-resize`:
// a 9px grab area with a 1px line that is always visible and turns primary on
// hover or while dragging, so the boundary between two panes stays findable.
interface ResizeHandleProps {
  label: string;
  onDrag: (deltaX: number) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ label, onDrag }) => {
  const { onMouseDown, isDragging } = useHorizontalDrag(onDrag);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title="Drag to resize"
      className={`${styles.handle} ${isDragging ? styles.dragging : ''}`}
      onMouseDown={onMouseDown}
    >
      <i aria-hidden className={styles.line} />
    </div>
  );
};

export default ResizeHandle;
