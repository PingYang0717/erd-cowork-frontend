import React from 'react';

import { BACKEND_UNSUPPORTED } from '@/constants/messages';

import styles from './UnsupportedLabel.module.css';

/**
 * A menu item's label plus the reason it is disabled. A disabled menu item swallows
 * pointer events, so the `Tooltip` used elsewhere never fires inside one — the reason
 * has to be on screen rather than a hover away.
 */
const UnsupportedLabel: React.FC<{ label: string }> = ({ label }) => (
  <span className={styles.wrapper}>
    {label}
    <span className={styles.hint}>{BACKEND_UNSUPPORTED}</span>
  </span>
);

export { UnsupportedLabel };
export default UnsupportedLabel;
