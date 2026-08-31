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
import React, { useRef, useState } from 'react';

import ConnectorsPanel from '@/components/connectors/ConnectorsPanel';
import AttachmentChip from '@/components/files/AttachmentChip';
import FileAttachmentModal from '@/components/files/FileAttachmentModal';
import { type SendInput } from '@/hooks/useAgentStream';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useConnectors } from '@/hooks/useConnectors';
import { useFileAttachments } from '@/hooks/useFileAttachments';
import { useConnectorsPanelStore } from '@/stores/useConnectorsPanelStore';
import { selectConnected } from '@/utils/connectorSelectors';
import { dispatchMenuAction } from '@/utils/dispatchMenuAction';

import styles from './ChatComposer.module.css';

// The backend infers everything from the question text (its body is question-only),
// so a prompt is just its text — the mock mirrors that inference by keyword.
const SUGGESTED_PROMPTS: { label: string; text: string; icon: ReactNode }[] = [
  {
    label: 'Inline dashboard',
    text: 'Generate an Inline dashboard.',
    icon: <DotChartOutlined aria-hidden />,
  },
  {
    label: 'SPC analysis',
    text: 'Run an SPC analysis on Vt (gate CD).',
    icon: <LineChartOutlined aria-hidden />,
  },
  {
    label: 'Generate slides',
    text: 'Generate slides from this analysis.',
    icon: <FilePptOutlined aria-hidden />,
  },
  {
    label: 'Daily monitor (A14)',
    text: 'Generate the Daily Monitor dashboard for A14.',
    icon: <DashboardOutlined aria-hidden />,
  },
  {
    label: 'CP Test status',
    text: 'What is the CP Test status?',
    icon: <PieChartOutlined aria-hidden />,
  },
];

interface ChatComposerProps {
  sessionId: string;
  onSend: (input: SendInput) => void;
  disabled: boolean;
  /** While a run is streaming the send control becomes a stop control. */
  isStreaming: boolean;
  onStop: () => void;
}

const ChatComposer: React.FC<ChatComposerProps> = ({
  sessionId,
  onSend,
  disabled,
  isStreaming,
  onStop,
}) => {
  const [draft, setDraft] = useState('');
  const [fileModalOpen, setFileModalOpen] = useState(false);
  // An input method (注音, 拼音, かな) is mid-word for most of the time a Chinese or
  // Japanese user spends typing, and its Enter means "take this candidate", not "send".
  // A ref rather than state: nothing renders differently, and a re-render between
  // compositionend and keydown would be a race.
  const isComposingRef = useRef(false);

  const {
    attachments,
    error: attachmentError,
    uploadPercent,
    addFiles,
    removeFile,
  } = useFileAttachments(sessionId);
  const connectors = useConnectors(sessionId);
  const { retentionDays } = useAppConfig();
  const connectorsOpen = useConnectorsPanelStore((store) => store.isOpen);
  const openConnectors = useConnectorsPanelStore((store) => store.open);
  const closeConnectors = useConnectorsPanelStore((store) => store.close);
  const connectedConnectorCount = selectConnected(connectors).length;

  // Retention has already deleted these files server-side. Anything sent now runs
  // against data that is not there, so the composer closes until they are cleared —
  // the same call the backend makes when it answers FILES_EXPIRED.
  const hasExpiredFiles = attachments.some((upload) => upload.expired);
  const isBlocked = disabled || hasExpiredFiles;

  // Attachments do not travel with the message: they already live on the session
  // (uploaded on attach), and the mock snapshots them onto the sent message.
  function send(question: string) {
    onSend({ question });
  }

  function submitDraft() {
    const text = draft.trim();
    if (!text || isBlocked) {
      return;
    }
    send(text);
    setDraft('');
  }

  return (
    <div>
      {hasExpiredFiles && (
        <p role="alert" className={styles.retentionNotice}>
          部分檔案已超過 {retentionDays} 天未活動，內容已被系統清除。請移除下方標示「已過期」的
          檔案並重新上傳，即可繼續對話。
        </p>
      )}
      <div className={styles.suggestRow}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt.label}
            type="button"
            className={styles.suggestChip}
            disabled={isBlocked}
            onClick={() => send(prompt.text)}
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
                <AttachmentChip upload={upload} onRemove={() => void removeFile(upload.id)} />
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
                  connectors: openConnectors,
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
            disabled={isBlocked}
            autoSize={{ minRows: 1, maxRows: 5 }}
            onChange={(e) => setDraft(e.target.value)}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
            onKeyDown={(e) => {
              // `isComposing` is the standard signal but is not set by every browser or
              // IME; the composition events are the fallback that always fires.
              if (isComposingRef.current || e.nativeEvent.isComposing) {
                return;
              }
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
              disabled={isBlocked}
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
        uploadPercent={uploadPercent}
        onAddFiles={(files) => void addFiles(files)}
        onRemoveFile={(fileId) => void removeFile(fileId)}
      />
      <ConnectorsPanel sessionId={sessionId} open={connectorsOpen} onClose={closeConnectors} />
    </div>
  );
};

// Memoised because ThreadView re-renders once per streamed TOKEN (10-40/s): without
// this, every token re-rendered the antd TextArea (autoSize measurement included), the
// "+"-menu Dropdown and both modals. All props are primitives or useCallback-stable —
// ThreadPanel's handleSend comment has claimed this memo for a while; now it exists.
export default React.memo(ChatComposer);
