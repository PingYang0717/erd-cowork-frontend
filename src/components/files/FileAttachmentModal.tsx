import {
  CloseOutlined,
  CloudUploadOutlined,
  ExclamationCircleOutlined,
  FileExcelOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Button, Modal, Progress } from 'antd';
import React, { useRef } from 'react';

import { ACCEPT_ATTRIBUTE, MAX_ATTACHMENT_COUNT } from '@/hooks/useFileAttachments';
import type { UploadedFileInfo } from '@/types/api/index';
import { formatBytes } from '@/utils/formatBytes';

import styles from './FileAttachmentModal.module.css';

function fileExtension(fileName: string) {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

// The mockup's file rows color the icon by type: csv = primary,
// xlsx/xls = success.
function FileRow({ upload, onRemove }: { upload: UploadedFileInfo; onRemove: () => void }) {
  const ext = fileExtension(upload.name);
  return (
    <span className={styles.fileRow}>
      <span
        className={styles.fileRowIcon}
        data-testid="file-type-icon"
        data-file-type={ext}
        aria-hidden="true"
      >
        {ext === 'csv' ? <FileTextOutlined /> : <FileExcelOutlined />}
      </span>
      <span className={styles.fileRowInfo}>
        <span className={styles.fileRowName}>{upload.name}</span>
        <span className={styles.fileRowMeta}>
          {ext.toUpperCase()} · {formatBytes(upload.sizeBytes)}
        </span>
      </span>
      <button
        type="button"
        className={styles.fileRowRemove}
        aria-label={`Remove ${upload.name}`}
        onClick={onRemove}
      >
        <CloseOutlined aria-hidden />
      </button>
    </span>
  );
}

interface FileAttachmentModalProps {
  open: boolean;
  onClose: () => void;
  attachments: UploadedFileInfo[];
  error: string;
  /** Progress of the upload in flight, or null when nothing is uploading. */
  uploadPercent: number | null;
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (fileId: string) => void;
}

const FileAttachmentModal: React.FC<FileAttachmentModalProps> = ({
  open,
  onClose,
  attachments,
  error,
  uploadPercent,
  onAddFiles,
  onRemoveFile,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const totalBytes = attachments.reduce((sum, a) => sum + a.sizeBytes, 0);

  return (
    <Modal open={open} onCancel={onClose} title="Attach files" footer={null} destroyOnHidden>
      <p className={styles.subtitle}>Drop or choose files to attach to this analysis.</p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
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
          <span className={styles.dropzoneLink}>點擊選擇</span> 或把檔案拖拉到這裡
        </div>
        <div className={styles.dropzoneHint}>
          最多 {MAX_ATTACHMENT_COUNT} 個檔案 · 總計上限 5 GB
        </div>
      </div>

      {uploadPercent !== null && (
        <Progress
          percent={uploadPercent}
          aria-label="Uploading"
          size="small"
          status="active"
          className={styles.uploadProgress}
        />
      )}

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
                <FileRow upload={upload} onRemove={() => onRemoveFile(upload.id)} />
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
};

export default FileAttachmentModal;
