import { useEffect, useState } from 'react';

/** Search-as-you-type default. Long enough that a normal typist lands one filter pass
 *  per word rather than per keystroke, short enough not to feel laggy. */
export const SEARCH_DEBOUNCE_MS = 300;

/** The value, held back until it stops changing for `delayMs`.
 *
 *  Filtering runs on the returned value while the input stays on the raw one, so typing
 *  never feels delayed — only the work behind it is.
 */
export const useDebouncedValue = <T>(value: T, delayMs: number = SEARCH_DEBOUNCE_MS): T => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    // Every keystroke replaces the pending timer; without this the first one would still
    // fire and briefly filter on a value the user has already moved past.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
};
