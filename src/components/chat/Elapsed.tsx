import React, { useEffect, useState } from 'react';
import { ClockCircleOutlined } from '@ant-design/icons';

import { formatDuration } from '@/utils/formatDuration';

import styles from './Elapsed.module.css';

/** How long a run took, in the two forms a bubble needs: `Elapsed` for a finished run
 *  (a number it is handed) and `LiveElapsed` for one still going (its own second-by-
 *  second timer).
 *
 *  One drawing for both, so the reading does not jump when the run ends: the live timer
 *  and the settled duration sit in the same slot of the same row under the bubble, and
 *  the only thing that changes at the hand-over is that the number stops. They used to
 *  be two — the live one inside the bubble, the settled one in the meta row beneath it —
 *  and the clock moved down and left the moment a reply finished.
 *
 *  Its own file because the ticking one owns an interval — a piece of lifecycle that has
 *  nothing to do with drawing a message, and is easier to reason about apart from it.
 */
interface LiveElapsedProps {
  startedAt: number;
}

export const LiveElapsed: React.FC<LiveElapsedProps> = ({ startedAt }) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(intervalId);
  }, [startedAt]);

  return <Elapsed ms={elapsedMs} />;
};

interface ElapsedProps {
  ms: number;
}

export const Elapsed: React.FC<ElapsedProps> = ({ ms }) => {
  return (
    <span className={styles.elapsed}>
      <ClockCircleOutlined aria-hidden className={styles.elapsedIcon} />
      {formatDuration(ms)}
    </span>
  );
};
