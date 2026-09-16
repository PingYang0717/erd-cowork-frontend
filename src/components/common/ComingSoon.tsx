import React, { type ReactNode } from 'react';

import styles from './ComingSoon.module.css';

interface ComingSoonProps {
  /** What the feature is called — the small line above the heading. */
  label: string;
  /** The feature's own icon, sitting in the tile. */
  icon: ReactNode;
  title: string;
  detail: string;
}

/** A page for a feature that has a place in the rail before it has anything to show.
 *  Says what it will be and that it is not here yet, and does nothing else: no
 *  controls, nothing to try. The tile breathes and sends out a ring now and then so the
 *  page reads as something on its way rather than something broken. */
const ComingSoon: React.FC<ComingSoonProps> = ({ label, icon, title, detail }) => (
  <div className={styles.wrap}>
    <div className={styles.card}>
      <span className={styles.tile} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.label}>{label}</span>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.detail}>{detail}</p>
    </div>
  </div>
);

export default ComingSoon;
