import React from 'react';

import { CollapsiblePanel } from './CollapsiblePanel';
import styles from './ThinkingPanel.module.css';

interface ThinkingPanelProps {
  thinking: string;
}

/** The agent's reasoning as it arrives. Collapsed by default and never persisted:
 *  it belongs to this connection, not to the conversation (ADR-0003). */
const ThinkingPanel: React.FC<ThinkingPanelProps> = ({ thinking }) => {
  return (
    <CollapsiblePanel label="Thinking">
      <p className={styles.body}>{thinking}</p>
    </CollapsiblePanel>
  );
};

export { ThinkingPanel };
export default ThinkingPanel;
