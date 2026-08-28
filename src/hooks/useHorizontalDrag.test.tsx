import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHorizontalDrag } from './useHorizontalDrag';

/** Counts the mousemove/mouseup listeners currently attached to window, so a drag that
 *  fails to clean up shows as a rising number rather than as "feels laggy". */
function trackWindowListeners() {
  const live = { pointermove: 0, pointerup: 0 };
  const add = window.addEventListener.bind(window);
  const remove = window.removeEventListener.bind(window);

  vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, ...rest: unknown[]) => {
    if (type in live) live[type as keyof typeof live] += 1;
    return (add as (...args: unknown[]) => void)(type, ...rest);
  }) as typeof window.addEventListener);

  vi.spyOn(window, 'removeEventListener').mockImplementation(((
    type: string,
    ...rest: unknown[]
  ) => {
    if (type in live) live[type as keyof typeof live] -= 1;
    return (remove as (...args: unknown[]) => void)(type, ...rest);
  }) as typeof window.removeEventListener);

  return live;
}

const Harness: React.FC<{ onDrag: (deltaX: number) => void }> = ({ onDrag }) => {
  const { onPointerDown } = useHorizontalDrag({ onDrag });
  return (
    <div role="separator" aria-label="Handle" onPointerDown={onPointerDown}>
      grip
    </div>
  );
};

describe('useHorizontalDrag', () => {
  let live: ReturnType<typeof trackWindowListeners>;

  beforeEach(() => {
    live = trackWindowListeners();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detaches its listeners when the drag ends normally', () => {
    const onDrag = vi.fn();
    render(<Harness onDrag={onDrag} />);
    const handle = screen.getByRole('separator');

    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 120, buttons: 1 });
    fireEvent.pointerUp(window);

    expect(live).toEqual({ pointermove: 0, pointerup: 0 });
  });

  /** The pane on the right of this divider is an iframe. While the pointer is over it,
   *  the parent document receives no mouse events at all — so a release there never
   *  reaches the `mouseup` listener on `window`. The drag is then still armed: the next
   *  time the pointer moves, the pane follows it without any button held down. */
  it('does not keep dragging when the release never reaches the window', () => {
    const onDrag = vi.fn();
    render(<Harness onDrag={onDrag} />);
    const handle = screen.getByRole('separator');

    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 120, buttons: 1 });
    // The button comes up over the iframe: the parent window sees nothing.
    onDrag.mockClear();

    // Pointer re-enters the parent document, button no longer held.
    fireEvent.pointerMove(window, { clientX: 400, buttons: 0 });

    expect(onDrag).not.toHaveBeenCalled();
  });

  /** Each drag that fails to clean up leaves its listeners behind, and every one of them
   *  runs on every subsequent mousemove — which is the "gets progressively laggier" part. */
  it('does not accumulate listeners across drags that end outside the window', () => {
    render(<Harness onDrag={vi.fn()} />);
    const handle = screen.getByRole('separator');

    for (let i = 0; i < 5; i += 1) {
      fireEvent.pointerDown(handle, { clientX: 100 });
      fireEvent.pointerMove(window, { clientX: 150, buttons: 1 });
      // No mouseup reaches the window — released over the iframe.
      fireEvent.pointerMove(window, { clientX: 100, buttons: 0 });
    }

    expect(live.pointermove).toBeLessThanOrEqual(1);
  });
});
