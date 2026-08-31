import { ClockCircleOutlined } from '@ant-design/icons';
import React, { useEffect, useState } from 'react';

import { formatDuration } from '@/utils/formatDuration';

import styles from './Elapsed.module.css';

/** How long a run took, in the two forms a bubble needs: `Elapsed` for a finished run
 *  (a number it is handed) and `LiveElapsed` for one still going (its own second-by-
 *  second timer).
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
    <p className={styles.elapsed}>
      <ClockCircleOutlined aria-hidden className={styles.elapsedIcon} />
      {formatDuration(ms)}
    </p>
  );
};
