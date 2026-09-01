import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** The delay is a product decision, not an implementation detail: AGENTS.md fixes
   *  search debounce at 300–500ms. Asserted here because every timing test below
   *  advances by a literal number of milliseconds rather than by the constant — driving
   *  the clock with the same constant the hook uses would make them agree by
   *  construction, and a delay of any length at all would pass. */
  it('waits within the range the product calls for', () => {
    expect(SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(300);
    expect(SEARCH_DEBOUNCE_MS).toBeLessThanOrEqual(500);
  });

  it('holds the value back until typing stops', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'I' },
    });

    rerender({ value: 'In' });
    rerender({ value: 'Inline' });
    expect(result.current).toBe('I');

    // 500ms is the top of the permitted range, so this settles whatever the constant is
    // — while a hook that waited a second (a value nothing in the suite would otherwise
    // catch) leaves it un-settled.
    act(() => vi.advanceTimersByTime(500));

    expect(result.current).toBe('Inline');
  });

  it('never settles on a value the user has already typed past', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'W' },
    });

    rerender({ value: 'WA' });
    // Just short of the fastest permitted delay, so the first timer is still pending
    // whatever the constant is.
    act(() => vi.advanceTimersByTime(290));
    rerender({ value: 'WAT' });
    act(() => vi.advanceTimersByTime(60));

    // The first timer would have fired by now had it not been cleared.
    expect(result.current).toBe('W');

    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe('WAT');
  });
});
