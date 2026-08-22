import { useCallback, useRef } from 'react';

export function useHorizontalDrag(onDrag: (deltaX: number) => void) {
  const lastClientXRef = useRef(0);

  return useCallback(
    (event: React.MouseEvent) => {
      lastClientXRef.current = event.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - lastClientXRef.current;
        lastClientXRef.current = moveEvent.clientX;
        onDrag(deltaX);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [onDrag],
  );
}
