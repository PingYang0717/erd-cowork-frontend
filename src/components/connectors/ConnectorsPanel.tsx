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
  LoadingOutlined,
  LockOutlined,
  PictureOutlined,
  PlusOutlined,
  RadarChartOutlined,
  ReloadOutlined,
  SearchOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Button, Input, Modal } from 'antd';
import React, { type ReactNode, useMemo, useState } from 'react';

import { useAddConnector, useSetSessionDataSource } from '@/hooks/useConnectorMutations';
import { useConnectors } from '@/hooks/useConnectors';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Connector, ConnectorStatus } from '@/types/api';
import { selectConnected } from '@/utils/connectorSelectors';

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

type StatusFilter = 'All' | 'Connected' | 'Not Connected';

const STATUS_FILTERS: StatusFilter[] = ['All', 'Connected', 'Not Connected'];

function matchesFilter(connector: Connector, filter: StatusFilter): boolean {
  if (filter === 'All') return true;
  return filter === 'Connected'
    ? connector.status === 'connected'
    : connector.status !== 'connected';
}

function statusMeta(status: ConnectorStatus, isPending: boolean) {
  if (isPending) {
    return { label: 'Connecting…', color: 'var(--erd-color-primary, #1677ff)' };
  }
  switch (status) {
    case 'connected':
      return { label: 'Connected', color: 'var(--erd-color-primary, #1677ff)' };
    case 'expired':
      return { label: 'Token expired', color: 'var(--erd-color-warning, #faad14)' };
    case 'no_access':
      return { label: 'No access', color: 'var(--erd-color-text-tertiary, #8c8c8c)' };
    default:
      return { label: 'Not connected', color: 'var(--erd-color-text-tertiary, #8c8c8c)' };
  }
}

function toggleIcon(status: ConnectorStatus, isPending: boolean) {
  if (isPending) {
    return <LoadingOutlined aria-hidden />;
  }
  switch (status) {
    case 'connected':
      return <CheckOutlined aria-hidden />;
    case 'no_access':
      return <LockOutlined aria-hidden />;
    case 'expired':
      return <ReloadOutlined aria-hidden />;
    default:
      return <PlusOutlined aria-hidden />;
  }
}

interface ConnectorsPanelProps {
  /** Data sources attach per conversation, so the panel edits this session's set. */
  sessionId: string;
  open: boolean;
  onClose: () => void;
}

