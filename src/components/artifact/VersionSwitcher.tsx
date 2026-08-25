import { CheckOutlined, DownOutlined, HistoryOutlined } from '@ant-design/icons';
import React, { useEffect, useRef, useState } from 'react';

import { Tooltip } from '@/components/common/Tooltip';
import type { ArtifactVersion } from '@/types/api/index';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import styles from './VersionSwitcher.module.css';

// The mockup's custom version menu (340 wide): a 版本 · 共 N 個 header row,
// primary-bg highlight + primary vN on the current version, per-row relative
// time and a green generated check. Shared by the Studio panel and the
// full-page view's toolbar.
interface VersionSwitcherProps {
  versions: ArtifactVersion[];
  activeVersion: ArtifactVersion | undefined;
  onSelect: (id: string) => void;
}

const VersionSwitcher: React.FC<VersionSwitcherProps> = ({ versions, activeVersion, onSelect }) => {
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
      <Tooltip content="切換版本">
        <button
          type="button"
          className={styles.versionTrigger}
          aria-label="切換版本"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
        >
          <HistoryOutlined aria-hidden />
          <span className={styles.versionTriggerN}>v{activeVersion?.n ?? 1}</span>
          <span className={styles.versionTriggerLabel}>{activeVersion?.label ?? ''}</span>
          <DownOutlined aria-hidden className={styles.versionTriggerChevron} />
        </button>
      </Tooltip>
      {isOpen && (
        <div role="menu" className={styles.versionMenu}>
          <div className={styles.versionMenuHeader}>
            版本 · 共 {versions.length} 個，可切換後再生成
          </div>
          {newestFirst.map((v) => {
            const isCurrent = v.id === activeVersion?.id;
            return (
              <button
                key={v.id}
                type="button"
                role="menuitem"
                aria-current={isCurrent ? 'true' : undefined}
                className={
                  isCurrent
                    ? `${styles.versionMenuItem} ${styles.versionMenuItemCurrent}`
                    : styles.versionMenuItem
                }
                onClick={() => {
                  onSelect(v.id);
                  setIsOpen(false);
                }}
              >
                <span className={styles.versionMenuItemN}>v{v.n}</span>
                <span className={styles.versionMenuItemLabel}>{v.label}</span>
                <span className={styles.versionMenuItemTime}>
                  {formatRelativeTime(v.createdAt)}
                </span>
                {v.generated && (
                  <CheckOutlined aria-label="已生成" className={styles.versionMenuItemCheck} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export { VersionSwitcher };
export default VersionSwitcher;
