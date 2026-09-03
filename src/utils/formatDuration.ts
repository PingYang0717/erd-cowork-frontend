/** Renders an elapsed run time the way the thread footer shows it: whole seconds once a
 *  run passes ten, one decimal below that, so a fast run does not collapse to "0s". */
export const formatDuration = (milliseconds: number): string => {
  const seconds = milliseconds / 1000;
  return seconds >= 10 ? `${Math.round(seconds)}s` : `${Math.round(seconds * 10) / 10}s`;
};