const ConnectorsPanel: React.FC<ConnectorsPanelProps> = ({ sessionId, open, onClose }) => {
  const sessionConnectors = useConnectors(sessionId);
  const setDataSource = useSetSessionDataSource(sessionId);
  const addConnector = useAddConnector();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [addValue, setAddValue] = useState('');

  const attachedIds = useMemo(
    () => selectConnected(sessionConnectors).map((connector) => connector.id),
    [sessionConnectors],
  );

  // What the user has picked but not yet submitted. Choosing sources is one decision made
  // out of several clicks, so nothing is written until Submit: a request per checkbox
  // would leave a half-made choice on the server every time someone changed their mind
  // mid-way, and Cancel would have nothing to cancel.
  const [draftIds, setDraftIds] = useState<string[]>(attachedIds);
  // Opening starts a fresh decision from whatever the session currently has. Adjusting
  // during render (React's documented pattern for state derived from a prop change)
  // rather than in an effect, so the first paint of an opened panel already shows the
  // right ticks instead of last time's for one frame.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraftIds(attachedIds);
    }
  }

  // The list reads its `connected` from the draft, so the panel shows the decision being
  // made rather than the one already stored. `expired` and `no_access` are the
  // catalogue's word and outrank any of it.
  const connectors = useMemo<Connector[]>(
    () =>
      sessionConnectors.map((connector) =>
        connector.status === 'expired' || connector.status === 'no_access'
          ? connector
          : { ...connector, status: draftIds.includes(connector.id) ? 'connected' : 'available' },
      ),
    [sessionConnectors, draftIds],
  );

  const connectedConnectors = selectConnected(connectors);
  const connectedCount = connectedConnectors.length;
  const isDirty =
    connectedConnectors.length !== attachedIds.length ||
    connectedConnectors.some((connector) => !attachedIds.includes(connector.id));

  // The list filters on the settled value while the input stays on the raw one, so
  // typing never feels delayed — only the filtering behind it is.
  const normalizedSearch = useDebouncedValue(search).trim().toLowerCase();
  const visibleConnectors = connectors.filter(
    (connector) =>
      matchesFilter(connector, statusFilter) &&
      (!normalizedSearch ||
        `${connector.name} ${connector.description} ${connector.category}`
          .toLowerCase()
          .includes(normalizedSearch)),
  );

  function toggle(connector: Connector) {
    if (connector.status === 'no_access') {
      return;
    }
    setDraftIds((previous) =>
      previous.includes(connector.id)
        ? previous.filter((id) => id !== connector.id)
        : [...previous, connector.id],
    );
  }

  /** Writes the decision: one call per source that actually changed, then closes.
   *
   *  Sequential rather than parallel — each attach may upsert the session (ADR-0005), and
   *  firing them together would race several creations of the same one. */
  async function submit() {
    try {
      for (const id of draftIds.filter((id) => !attachedIds.includes(id))) {
        await setDataSource.mutateAsync({ id, attached: true });
      }
      for (const id of attachedIds.filter((id) => !draftIds.includes(id))) {
        await setDataSource.mutateAsync({ id, attached: false });
      }
    } catch {
      // The mutation has already toasted it. The panel closes either way: a connector is
      // a capability, and holding the dialog open over one that would not attach helps
      // nobody.
    }
    onClose();
  }

  function submitAddConnector() {
    const name = addValue.trim();
    if (!name) return;
    // Adding one IS picking it, so it lands in the draft — and reaches the session with
    // the rest of the selection on Submit.
    addConnector.mutate(name, {
      onSuccess: (id) => setDraftIds((previous) => [...previous, id]),
    });
    setAddValue('');
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Connectors"
      width={720}
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
          <span className={styles.footerCount}>
            Showing {visibleConnectors.length} of {connectors.length}
          </span>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            loading={setDataSource.isPending}
            disabled={!isDirty}
            onClick={() => void submit()}
          >
            Submit
          </Button>
        </div>
      }
    >
      <p className={styles.subtitle}>
        Connect eRD AI to your RD data sources · {connectedCount} of {connectors.length} connected.
      </p>

      <div className={styles.selectedBox}>
        <div className={styles.selectedHeader}>
          <CheckCircleFilled aria-hidden className={styles.selectedHeaderIcon} />
          <span className={styles.selectedHeaderLabel}>Selected sources</span>
          <span className={styles.badge}>{connectedCount}</span>
          {connectedCount > 0 && (
            <button
              type="button"
              className={styles.clearAll}
              onClick={() => connectedConnectors.forEach((c) => toggle(c))}
            >
              Clear all
            </button>
          )}
        </div>
        <div className={styles.selectedChips}>
          {connectedCount > 0 ? (
            connectedConnectors.map((connector) => (
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
            <span className={styles.selectedEmpty}>
              No sources selected yet — connect one below.
            </span>
          )}
        </div>
      </div>

      <div className={styles.searchRow}>
        <SearchOutlined aria-hidden className={styles.searchIcon} />
        <Input
          className={styles.searchInput}
          variant="borderless"
          aria-label="Search data sources"
          placeholder="Search data sources…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className={styles.searchClear}
            aria-label="Clear search"
            onClick={() => setSearch('')}
          >
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
            {filter}
            {filter !== 'All' && (
              <span className={styles.filterChipCount}>
                {connectors.filter((c) => matchesFilter(c, filter)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <ul className={styles.list}>
        {visibleConnectors.length ? (
          visibleConnectors.map((connector) => {
            const isPending =
              setDataSource.isPending && setDataSource.variables?.id === connector.id;
            const meta = statusMeta(connector.status, isPending);
            const isConnected = connector.status === 'connected';
            return (
              <li key={connector.id} className={styles.row} data-connected={isConnected}>
                <span className={styles.icon} data-connected={isConnected} aria-hidden="true">
                  {CONNECTOR_ICONS[connector.id] ?? <ApiOutlined aria-hidden />}
                </span>
                <span className={styles.info}>
                  <span className={styles.nameRow}>
                    <span className={styles.name}>{connector.name}</span>
                    <span className={styles.categoryTag}>{connector.category}</span>
                    {connector.custom && <span className={styles.customTag}>custom</span>}
                  </span>
                  <span className={styles.description}>{connector.description}</span>
                  <span
                    className={styles.status}
                    data-status={connector.status}
                    style={{ color: meta.color }}
                  >
                    <span className={styles.statusDot} style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                </span>
                <Button
                  className={styles.toggleButton}
                  data-state={isPending ? 'connecting' : connector.status}
                  shape="circle"
                  size="small"
                  disabled={connector.status === 'no_access'}
                  aria-label={
                    isConnected ? `Disconnect ${connector.name}` : `Connect ${connector.name}`
                  }
                  icon={toggleIcon(connector.status, isPending)}
                  onClick={() => toggle(connector)}
                />
              </li>
            );
          })
        ) : (
          <li className={styles.empty}>No data sources match “{search}”.</li>
        )}
      </ul>

      <div className={styles.addRow}>
        <Input
          aria-label="Add a custom data source"
          placeholder="Add a custom data source (e.g. My Team DB)…"
          value={addValue}
          onChange={(e) => setAddValue(e.target.value)}
          onPressEnter={submitAddConnector}
        />
        <Button icon={<PlusOutlined aria-hidden />} onClick={submitAddConnector}>
          Add
        </Button>
      </div>
    </Modal>
  );
};

export default ConnectorsPanel;
