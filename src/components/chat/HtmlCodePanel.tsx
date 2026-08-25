import React, { useEffect, useRef } from 'react';

import { CollapsiblePanel } from './CollapsiblePanel';
import styles from './HtmlCodePanel.module.css';

interface HtmlCodePanelProps {
  code: string;
}

/** The artifact's HTML as the agent writes it. Live-only, and it scrolls itself so the
 *  newest line stays in view while the run is still producing. */
const HtmlCodePanel: React.FC<HtmlCodePanelProps> = ({ code }) => {
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const element = codeRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [code]);

  return (
    <CollapsiblePanel label="HTML">
      <pre ref={codeRef} className={styles.code}>
        {code}
      </pre>
    </CollapsiblePanel>
  );
};

export { HtmlCodePanel };
export default HtmlCodePanel;
