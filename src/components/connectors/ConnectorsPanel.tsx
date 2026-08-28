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
import type { ReactNode } from 'react';
import React, { useState } from 'react';

import { useAddConnector, useSetConnectorStatus } from '@/hooks/useConnectorMutations';
import { useConnectors } from '@/hooks/useConnectors';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Connector, ConnectorStatus } from '@/types/api/index';
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

const EMPTY_CONNECTORS: Connector[] = [];

interface ConnectorsPanelProps {
  open: boolean;
  onClose: () => void;
}

const ConnectorsPanel: React.FC<ConnectorsPanelProps> = ({ open, onClose }) => {
  const { data } = useConnectors();
  const connectors = data ?? EMPTY_CONNECTORS;
  const setStatus = useSetConnectorStatus();
  const addConnector = useAddConnector();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [addValue, setAddValue] = useState('');

  // Connect, disconnect and add write the user's preference to localStorage — the
  // backend has no connector endpoints this round, and a choice is the user's to keep.
  const connectedConnectors = selectConnected(connectors);
  const connectedCount = connectedConnectors.length;

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
    setStatus.mutate({
      id: connector.id,
      status: connector.status === 'connected' ? 'available' : 'connected',
    });
  }

  function submitAddConnector() {
    const name = addValue.trim();
    if (!name) return;
    addConnector.mutate(name);
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
          <Button type="primary" onClick={onClose}>
            Done
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
            const isPending = setStatus.isPending && setStatus.variables?.id === connector.id;
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

export { ConnectorsPanel };
export default ConnectorsPanel;
