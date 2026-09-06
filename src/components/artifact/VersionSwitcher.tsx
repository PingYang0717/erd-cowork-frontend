import React, { useEffect, useRef, useState } from 'react';
import { CheckOutlined, DownOutlined, HistoryOutlined } from '@ant-design/icons';

import Tooltip from '@/components/common/Tooltip';
import { useTranslations } from '@/i18n/useTranslations';
import type { ArtifactVersion } from '@/types/api';
import { artifactVersionLabel } from '@/utils/artifactVersionLabel';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import styles from './VersionSwitcher.module.css';

// The mockup's custom version menu (340 wide): a 版本 · 共 N 個 header row,
// primary-bg highlight + primary vN on the current version, per-row relative
// time and a green check on published versions. Shared by the Studio panel and the
// full-page view's toolbar.
interface VersionSwitcherProps {
  versions: ArtifactVersion[];
  activeVersion: ArtifactVersion | undefined;
  onSelect: (id: string) => void;
  /** What the menu is a list of. The Studio panel lists a session's outputs and counts
   *  them; the full-page view lists one Artifact's own versions, where that count belongs
   *  to something else entirely. */
  heading: string;
  /** Whether to mark each row with its `vN`. That number says how many outputs into the
   *  session this one is — true of a session's list, and answering a question the
   *  full-page menu is not asking (artifact-model-decisions Q2). */
  showOrdinal: boolean;
}

const VersionSwitcher: React.FC<VersionSwitcherProps> = ({
  versions,
  activeVersion,
  onSelect,
  heading,
  showOrdinal,
}) => {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /** Closing by keyboard must put the reader back where they were: in a three-pane
   *  layout, focus dropped to <body> is a position lost entirely (ADR-0014 §menu-keyboard). */
  const closeAndRefocus = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen]);

  // Opening a menu moves focus into it — onto the current version, so arrow keys
  // start from where the user actually is rather than from the top.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const currentIndex = itemRefs.current.findIndex((item) => item?.getAttribute('aria-current') === 'true');
    (itemRefs.current[currentIndex === -1 ? 0 : currentIndex] ?? itemRefs.current[0])?.focus();
  }, [isOpen]);

  /** The menu-button keyboard contract: arrows move (wrapping), Home/End jump,
   *  Escape closes and restores focus, Tab closes and lets focus move on. */
  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    const activeIndex = items.findIndex((item) => item === document.activeElement);
    const focusAt = (index: number) => items[(index + items.length) % items.length]?.focus();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusAt(activeIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(activeIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        closeAndRefocus();
        break;
      case 'Tab':
        // Standard menu behaviour: Tab dismisses and focus moves on naturally.
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const newestFirst = [...versions].reverse();

  return (
    <div ref={rootRef} className={styles.versionSwitcher}>
      <Tooltip content={t.artifact.switchVersion}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.versionTrigger}
          aria-label="Switch Artifact"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
        >
          <HistoryOutlined aria-hidden />
          {showOrdinal && artifactVersionLabel(activeVersion?.version) !== null && (
            <span className={styles.versionTriggerN}>{artifactVersionLabel(activeVersion?.version)}</span>
          )}
          <span className={styles.versionTriggerLabel}>{activeVersion?.title ?? ''}</span>
          <DownOutlined aria-hidden className={styles.versionTriggerChevron} />
        </button>
      </Tooltip>
      {isOpen && (
        // The header sits inside the popup but OUTSIDE the element carrying
        // role="menu": a menu's children may only be items, and the title div was
        // an illegal child that some readers skip the whole menu over (ADR-0014 §menu-keyboard).
        <div className={styles.versionMenu}>
          <div className={styles.versionMenuHeader}>{heading}</div>
          {/* The keydown handler implements the menu keyboard contract; focus lives
              on the menuitem buttons inside, never on this wrapper. */}
          <div role="menu" aria-label="Switch Artifact" onKeyDown={handleMenuKeyDown}>
            {newestFirst.map((v, index) => {
              const isCurrent = v.artifactId === activeVersion?.artifactId;
              return (
                <button
                  key={v.artifactId}
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  type="button"
                  role="menuitem"
                  aria-current={isCurrent ? 'true' : undefined}
                  className={
                    isCurrent ? `${styles.versionMenuItem} ${styles.versionMenuItemCurrent}` : styles.versionMenuItem
                  }
                  onClick={() => {
                    onSelect(v.artifactId);
                    closeAndRefocus();
                  }}
                >
                  {showOrdinal && artifactVersionLabel(v.version) !== null && (
                    <span className={styles.versionMenuItemN}>{artifactVersionLabel(v.version)}</span>
                  )}
                  <span className={styles.versionMenuItemLabel}>{v.title}</span>
                  {/* Before the time, not after it. The label takes the slack, so
                      whatever is last sits at the right edge — with the tick there, the
                      times of published and unpublished rows ended up at different
                      places and would not read as a column. */}
                  {v.publishedAt != null && (
                    <CheckOutlined aria-label="Published" className={styles.versionMenuItemCheck} />
                  )}
                  <span className={styles.versionMenuItemTime}>
                    {v.createdAt ? formatRelativeTime(v.createdAt) : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionSwitcher;
