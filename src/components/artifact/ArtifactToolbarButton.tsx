import React, { type ReactNode } from 'react';

import Tooltip from '@/components/common/Tooltip';

import styles from './ArtifactToolbarButton.module.css';

interface ArtifactToolbarButtonProps {
  /** What the tooltip says — translated copy, so it comes from the caller's dictionary. */
  tooltip: string;
  /** The accessible name. Untranslated by convention (ADR-0012), and shared between the
   *  panel and the full-page view so the same control cannot end up named two ways —
   *  which is exactly what happened: one said "Reload artifact", the other "Refresh
   *  artifact", for the same button. */
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Only when a button needs to look different from its neighbours — the full-page
   *  view's Share is the one case. */
  className?: string;
}

/** One icon button in an Artifact toolbar. The panel and the full-page view show the
 *  same three actions in the same shape; this is that shape, held once. */
const ArtifactToolbarButton: React.FC<ArtifactToolbarButtonProps> = ({
  tooltip,
  label,
  icon,
  onClick,
  disabled = false,
  className,
}) => (
  <Tooltip content={tooltip}>
    <button
      type="button"
      className={className ?? styles.iconButton}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  </Tooltip>
);

/** The accessible names of the three actions both toolbars offer. Held here rather than
 *  typed at each site: the pair drifted once already. */
export const ARTIFACT_TOOLBAR_LABELS = {
  share: 'Share artifact',
  reload: 'Reload artifact',
  openInNewTab: 'Open artifact in new tab',
} as const;

export default ArtifactToolbarButton;
