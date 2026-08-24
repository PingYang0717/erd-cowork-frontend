import { CollapsiblePanel } from './CollapsiblePanel';
import styles from './ThinkingPanel.module.css';

/** The agent's reasoning as it arrives. Collapsed by default and never persisted:
 *  it belongs to this connection, not to the conversation (ADR-0005). */
export function ThinkingPanel({ thinking }: { thinking: string }) {
  return (
    <CollapsiblePanel label="Thinking">
      <p className={styles.body}>{thinking}</p>
    </CollapsiblePanel>
  );
}
