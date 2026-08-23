import { useHorizontalDrag } from '../hooks/useHorizontalDrag';
import styles from './ResizeHandle.module.css';

// The draggable pane divider, matching eRDWorkspace20260819.html's `erd-resize`:
// a 9px grab area with a 1px line that is always visible and turns primary on
// hover or while dragging, so the boundary between two panes stays findable.
export function ResizeHandle({
  label,
  onDrag,
}: {
  label: string;
  onDrag: (deltaX: number) => void;
}) {
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
}
