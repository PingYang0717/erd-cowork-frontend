import React, { useState } from 'react';

import type { DirectoryEntry } from '@/types/api';
import { directoryEntrySelectedName, employeeAvatarUrl } from '@/utils/directoryEntry';

import styles from './EmployeeAvatar.module.css';

/** A person's photo, or their initial when there is none to fetch. Round, because that is
 *  how a person is drawn everywhere in the app and a square would read as a logo.
 *
 *  One component for every place a person is drawn — the share picker's recipients and
 *  the header's signed-in user — so the photo host and the fallback are decided once.
 *
 *  `onError` rather than a HEAD request: the photo host answers for most employees and
 *  not for some, and the only honest way to learn which is to ask for the image. */
interface EmployeeAvatarProps {
  entry: DirectoryEntry;
  /** Diameter in px. */
  size: number;
  /** How the initial is coloured when there is no photo: `soft` (tinted disc, primary
   *  text) beside a name in a list; `solid` (primary disc, white text) where the avatar
   *  stands alone, as the design draws the header's. */
  tone: 'soft' | 'solid';
}

const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({ entry, size, tone }) => {
  const src = employeeAvatarUrl(entry.emplId);
  const [failed, setFailed] = useState(false);
  const name = directoryEntrySelectedName(entry);

  const dimensions = { width: size, height: size };

  if (src === null || failed) {
    return (
      <span
        aria-hidden
        className={`${styles.avatar} ${styles.fallback} ${tone === 'solid' ? styles.solid : styles.soft}`}
        style={{ ...dimensions, fontSize: Math.round(size / 2) }}
      >
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      // Decorative: the name (or the button's own label) already says who this is, and a
      // screen reader reading the same person twice is noise.
      alt=""
      aria-hidden
      src={src}
      className={`${styles.avatar} ${styles.photo}`}
      style={dimensions}
      onError={() => setFailed(true)}
    />
  );
};

export default EmployeeAvatar;
