import React, { type ReactNode, useRef, useState } from 'react';
import { Dropdown, Input } from 'antd';
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

import ConnectorsPanel from '@/components/connectors/ConnectorsPanel';
import AttachmentChip from '@/components/files/AttachmentChip';
import FileAttachmentModal from '@/components/files/FileAttachmentModal';
import { type SendInput } from '@/hooks/useAgentStream';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useConnectors } from '@/hooks/useConnectors';
import { useFileAttachments } from '@/hooks/useFileAttachments';
import { useTranslations } from '@/i18n/useTranslations';
import { useConnectorsPanelStore } from '@/stores/useConnectorsPanelStore';
import { selectConnected } from '@/utils/connectorSelectors';
import { dispatchMenuAction } from '@/utils/dispatchMenuAction';

import styles from './ChatComposer.module.css';

// The backend infers everything from the question text (its body is question-only),
// so a prompt is just its text — the mock mirrors that inference by keyword.
// `text` deliberately stays English in every language: it is the message SENT, and
// the keyword vocabulary the scenario inference is known to answer to is this one.
// Only the chip's visible `labelKey` follows the interface language.
const SUGGESTED_PROMPTS: {
  labelKey: 'inlineDashboard' | 'spcAnalysis' | 'generateSlides' | 'dailyMonitor' | 'cpTestStatus';
  text: string;
  icon: ReactNode;
}[] = [
  {
    labelKey: 'inlineDashboard',
    text: 'Generate an Inline dashboard.',
    icon: <DotChartOutlined aria-hidden />,
  },
  {
    labelKey: 'spcAnalysis',
    text: 'Run an SPC analysis on Vt (gate CD).',
    icon: <LineChartOutlined aria-hidden />,
  },
  {
    labelKey: 'generateSlides',
    text: 'Generate slides from this analysis.',
    icon: <FilePptOutlined aria-hidden />,
  },
  {
    labelKey: 'dailyMonitor',
    text: 'Generate the Daily Monitor dashboard for A14.',
    icon: <DashboardOutlined aria-hidden />,
  },
  {
    labelKey: 'cpTestStatus',
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

const ChatComposer: React.FC<ChatComposerProps> = ({ sessionId, onSend, disabled, isStreaming, onStop }) => {
  const t = useTranslations();
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
    uploadProgress,
    isMutating: isMutatingFiles,
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
  // Also shut while the session's files are being written to: a question sent then is
  // answered against a set that is still changing under it.
  const isBlocked = disabled || hasExpiredFiles || isMutatingFiles;

  // Attachments do not travel with the message: they already live on the session
  // (uploaded on attach), and the mock snapshots them onto the sent message.
  const send = (question: string) => {
    onSend({ question });
  };

  const submitDraft = () => {
    const text = draft.trim();
    if (!text || isBlocked) {
      return;
    }
    send(text);
    setDraft('');
  };

  return (
    <div>
      {hasExpiredFiles && (
        <p role="alert" className={styles.retentionNotice}>
          {t.chat.filesExpired(retentionDays)}
        </p>
      )}
      {isMutatingFiles && (
        <p role="status" className={styles.uploadingNotice}>
          {t.chat.uploadingWait}
        </p>
      )}
      <div className={styles.suggestRow}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt.labelKey}
            type="button"
            className={styles.suggestChip}
            disabled={isBlocked}
            onClick={() => send(prompt.text)}
          >
            {prompt.icon}
            {t.composer[prompt.labelKey]}
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
                  label: t.composer.attachFiles,
                  icon: <FileAddOutlined aria-hidden />,
                },
                {
                  key: 'connectors',
                  label: (
                    <span className={styles.menuItemLabel}>
                      {t.composer.connectors}
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
          {/* Deliberately NOT disabled while files are mutating: a gigabyte CSV
              uploads for minutes, and locking the box locks the user out of writing
              the question they are waiting to send. `submitDraft` and the send
              button still hold the line — only sending waits for the file set. */}
          <Input.TextArea
            className={styles.messageInput}
            variant="borderless"
            aria-label="Message"
            placeholder={t.composer.placeholder}
            value={draft}
            disabled={disabled || hasExpiredFiles}
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
            <button type="button" className={styles.stopButton} onClick={onStop} title="Stop" aria-label="Stop">
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
        uploadProgress={uploadProgress}
        isMutating={isMutatingFiles}
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
