import { DownOutlined, RightOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { useState } from 'react';

import styles from './CollapsiblePanel.module.css';

/** The shape every live-only side channel of a run uses: a labelled toggle over
 *  something that belongs to this connection, not to the conversation (ADR-0005). */
export function CollapsiblePanel({ label, children }: { label: string; children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        {isExpanded ? (
          <DownOutlined aria-hidden className={styles.chevron} />
        ) : (
          <RightOutlined aria-hidden className={styles.chevron} />
        )}
        {label}
      </button>
      {isExpanded && children}
    </div>
  );
}
