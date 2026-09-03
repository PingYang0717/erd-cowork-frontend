import {
  CloseOutlined,
  CloudUploadOutlined,
  ExclamationCircleOutlined,
  FileExcelOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Button, Modal, Progress } from 'antd';
import React, { useRef } from 'react';

import type { UploadProgress } from '@/api/fileApi';
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENT_TOTAL_LABEL,
} from '@/hooks/useFileAttachments';
import { useTranslations } from '@/i18n/useTranslations';
import type { UploadedFileInfo } from '@/types/api';
import { formatBytes } from '@/utils/formatBytes';

import styles from './FileAttachmentModal.module.css';

const fileExtension = (fileName: string) => {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
};

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
  /** The upload in flight, or null when nothing is uploading. */
  uploadProgress: UploadProgress | null;
  /** True while the session's file set is being written to — an upload OR a removal.
   *  The modal's surfaces close on both: a second write started mid-flight lands on a
   *  request already describing a different set, and Done implies the set is settled. */
  isMutating: boolean;
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (fileId: string) => void;
}

const FileAttachmentModal: React.FC<FileAttachmentModalProps> = ({
  open,
  onClose,
  attachments,
  error,
  uploadProgress,
  isMutating,
  onAddFiles,
  onRemoveFile,
}) => {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const totalBytes = attachments.reduce((sum, a) => sum + a.sizeBytes, 0);
  // Removal counts too, not only upload: it used to gate on the upload alone, so a
  // removal in flight left every surface open — including a second click on the same
  // Remove button, which fired the delete twice.
  const isUploading = isMutating;

  return (
    <Modal open={open} onCancel={onClose} title={t.fileModal.title} footer={null} destroyOnHidden>
      <p className={styles.subtitle}>{t.fileModal.subtitle}</p>

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

      {uploadProgress !== null && (
        <>
          <Progress
            percent={uploadProgress.percent}
            aria-label="Uploading"
            size="small"
            status="active"
            className={styles.uploadProgress}
          />
          {/* Bytes are out; the backend is still receiving and parsing. The bar parks
              at 90 (honestly — this client cannot see the server's share) and this
              line says the wait is the server's, not a hang. */}
          {uploadProgress.phase === 'processing' && (
            <p role="status" className={styles.processingNote}>
              {t.files.processing}
            </p>
          )}
        </>
      )}

      {error && (
        <div className={styles.error} role="alert">
          <ExclamationCircleOutlined aria-hidden />
          {error}
        </div>
      )}

      <div className={styles.attachedSection}>
        <div className={styles.attachedHeader}>
          <span>{t.fileModal.attached}</span>
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
          <div className={styles.emptyAttached}>{t.fileModal.noFiles}</div>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.footerSummary}>
          {t.fileModal.summary(attachments.length, MAX_ATTACHMENT_COUNT, formatBytes(totalBytes))}
        </span>
        {/* Done says "the set is settled" — while a write is still in flight it is
            not, and closing on top of it hides the one place the progress shows. */}
        <Button type="primary" autoInsertSpace={false} disabled={isMutating} onClick={onClose}>
          {t.fileModal.done}
        </Button>
      </div>
    </Modal>
  );
};

export default FileAttachmentModal;
