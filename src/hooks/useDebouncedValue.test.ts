import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('holds the value back until typing stops', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'I' },
    });

    rerender({ value: 'In' });
    rerender({ value: 'Inline' });
    expect(result.current).toBe('I');

    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

    expect(result.current).toBe('Inline');
  });

  it('never settles on a value the user has already typed past', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'W' },
    });

    rerender({ value: 'WA' });
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50));
    rerender({ value: 'WAT' });
    act(() => vi.advanceTimersByTime(60));

    // The first timer would have fired by now had it not been cleared.
    expect(result.current).toBe('W');

    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(result.current).toBe('WAT');
  });
});
