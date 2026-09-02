import {
  CloseOutlined,
  CloudUploadOutlined,
  ExclamationCircleOutlined,
  FileExcelOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Button, Modal, Progress } from 'antd';
import React, { useRef } from 'react';

import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENT_TOTAL_LABEL,
} from '@/hooks/useFileAttachments';
import { useTranslations } from '@/i18n/useTranslations';
import type { UploadedFileInfo } from '@/types/api';
import { formatBytes } from '@/utils/formatBytes';

import styles from './FileAttachmentModal.module.css';

function fileExtension(fileName: string) {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

// The mockup's file rows color the icon by type: csv = primary,
// xlsx/xls = success.
interface FileRowProps {
  upload: UploadedFileInfo;
  /** True while another upload is in flight: removing a file then would race the request
   *  that is still describing the old set. */
  disabled: boolean;
  onRemove: () => void;
}

const FileRow: React.FC<FileRowProps> = ({ upload, disabled, onRemove }) => {
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
        disabled={disabled}
        onClick={onRemove}
      >
        <CloseOutlined aria-hidden />
      </button>
    </span>
  );
};

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
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const totalBytes = attachments.reduce((sum, a) => sum + a.sizeBytes, 0);
  const isUploading = uploadPercent !== null;

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
        disabled={isUploading}
        onChange={(e) => {
          if (e.target.files) {
            onAddFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />
      {/* Shut while bytes are going out. A CSV here runs to gigabytes, so the upload is
          a window the user can act in — and a second batch chosen mid-flight, or a file
          removed from under one, lands on a request already describing a different set. */}
      <div
        role="button"
        tabIndex={isUploading ? -1 : 0}
        aria-disabled={isUploading || undefined}
        className={isUploading ? `${styles.dropzone} ${styles.dropzoneBusy}` : styles.dropzone}
        onClick={() => {
          if (!isUploading) {
            inputRef.current?.click();
          }
        }}
        onKeyDown={(e) => {
          if (!isUploading && (e.key === 'Enter' || e.key === ' ')) {
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!isUploading && e.dataTransfer.files.length) {
            onAddFiles(e.dataTransfer.files);
          }
        }}
      >
        <CloudUploadOutlined aria-hidden className={styles.dropzoneIcon} />
        <div>
          <span className={styles.dropzoneLink}>{t.files.dropzoneLink}</span> {t.files.dropzoneRest}
        </div>
        <div className={styles.dropzoneHint}>
          {t.files.limits(MAX_ATTACHMENT_COUNT, MAX_ATTACHMENT_TOTAL_LABEL)}
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
                <FileRow
                  upload={upload}
                  disabled={isUploading}
                  onRemove={() => onRemoveFile(upload.id)}
                />
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
