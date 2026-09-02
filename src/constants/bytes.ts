/** Byte-unit multipliers, so a limit reads as the size it is rather than as a chain of
 *  1024s the reader has to multiply out. Binary units, matching what `formatBytes`
 *  renders: 1 KB here is 1024 bytes, not 1000. */
export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = BYTES_PER_KB * 1024;
export const BYTES_PER_GB = BYTES_PER_MB * 1024;
