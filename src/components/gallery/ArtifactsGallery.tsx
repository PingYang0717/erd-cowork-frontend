import {
  CheckOutlined,
  ClockCircleOutlined,
  DownOutlined,
  PushpinOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useArtifacts } from '@/hooks/useArtifacts';
import { useTranslations } from '@/i18n/useTranslations';
import { usePublishCoachStore } from '@/stores/usePublishCoachStore';
import type { Artifact } from '@/types/api';
import { artifactRoute } from '@/utils/artifactUrl';

import ArtifactCard from './ArtifactCard';
import styles from './ArtifactsGallery.module.css';

type FilterCategory = 'all' | 'yours' | 'shared' | 'pinned';
type SortKey = 'pinned' | 'recent' | 'name';

const SORT_OPTIONS = [
  { key: 'pinned', labelKey: 'sortPinned', icon: <PushpinOutlined aria-hidden /> },
  { key: 'recent', labelKey: 'sortRecent', icon: <ClockCircleOutlined aria-hidden /> },
  { key: 'name', labelKey: 'sortName', icon: <SortAscendingOutlined aria-hidden /> },
] as const;

/** Which line the empty grid shows, by key rather than by copy — the copy itself lives
 *  in the dictionary so it can change language without this table knowing. */
const EMPTY_MESSAGE_KEYS: Record<
  FilterCategory,
  'emptyAll' | 'emptyYours' | 'emptyShared' | 'emptyPinned'
> = {
  all: 'emptyAll',
  yours: 'emptyYours',
  shared: 'emptyShared',
  pinned: 'emptyPinned',
};

// An Artifact shared to the user more than once arrives as repeated rows for
// the same id; one row per id is enough. Keyed by id — not name — so two
// genuinely different Artifacts that happen to share a name both survive.
// (Reintroduces, by id, what the earlier name-based dedupe got wrong.)
const dedupeById = (artifacts: Artifact[]) => {
  const seen = new Set<string>();
  return artifacts.filter((artifact) => {
    if (seen.has(artifact.id)) {
      return false;
    }
    seen.add(artifact.id);
    return true;
  });
};

const filterArtifacts = (artifacts: Artifact[], category: FilterCategory) => {
  switch (category) {
    case 'yours':
      return artifacts.filter((artifact) => artifact.isOwn);
    // Shared *to me* is the complement of ownership. `isShared` is the other
    // direction — whether this Artifact has been shared out — and reading it here
    // would list your own shared Artifacts as if someone had sent them to you.
    case 'shared':
      return dedupeById(artifacts.filter((artifact) => !artifact.isOwn));
    case 'pinned':
      return artifacts.filter((artifact) => artifact.pinnedAt !== null);
    default:
      return artifacts;
  }
};

const sortArtifacts = (artifacts: Artifact[], sort: SortKey) => {
  const sorted = [...artifacts];
  if (sort === 'name') {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === 'recent') {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else {
    // Pinned first, most recently pinned leading — `pinnedAt` carries the moment, so
    // the group has a real order rather than whatever the list arrived in.
    sorted.sort((a, b) => (b.pinnedAt ?? '').localeCompare(a.pinnedAt ?? ''));
  }
  return sorted;
};

const ArtifactsGallery: React.FC = () => {
  const t = useTranslations();
  // The coach highlight on the rail is asking the user to come here; arriving is what it
  // was asking for, so this is where it ends — whichever way they got here, the toast's
  // shortcut or the rail entry itself.
  const dismissCoach = usePublishCoachStore((store) => store.dismiss);
  useEffect(dismissCoach, [dismissCoach]);

  const { data } = useArtifacts();
  const navigate = useNavigate();
  const [category, setCategory] = useState<FilterCategory>('all');
  const [sort, setSort] = useState<SortKey>('pinned');

  // The Gallery is a shelf of published work, not an index of everything ever made.
  // An unpublished Artifact lives in its session's thread; publishing is the deliberate
  // act that puts it here, and deleting is what takes it back out.
  const artifacts = useMemo(() => data.filter((artifact) => artifact.publishedAt !== null), [data]);

  // Four passes over the list plus a dedupe and a sort — recomputed on every keystroke
  // elsewhere in the tree otherwise.
  const counts = useMemo(
    () => ({
      yours: artifacts.filter((artifact) => artifact.isOwn).length,
      shared: dedupeById(artifacts.filter((artifact) => !artifact.isOwn)).length,
      pinned: artifacts.filter((artifact) => artifact.pinnedAt !== null).length,
    }),
    [artifacts],
  );
  const visible = useMemo(
    () => sortArtifacts(filterArtifacts(artifacts, category), sort),
    [artifacts, category, sort],
  );
  const activeSortOption = SORT_OPTIONS.find((option) => option.key === sort) ?? SORT_OPTIONS[0];

  const sortMenuItems = SORT_OPTIONS.map((option) => ({
    key: option.key,
    // The mockup highlights the selected row (primary-bg, primary icon), not
    // just the checkmark.
    className: option.key === sort ? styles.sortMenuItemSelected : undefined,
    label: (
      <span className={styles.sortMenuItem}>
        {option.icon}
        <span className={styles.sortMenuItemLabel}>{t.gallery[option.labelKey]}</span>
        {option.key === sort && <CheckOutlined aria-hidden />}
      </span>
    ),
  }));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t.galleryHeader.title}</h1>
          <p className={styles.subtitle}>{t.galleryHeader.subtitle}</p>
        </div>
        <Dropdown
          trigger={['click']}
          menu={{ items: sortMenuItems, onClick: ({ key }) => setSort(key as SortKey) }}
        >
          <button type="button" className={styles.sortTrigger}>
            <SortAscendingOutlined aria-hidden />
            <span>{t.gallery.sortLabel}</span>
            <span className={styles.sortTriggerValue}>{t.gallery[activeSortOption.labelKey]}</span>
            <DownOutlined aria-hidden className={styles.sortTriggerChevron} />
          </button>
        </Dropdown>
      </div>

      <div className={styles.filters}>
        <FilterPill
          label={t.galleryHeader.filterAll}
          count={artifacts.length}
          active={category === 'all'}
          onClick={() => setCategory('all')}
        />
        <FilterPill
          label={t.galleryHeader.filterYours}
          count={counts.yours}
          active={category === 'yours'}
          onClick={() => setCategory('yours')}
        />
        <FilterPill
          label={t.galleryHeader.filterShared}
          count={counts.shared}
          active={category === 'shared'}
          onClick={() => setCategory('shared')}
        />
        {counts.pinned > 0 && (
          <FilterPill
            label={t.galleryHeader.filterPinned}
            count={counts.pinned}
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
              onOpen={(a) => navigate(artifactRoute(a.id), { state: { from: 'gallery' } })}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>{t.gallery[EMPTY_MESSAGE_KEYS[category]]}</div>
      )}
    </div>
  );
};

interface FilterPillProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

const FilterPill: React.FC<FilterPillProps> = ({ label, count, active, onClick }) => {
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
};

export default ArtifactsGallery;
