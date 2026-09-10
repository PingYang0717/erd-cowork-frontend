import React, { type ReactNode, useMemo, useState } from 'react';
import { Button, Input, Modal } from 'antd';
import {
  ApiOutlined,
  AppstoreOutlined,
  CheckCircleFilled,
  CheckOutlined,
  CloseCircleFilled,
  CloseOutlined,
  ContainerOutlined,
  DotChartOutlined,
  ExperimentOutlined,
  LockOutlined,
  PictureOutlined,
  PlusOutlined,
  RadarChartOutlined,
  SearchOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { readRememberedSelection } from '@/api/connectorApi';
import { useSetSessionDataSources } from '@/hooks/useConnectorMutations';
import { useConnectors } from '@/hooks/useConnectors';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTranslations } from '@/i18n/useTranslations';
import type { Translations } from '@/i18n/zhTW';
import type { Connector } from '@/types/api';

import styles from './ConnectorsPanel.module.css';

const CONNECTOR_ICONS: Record<string, ReactNode> = {
  inline: <DotChartOutlined aria-hidden />,
  wat: <ExperimentOutlined aria-hidden />,
  cp: <AppstoreOutlined aria-hidden />,
  lot: <ContainerOutlined aria-hidden />,
  lotabn: <WarningOutlined aria-hidden />,
  process: <ExperimentOutlined aria-hidden />,
  defect: <RadarChartOutlined aria-hidden />,
  tem: <PictureOutlined aria-hidden />,
  recipe: <ExperimentOutlined aria-hidden />,
  tool: <ToolOutlined aria-hidden />,
};

/** What this panel is EDITING: whether the connector can be chosen at all, and whether
 *  the draft has chosen it. Derived per render rather than stored, so there is no third
 *  copy of the answer to fall out of step.
 *
 *  Deliberately not called "connected". Whether the conversation is actually drawing on a
 *  source is a different fact — `SessionDetail.connectors`, drawn as its own mark on the
 *  row — and it only becomes true at Submit. The two used to share this name, so a new
 *  conversation opened on the remembered combination and announced itself connected to
 *  sources it had never been given. */
type RowState = 'selected' | 'available' | 'unavailable';

const rowState = (connector: Connector, draftIds: string[]): RowState => {
  if (!connector.enabled) {
    return 'unavailable';
  }
  return draftIds.includes(connector.id) ? 'selected' : 'available';
};

type StatusFilter = 'All' | 'Selected' | 'Not Selected';

/** Filter identity stays these English keys (tests and logic match on them); what the
 *  user reads is looked up per key at render time. */
const STATUS_FILTERS: StatusFilter[] = ['All', 'Selected', 'Not Selected'];

const matchesFilter = (state: RowState, filter: StatusFilter): boolean => {
  if (filter === 'All') return true;
  return filter === 'Selected' ? state === 'selected' : state !== 'selected';
};

/** Takes the copy rather than reaching for it, so the lookup stays a pure function
 *  of (state, dictionary). */
const statusMeta = (state: RowState, t: Translations['connectors']) => {
  switch (state) {
    case 'selected':
      return { label: t.statusSelected, color: 'var(--erd-color-primary, #1677ff)' };
    case 'unavailable':
      return { label: t.statusUnavailable, color: 'var(--erd-color-text-tertiary, #8c8c8c)' };
    default:
      return { label: t.statusNotSelected, color: 'var(--erd-color-text-tertiary, #8c8c8c)' };
  }
};

const toggleIcon = (state: RowState) => {
  switch (state) {
    case 'selected':
      return <CheckOutlined aria-hidden />;
    case 'unavailable':
      return <LockOutlined aria-hidden />;
    default:
      return <PlusOutlined aria-hidden />;
  }
};

interface ConnectorsPanelProps {
  /** Data sources attach per conversation, so the panel edits this session's set. */
  sessionId: string;
  open: boolean;
  onClose: () => void;
}

