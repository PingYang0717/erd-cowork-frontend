import { CheckOutlined, DownOutlined, HistoryOutlined } from '@ant-design/icons';
import React, { useEffect, useRef, useState } from 'react';

import Tooltip from '@/components/common/Tooltip';
import { useTranslations } from '@/i18n/useTranslations';
import type { ArtifactVersion } from '@/types/api';
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
}

const VersionSwitcher: React.FC<VersionSwitcherProps> = ({ versions, activeVersion, onSelect }) => {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const newestFirst = [...versions].reverse();

  return (
    <div ref={rootRef} className={styles.versionSwitcher}>
      <Tooltip content={t.artifact.switchVersion}>
        <button
          type="button"
          className={styles.versionTrigger}
          aria-label="切換 Artifact"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
        >
          <HistoryOutlined aria-hidden />
          {activeVersion?.version !== undefined && (
            <span className={styles.versionTriggerN}>v{activeVersion.version}</span>
          )}
          <span className={styles.versionTriggerLabel}>{activeVersion?.title ?? ''}</span>
          <DownOutlined aria-hidden className={styles.versionTriggerChevron} />
        </button>
      </Tooltip>
      {isOpen && (
        <div role="menu" className={styles.versionMenu}>
          <div className={styles.versionMenuHeader}>
            {t.artifact.versionMenuTitle(versions.length)}
          </div>
          {newestFirst.map((v) => {
            const isCurrent = v.artifactId === activeVersion?.artifactId;
            return (
              <button
                key={v.artifactId}
                type="button"
                role="menuitem"
                aria-current={isCurrent ? 'true' : undefined}
                className={
                  isCurrent
                    ? `${styles.versionMenuItem} ${styles.versionMenuItemCurrent}`
                    : styles.versionMenuItem
                }
                onClick={() => {
                  onSelect(v.artifactId);
                  setIsOpen(false);
                }}
              >
                {v.version !== undefined && (
                  <span className={styles.versionMenuItemN}>v{v.version}</span>
                )}
                <span className={styles.versionMenuItemLabel}>{v.title}</span>
                <span className={styles.versionMenuItemTime}>
                  {v.createdAt ? formatRelativeTime(v.createdAt) : ''}
                </span>
                {v.publishedAt != null && (
                  <CheckOutlined aria-label="已發布" className={styles.versionMenuItemCheck} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VersionSwitcher;
