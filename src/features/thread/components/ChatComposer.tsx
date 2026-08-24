import {
  ApiOutlined,
  ArrowUpOutlined,
  BorderOutlined,
  DashboardOutlined,
  DotChartOutlined,
  FileAddOutlined,
  FilePptOutlined,
  LineChartOutlined,
  PieChartOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Dropdown, Input } from 'antd';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { ConnectorsPanel } from '@/features/connectors/components/ConnectorsPanel';
import { useConnectors } from '@/features/connectors/hooks/useConnectors';
import { selectConnected } from '@/features/connectors/model';
import { AttachmentChip } from '@/features/file-upload/components/AttachmentChip';
import { FileAttachmentModal } from '@/features/file-upload/components/FileAttachmentModal';
import { useFileAttachments } from '@/features/file-upload/hooks/useFileAttachments';
import type { ArtifactKind, ScenarioKey } from '@/types/api';
import { dispatchMenuAction } from '@/utils/dispatchMenuAction';

import type { SendMessageInput } from '../api/messageApi';
import styles from './ChatComposer.module.css';

const SUGGESTED_PROMPTS: {
  label: string;
  text: string;
  scenarioKey: ScenarioKey;
  artifactKind?: ArtifactKind;
  icon: ReactNode;
}[] = [
  {
    label: 'Inline dashboard',
    text: 'Generate an Inline dashboard.',
    scenarioKey: 'inline',
    icon: <DotChartOutlined aria-hidden />,
  },
  {
    label: 'SPC analysis',
    text: 'Run an SPC analysis on Vt (gate CD).',
    scenarioKey: 'spc',
    icon: <LineChartOutlined aria-hidden />,
  },
  {
    label: 'Generate slides',
    text: 'Generate slides from this analysis.',
    scenarioKey: 'spc',
    artifactKind: 'slides',
    icon: <FilePptOutlined aria-hidden />,
  },
  {
    label: 'Daily monitor (A14)',
    text: 'Generate the Daily Monitor dashboard for A14.',
    scenarioKey: 'daily',
    icon: <DashboardOutlined aria-hidden />,
  },
  {
    label: 'CP Test status',
    text: 'What is the CP Test status?',
    scenarioKey: 'cptest',
    icon: <PieChartOutlined aria-hidden />,
  },
];

interface ChatComposerProps {
  onSend: (input: SendMessageInput) => void;
  disabled: boolean;
  /** While a run is streaming the send control becomes a stop control. */
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatComposer({ onSend, disabled, isStreaming, onStop }: ChatComposerProps) {
  const [draft, setDraft] = useState('');
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const {
    attachments,
    error: attachmentError,
    addFiles,
    removeFile,
    clear: clearAttachments,
  } = useFileAttachments();
  const { data: connectorsData } = useConnectors();
  const connectedConnectorCount = selectConnected(connectorsData ?? []).length;

  function send(input: SendMessageInput) {
    onSend({ ...input, attachments: attachments.length > 0 ? attachments : undefined });
    clearAttachments();
  }

  function submitDraft() {
    const text = draft.trim();
    if (!text || disabled) {
      return;
    }
    send({ text });
    setDraft('');
  }

  return (
    <div>
      <div className={styles.suggestRow}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt.label}
            type="button"
            className={styles.suggestChip}
            disabled={disabled}
            onClick={() =>
              send({
                text: prompt.text,
                scenarioKey: prompt.scenarioKey,
                artifactKind: prompt.artifactKind,
              })
            }
          >
            {prompt.icon}
            {prompt.label}
          </button>
        ))}
      </div>
      <div className={styles.composerBox}>
        {attachments.length > 0 && (
          <ul className={styles.attachmentsRow} aria-label="Attached files">
            {attachments.map((upload) => (
              <li key={upload.id}>
                <AttachmentChip upload={upload} onRemove={() => removeFile(upload.fileName)} />
              </li>
            ))}
          </ul>
        )}
        <div className={styles.inputRow}>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'attach',
                  label: 'Attach files',
                  icon: <FileAddOutlined aria-hidden />,
                },
                {
                  key: 'connectors',
                  label: (
                    <span className={styles.menuItemLabel}>
                      Connectors
                      {connectedConnectorCount > 0 && (
                        <span className={styles.menuItemBadge} aria-hidden="true">
                          {connectedConnectorCount}
                        </span>
                      )}
                    </span>
                  ),
                  icon: <ApiOutlined aria-hidden />,
                },
              ],
              onClick: ({ key }) =>
                dispatchMenuAction(key, {
                  attach: () => setFileModalOpen(true),
                  connectors: () => setConnectorsOpen(true),
                }),
            }}
          >
            <button
              type="button"
              className={styles.iconButton}
              disabled={disabled}
              title="Attach files or connect a data source"
              aria-label="Attach files or connect a data source"
            >
              <PlusOutlined aria-hidden />
            </button>
          </Dropdown>
          <Input.TextArea
            className={styles.messageInput}
            variant="borderless"
            aria-label="Message"
            placeholder="Ask eRD AI, or attach .csv / .xlsx…"
            value={draft}
            disabled={disabled}
            autoSize={{ minRows: 1, maxRows: 5 }}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitDraft();
              }
            }}
          />
          {isStreaming ? (
            <button
              type="button"
              className={styles.stopButton}
              onClick={onStop}
              title="Stop"
              aria-label="Stop"
            >
              <BorderOutlined aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              className={styles.sendButton}
              disabled={disabled}
              onClick={submitDraft}
              title="Send message"
              aria-label="Send message"
            >
              <ArrowUpOutlined aria-hidden />
            </button>
          )}
        </div>
      </div>
      <FileAttachmentModal
        open={fileModalOpen}
        onClose={() => setFileModalOpen(false)}
        attachments={attachments}
        error={attachmentError}
        onAddFiles={addFiles}
        onRemoveFile={removeFile}
      />
      <ConnectorsPanel open={connectorsOpen} onClose={() => setConnectorsOpen(false)} />
    </div>
  );
}
