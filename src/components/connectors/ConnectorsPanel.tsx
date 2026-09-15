import React, { type ReactNode, useMemo, useState } from 'react';
import { Button, Input, Modal } from 'antd';
import {
  ApiOutlined,
  CheckCircleFilled,
  CheckOutlined,
  CloseCircleFilled,
  CloseOutlined,
  ContainerOutlined,
  DotChartOutlined,
  ExperimentOutlined,
  LineChartOutlined,
  LockOutlined,
  PictureOutlined,
  PlusOutlined,
  RadarChartOutlined,
  SearchOutlined,
  ToolOutlined,
} from '@ant-design/icons';

import { readRememberedSelection } from '@/api/connectorApi';
import { useSetSessionDataSources } from '@/hooks/useConnectorMutations';
import { useConnectors } from '@/hooks/useConnectors';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTranslations } from '@/i18n/useTranslations';
import type { Translations } from '@/i18n/zhTW';
import type { Connector } from '@/types/api';

import styles from './ConnectorsPanel.module.css';

/** One icon per `type` — the classification the backend serves beside the name. Keyed
 *  by type rather than by id: an id is a Mongo UUID (interface.md), so a table of ids
 *  could only ever match the mock catalogue, and every real row fell through to the
 *  fallback. */
const CONNECTOR_ICONS: Record<string, ReactNode> = {
  Process: <DotChartOutlined aria-hidden />,
  Test: <ExperimentOutlined aria-hidden />,
  Lot: <ContainerOutlined aria-hidden />,
  Defect: <RadarChartOutlined aria-hidden />,
  Physical: <PictureOutlined aria-hidden />,
  Equipment: <ToolOutlined aria-hidden />,
  CRCP: <LineChartOutlined aria-hidden />,
};

const connectorIcon = (connector: Connector): ReactNode =>
  CONNECTOR_ICONS[connector.type] ?? <ApiOutlined aria-hidden />;

/** What this panel is EDITING: whether the connector can be chosen at all, and whether
 *  the draft has chosen it. Derived per render rather than stored, so there is no third
 *  copy of the answer to fall out of step.
 *
 *  Deliberately not called "connected". Whether the conversation is actually drawing on a
 *  source is a different fact — `SessionDetail.connectors`, drawn as its own mark on the
 *  row — and it only becomes true at Submit. The two used to share this name, so a new
 *  conversation opened on the remembered combination and announced itself connected to
 *  sources it had never been given. */
type RowState = 'selected' | 'available' | 'unavailable' | 'selectedUnavailable';

/** The fourth state is a source the draft holds that can no longer be chosen: attached
 *  to this conversation, then disabled behind it. It stays in the draft — an untouched
 *  Submit sends it back as it was — and the reader may let go of it, but not take it on
 *  again once it has been dropped. */
const rowState = (connector: Connector, draftIds: string[]): RowState => {
  const picked = draftIds.includes(connector.id);
  if (!connector.enabled) {
    return picked ? 'selectedUnavailable' : 'unavailable';
  }
  return picked ? 'selected' : 'available';
};

const isChosen = (state: RowState): boolean => state === 'selected' || state === 'selectedUnavailable';

type StatusFilter = 'All' | 'Selected' | 'Not Selected';

/** Filter identity stays these English keys (tests and logic match on them); what the
 *  user reads is looked up per key at render time. */
const STATUS_FILTERS: StatusFilter[] = ['All', 'Selected', 'Not Selected'];

const matchesFilter = (state: RowState, filter: StatusFilter): boolean => {
  if (filter === 'All') return true;
  return filter === 'Selected' ? isChosen(state) : !isChosen(state);
};

interface RowMeta {
  /** Takes the copy rather than reaching for it, so the lookup stays a pure function
   *  of (state, dictionary). */
  label: (t: Translations['connectors']) => string;
  color: string;
  /** What the toggle shows: the action it offers, or the lock when it offers none. */
  icon: ReactNode;
}

const PRIMARY = 'var(--erd-color-primary, #1677ff)';
const TERTIARY = 'var(--erd-color-text-tertiary, #8c8c8c)';

/** Everything the row draws for a state, in one place — the label and the icon used to
 *  be two switches on the same value, and a state added to one was missed by the other. */
const ROW_META: Record<RowState, RowMeta> = {
  selected: { label: (t) => t.statusSelected, color: PRIMARY, icon: <CheckOutlined aria-hidden /> },
  selectedUnavailable: {
    label: (t) => t.statusSelectedUnavailable,
    color: TERTIARY,
    icon: <CheckOutlined aria-hidden />,
  },
  available: { label: (t) => t.statusNotSelected, color: TERTIARY, icon: <PlusOutlined aria-hidden /> },
  unavailable: { label: (t) => t.statusUnavailable, color: TERTIARY, icon: <LockOutlined aria-hidden /> },
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
   *  The conversation's own ids are kept whether or not they can still be chosen. A source
   *  it already draws on that has since been disabled is still a fact about the session,
   *  and dropping it from the draft made an untouched Submit detach it without a word.
   *  The remembered combination is only a default, so it is not offered on anything that
   *  cannot be chosen.
   *
   *  A default offered here and nowhere else. Nothing is attached to a session on the
   *  user's behalf: it reaches the backend when they press Submit, like every other
   *  choice on this panel. */
  const openingDraft = useMemo(() => {
    const served = new Set(catalogue.map((connector) => connector.id));
    if (attachedIds.length > 0) {
      return attachedIds.filter((id) => served.has(id));
    }
    const choosable = new Set(catalogue.filter((connector) => connector.enabled).map((connector) => connector.id));
    return readRememberedSelection().filter((id) => choosable.has(id));
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
    setDraftIds((previous) => {
      if (previous.includes(connector.id)) {
        return previous.filter((id) => id !== connector.id);
      }
      // Letting go of a source is always allowed; taking one on is not, once it cannot
      // be chosen.
      return connector.enabled ? [...previous, connector.id] : previous;
    });
  };

  /** Writes the decision as one set, then closes.
   *
   *  The whole selection in a single request: it describes the outcome rather than a
   *  change, so two panels or a double-press cannot land in an order that decides it. */
  const submit = () => {
    setDataSources.mutate(draftIds, { onSuccess: onClose });
  };

  const chosen = catalogue.filter((connector) => isChosen(rowState(connector, draftIds)));
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
                  {connectorIcon(connector)}
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
            const meta = ROW_META[state];
            const isSelected = isChosen(state);
            // The other dimension, and the only one that is a fact about the conversation
            // rather than about this dialog: what it is drawing on right now. Unaffected
            // by the draft — a row can be attached and no longer picked, which is exactly
            // what "Submit will detach this" looks like.
            const isAttached = attachedIds.includes(connector.id);
            return (
              <li key={connector.id} className={styles.row} data-connected={isSelected} data-attached={isAttached}>
                <span className={styles.icon} data-connected={isSelected} aria-hidden="true">
                  {connectorIcon(connector)}
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
                    {meta.label(t.connectors)}
                  </span>
                </span>
                <Button
                  className={styles.toggleButton}
                  data-state={state}
                  shape="circle"
                  size="small"
                  disabled={state === 'unavailable'}
                  aria-label={isSelected ? `Disconnect ${connector.name}` : `Connect ${connector.name}`}
                  icon={meta.icon}
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
