import { CloudUploadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import { useRef } from 'react';

import type { Upload } from '@/types/api';
import { formatBytes } from '@/utils/formatBytes';

import { MAX_ATTACHMENT_COUNT, MAX_ATTACHMENT_TOTAL_BYTES } from '../hooks/useFileAttachments';
import { AttachmentChip } from './AttachmentChip';
import styles from './FileAttachmentModal.module.css';

export function FileAttachmentModal({
  open,
  onClose,
  attachments,
  error,
  onAddFiles,
  onRemoveFile,
}: {
  open: boolean;
  onClose: () => void;
  attachments: Upload[];
  error: string;
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (fileName: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const totalBytes = attachments.reduce((sum, a) => sum + a.sizeBytes, 0);

  return (
    <Modal open={open} onCancel={onClose} title="Attach files" footer={null} destroyOnHidden>
      <p className={styles.subtitle}>Drop or choose files to attach to this analysis.</p>

      <input
        ref={inputRef}
        type="file"
        multiple
        className={styles.hiddenInput}
        aria-label="Choose files"
        onChange={(e) => {
          if (e.target.files) {
            onAddFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />
      <div
        role="button"
        tabIndex={0}
        className={styles.dropzone}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) {
            onAddFiles(e.dataTransfer.files);
          }
        }}
      >
        <CloudUploadOutlined aria-hidden className={styles.dropzoneIcon} />
        <div>
          <span className={styles.dropzoneLink}>Click to choose</span> or drop files here
        </div>
        <div className={styles.dropzoneHint}>
          Max {MAX_ATTACHMENT_COUNT} files · {formatBytes(MAX_ATTACHMENT_TOTAL_BYTES)} total
        </div>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          <ExclamationCircleOutlined aria-hidden />
          {error}
        </div>
      )}

      <div className={styles.attachedSection}>
        <div className={styles.attachedHeader}>
          <span>Attached</span>
          {attachments.length > 0 && (
            <span className={styles.attachedCount}>{attachments.length}</span>
          )}
        </div>
        {attachments.length > 0 ? (
          <ul className={styles.attachedList}>
            {attachments.map((upload) => (
              <li key={upload.id}>
                <AttachmentChip upload={upload} onRemove={() => onRemoveFile(upload.fileName)} />
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.emptyAttached}>No files yet</div>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.footerSummary}>
          {attachments.length} / {MAX_ATTACHMENT_COUNT} files · {formatBytes(totalBytes)}
        </span>
        <Button type="primary" autoInsertSpace={false} onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
