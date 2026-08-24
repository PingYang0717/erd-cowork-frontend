import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { useState } from 'react';

import styles from './ThinkingPanel.module.css';

/** The agent's reasoning as it arrives. Collapsed by default and never persisted:
 *  it belongs to this connection, not to the conversation (ADR-0005). */
export function ThinkingPanel({ thinking }: { thinking: string }) {
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
        Thinking
      </button>
      {isExpanded && <p className={styles.body}>{thinking}</p>}
    </div>
  );
}