const ConnectorsPanel: React.FC<ConnectorsPanelProps> = ({ sessionId, open, onClose }) => {
  const t = useTranslations();
  const { catalogue, attachedIds } = useConnectors(sessionId);
  const setDataSources = useSetSessionDataSources(sessionId);

  // Above the state it seeds, against the top-block order: `draftIds` initialises from
  // it on mount, and a dependency is a hard constraint the grouping yields to (ADR-0010).
  /** What to open on: this conversation's own selection, or — only when it has none —
   *  the combination the user last worked with.
   *
   *  Intersected with the catalogue both ways. A remembered id the catalogue no longer
   *  serves cannot be shown, and submitting it would send the backend an id it does not
   *  know; a session id that has gone the same way is a source the user cannot see in the
   *  list, so counting it would claim they are using something invisible.
   *
   *  A default offered here and nowhere else. Nothing is attached to a session on the
   *  user's behalf: it reaches the backend when they press Submit, like every other
   *  choice on this panel. */
  const openingDraft = useMemo(() => {
    const known = new Set(catalogue.filter((connector) => connector.enabled).map((connector) => connector.id));
    const source = attachedIds.length > 0 ? attachedIds : readRememberedSelection();
    return source.filter((id) => known.has(id));
  }, [catalogue, attachedIds]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  // What the user has picked but not yet submitted. Choosing sources is one decision made
  // out of several clicks, so nothing is written until Submit: a request per checkbox
  // would leave a half-made choice on the server every time someone changed their mind
  // mid-way, and Cancel would have nothing to cancel.
  const [draftIds, setDraftIds] = useState<string[]>(openingDraft);

  // Below the state it feeds from, against the top-block rule: the debounce's input is
  // `search`, and a dependency is a hard constraint the grouping yields to. The list
  // filters on the settled value while the input stays on the raw one, so typing never
  // feels delayed — only the filtering behind it is.
  const normalizedSearch = useDebouncedValue(search).trim().toLowerCase();

  // Opening starts a fresh decision. Adjusting during render (React's documented pattern
  // for state derived from a prop change) rather than in an effect, so the first paint of
  // an opened panel already shows the right ticks instead of last time's for one frame.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraftIds(openingDraft);
    }
  }

  const toggle = (connector: Connector) => {
    if (!connector.enabled) {
      return;
    }
    setDraftIds((previous) =>
      previous.includes(connector.id) ? previous.filter((id) => id !== connector.id) : [...previous, connector.id]
    );
  };

  /** Writes the decision as one set, then closes.
   *
   *  The whole selection in a single request: it describes the outcome rather than a
   *  change, so two panels or a double-press cannot land in an order that decides it. */
  const submit = () => {
    setDataSources.mutate(draftIds, { onSuccess: onClose });
  };

  const chosen = catalogue.filter((connector) => rowState(connector, draftIds) === 'selected');
  const isDirty = chosen.length !== attachedIds.length || chosen.some((c) => !attachedIds.includes(c.id));
  const visibleConnectors = catalogue.filter(
    (connector) =>
      matchesFilter(rowState(connector, draftIds), statusFilter) &&
      (!normalizedSearch ||
        `${connector.name} ${connector.description} ${connector.type}`.toLowerCase().includes(normalizedSearch))
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t.connectors.title}
      width={720}
      // The other three dialogs already do this; this one is rendered unconditionally by
      // ChatComposer with `open` only hiding it, so without it the whole catalogue — the
      // list, the filters, the search — stays in the document for the rest of the
      // session and is re-rendered along with everything above it.
      destroyOnHidden
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh',
          overflow: 'hidden',
        },
      }}
      footer={
        <div className={styles.footer}>
          <span className={styles.footerCount}>{t.connectors.showing(visibleConnectors.length, catalogue.length)}</span>
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button type="primary" loading={setDataSources.isPending} disabled={!isDirty} onClick={submit}>
            {t.connectors.submit}
          </Button>
        </div>
      }
    >
      <p className={styles.subtitle}>{t.connectors.subtitle(chosen.length, catalogue.length)}</p>

      <div className={styles.selectedBox}>
        <div className={styles.selectedHeader}>
          <CheckCircleFilled aria-hidden className={styles.selectedHeaderIcon} />
          <span className={styles.selectedHeaderLabel}>{t.connectors.selectedSources}</span>
          <span className={styles.badge}>{chosen.length}</span>
          {chosen.length > 0 && (
            <button type="button" className={styles.clearAll} onClick={() => setDraftIds([])}>
              {t.connectors.clearAll}
            </button>
          )}
        </div>
        <div className={styles.selectedChips}>
          {chosen.length > 0 ? (
            chosen.map((connector) => (
              <span key={connector.id} className={styles.selectedChip}>
                <span className={styles.selectedChipIcon} aria-hidden="true">
                  {CONNECTOR_ICONS[connector.id] ?? <ApiOutlined aria-hidden />}
                </span>
                <span className={styles.selectedChipName}>{connector.name}</span>
                <button
                  type="button"
                  className={styles.selectedChipRemove}
                  aria-label={`Remove ${connector.name} from selected sources`}
                  onClick={() => toggle(connector)}
                >
                  <CloseOutlined aria-hidden />
                </button>
              </span>
            ))
          ) : (
            <span className={styles.selectedEmpty}>{t.connectors.noneSelected}</span>
          )}
        </div>
      </div>

      <div className={styles.searchRow}>
        <SearchOutlined aria-hidden className={styles.searchIcon} />
        <Input
          className={styles.searchInput}
          variant="borderless"
          aria-label="Search data sources"
          placeholder={t.connectors.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button type="button" className={styles.searchClear} aria-label="Clear search" onClick={() => setSearch('')}>
            <CloseCircleFilled aria-hidden />
          </button>
        )}
      </div>

      <div className={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={styles.filterChip}
            data-active={filter === statusFilter}
            onClick={() => setStatusFilter(filter)}
          >
            {filter === 'All'
              ? t.connectors.filterAll
              : filter === 'Selected'
                ? t.connectors.filterSelected
                : t.connectors.filterNotSelected}
            {filter !== 'All' && (
              <span className={styles.filterChipCount}>
                {catalogue.filter((c) => matchesFilter(rowState(c, draftIds), filter)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <ul className={styles.list}>
        {visibleConnectors.length ? (
          visibleConnectors.map((connector) => {
            const state = rowState(connector, draftIds);
            const meta = statusMeta(state, t.connectors);
            const isSelected = state === 'selected';
            // The other dimension, and the only one that is a fact about the conversation
            // rather than about this dialog: what it is drawing on right now. Unaffected
            // by the draft — a row can be attached and no longer picked, which is exactly
            // what "Submit will detach this" looks like.
            const isAttached = attachedIds.includes(connector.id);
            return (
              <li key={connector.id} className={styles.row} data-connected={isSelected} data-attached={isAttached}>
                <span className={styles.icon} data-connected={isSelected} aria-hidden="true">
                  {CONNECTOR_ICONS[connector.id] ?? <ApiOutlined aria-hidden />}
                </span>
                <span className={styles.info}>
                  <span className={styles.nameRow}>
                    <span className={styles.name}>{connector.name}</span>
                    <span className={styles.categoryTag}>{connector.type}</span>
                    {isAttached && <span className={styles.attachedTag}>{t.connectors.attached}</span>}
                  </span>
                  <span className={styles.description}>{connector.description}</span>
                  <span className={styles.status} data-status={state} style={{ color: meta.color }}>
                    <span className={styles.statusDot} style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                </span>
                <Button
                  className={styles.toggleButton}
                  data-state={state}
                  shape="circle"
                  size="small"
                  disabled={state === 'unavailable'}
                  aria-label={isSelected ? `Disconnect ${connector.name}` : `Connect ${connector.name}`}
                  icon={toggleIcon(state)}
                  onClick={() => toggle(connector)}
                />
              </li>
            );
          })
        ) : (
          <li className={styles.empty}>{t.connectors.noMatch(search)}</li>
        )}
      </ul>
    </Modal>
  );
};

export default ConnectorsPanel;
