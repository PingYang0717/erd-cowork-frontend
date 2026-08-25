import {
  CheckOutlined,
  ClockCircleOutlined,
  DownOutlined,
  PushpinOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useArtifacts } from '@/hooks/useArtifacts';
import type { Artifact } from '@/types/api/index';

import { ArtifactCard } from './ArtifactCard';
import styles from './ArtifactsGallery.module.css';

type FilterCategory = 'all' | 'yours' | 'shared' | 'pinned';
type SortKey = 'pinned' | 'recent' | 'name';

const SORT_OPTIONS = [
  { key: 'pinned', label: '釘選優先', icon: <PushpinOutlined aria-hidden /> },
  { key: 'recent', label: '最近建立', icon: <ClockCircleOutlined aria-hidden /> },
  { key: 'name', label: '名稱 A→Z', icon: <SortAscendingOutlined aria-hidden /> },
];

const EMPTY_MESSAGES: Record<FilterCategory, string> = {
  all: '目前還沒有 Artifact。',
  yours: '你還沒有生成任何 Artifact。',
  shared: '目前沒有分享給你的 Artifact。',
  pinned: '你還沒有釘選任何 Artifact。',
};

// An Artifact shared to the user more than once arrives as repeated rows for
// the same id; one row per id is enough. Keyed by id — not name — so two
// genuinely different Artifacts that happen to share a name both survive.
// (Reintroduces, by id, what the earlier name-based dedupe got wrong.)
function dedupeById(artifacts: Artifact[]) {
  const seen = new Set<string>();
  return artifacts.filter((artifact) => {
    if (seen.has(artifact.id)) {
      return false;
    }
    seen.add(artifact.id);
    return true;
  });
}

function filterArtifacts(artifacts: Artifact[], category: FilterCategory) {
  switch (category) {
    case 'yours':
      return artifacts.filter((artifact) => artifact.mine);
    case 'shared':
      return dedupeById(artifacts.filter((artifact) => !!artifact.sharedBy));
    case 'pinned':
      return artifacts.filter((artifact) => artifact.pinned);
    default:
      return artifacts;
  }
}

function sortArtifacts(artifacts: Artifact[], sort: SortKey) {
  const sorted = [...artifacts];
  if (sort === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'recent') {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else {
    sorted.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }
  return sorted;
}

const ArtifactsGallery: React.FC = () => {
  const { data } = useArtifacts();
  const navigate = useNavigate();
  const [category, setCategory] = useState<FilterCategory>('all');
  const [sort, setSort] = useState<SortKey>('pinned');

  const artifacts = data ?? [];
  const yoursCount = artifacts.filter((artifact) => artifact.mine).length;
  const sharedCount = dedupeById(artifacts.filter((artifact) => !!artifact.sharedBy)).length;
  const pinnedCount = artifacts.filter((artifact) => artifact.pinned).length;

  const visible = sortArtifacts(filterArtifacts(artifacts, category), sort);
  const activeSortOption = SORT_OPTIONS.find((option) => option.key === sort) ?? SORT_OPTIONS[0];

  const sortMenuItems = SORT_OPTIONS.map((option) => ({
    key: option.key,
    // The mockup highlights the selected row (primary-bg, primary icon), not
    // just the checkmark.
    className: option.key === sort ? styles.sortMenuItemSelected : undefined,
    label: (
      <span className={styles.sortMenuItem}>
        {option.icon}
        <span className={styles.sortMenuItemLabel}>{option.label}</span>
        {option.key === sort && <CheckOutlined aria-hidden />}
      </span>
    ),
  }));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Artifacts</h1>
          <p className={styles.subtitle}>
            Every dashboard and deck eRD Cowork has generated — click to open it.
          </p>
        </div>
        <Dropdown
          trigger={['click']}
          menu={{ items: sortMenuItems, onClick: ({ key }) => setSort(key as SortKey) }}
        >
          <button type="button" className={styles.sortTrigger}>
            <SortAscendingOutlined aria-hidden />
            <span>排序:</span>
            <span className={styles.sortTriggerValue}>{activeSortOption.label}</span>
            <DownOutlined aria-hidden className={styles.sortTriggerChevron} />
          </button>
        </Dropdown>
      </div>

      <div className={styles.filters}>
        <FilterPill
          label="All"
          count={artifacts.length}
          active={category === 'all'}
          onClick={() => setCategory('all')}
        />
        <FilterPill
          label="Yours"
          count={yoursCount}
          active={category === 'yours'}
          onClick={() => setCategory('yours')}
        />
        <FilterPill
          label="Shared to me"
          count={sharedCount}
          active={category === 'shared'}
          onClick={() => setCategory('shared')}
        />
        {pinnedCount > 0 && (
          <FilterPill
            label="Pinned"
            count={pinnedCount}
            active={category === 'pinned'}
            onClick={() => setCategory('pinned')}
          />
        )}
      </div>

      {visible.length > 0 ? (
        <div className={styles.grid} role="list" aria-label="Artifacts">
          {visible.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              onOpen={(a) => navigate(`/cowork/artifact/${a.id}`, { state: { from: 'gallery' } })}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>{EMPTY_MESSAGES[category]}</div>
      )}
    </div>
  );
};

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? `${styles.pill} ${styles.pillActive}` : styles.pill}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
      <span className={styles.pillCount}>{count}</span>
    </button>
  );
}

export { ArtifactsGallery };
export default ArtifactsGallery;
