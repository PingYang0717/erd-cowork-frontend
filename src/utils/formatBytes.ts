import { BYTES_PER_KB } from '@/constants/bytes';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** `minimumFractionDigits` lets a caller drop the padding zero. A measured size keeps it
 *  (`2.0 GB` sits in a column with `2.4 GB`); a LIMIT reads better without it — `5 GB`,
 *  not `5.0 GB` — while a limit that is not whole still shows its decimal, because the
 *  maximum stays at one either way. */
export const formatBytes = (bytes: number, minimumFractionDigits = 1): string => {
  if (bytes < BYTES_PER_KB) {
    return `${bytes} B`;
  }
  let value = bytes;
  let unitIndex = 0;
  while (value >= BYTES_PER_KB && unitIndex < UNITS.length - 1) {
    value /= BYTES_PER_KB;
    unitIndex += 1;
  }
  // `toLocaleString` on the number, not on what `toFixed` returns: `toFixed` hands back a
  // string, and a string's `toLocaleString` is Object's — it gives the same string back,
  // so chaining the two formats nothing. Passing the digit options here instead keeps the
  // one decimal place and adds the reader's own grouping and decimal mark.
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits: 1,
  })} ${UNITS[unitIndex]}`;
};
