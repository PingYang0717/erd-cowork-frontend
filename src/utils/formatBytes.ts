import { BYTES_PER_KB } from '@/constants/bytes';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number): string {
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
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} ${UNITS[unitIndex]}`;
}
