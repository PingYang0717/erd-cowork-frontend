import React, { type ReactNode, useState } from 'react';
import { DownOutlined, RightOutlined } from '@ant-design/icons';

import styles from './CollapsiblePanel.module.css';

interface CollapsiblePanelProps {
  label: string;
  children: ReactNode;
  /** Lift the open/closed state when the owner needs it — a panel that fetches on first
   *  expand has to know it was expanded. Left alone, the panel keeps its own. */
  isExpanded?: boolean;
  onToggle?: () => void;
}

/** The shape every side channel of a turn uses: a labelled toggle over something the
 *  reader can ignore until they want it. */
const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  label,
  children,
  isExpanded: controlledExpanded,
  onToggle,
}) => {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? uncontrolledExpanded;

  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isExpanded}
        onClick={onToggle ?? (() => setUncontrolledExpanded((expanded) => !expanded))}
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
};

export default CollapsiblePanel;
