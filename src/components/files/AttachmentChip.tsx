import { CloseOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';
import React from 'react';

import type { UploadedFileInfo } from '@/types/api';
import { formatBytes } from '@/utils/formatBytes';

import styles from './AttachmentChip.module.css';

interface AttachmentChipProps {
  upload: UploadedFileInfo;
  onRemove?: () => void;
}

const AttachmentChip: React.FC<AttachmentChipProps> = ({ upload, onRemove }) => {
  const isSpreadsheet = /\.(xlsx|xls)$/i.test(upload.name);

  // The backend deletes the contents once retention lapses but keeps the row, so the
  // chip has to say the file is gone rather than look like it is still usable.
  return (
    <span className={upload.expired ? styles.expiredChip : styles.chip}>
      {isSpreadsheet ? <FileExcelOutlined aria-hidden /> : <FileTextOutlined aria-hidden />}
      <span className={styles.name}>{upload.name}</span>
      {upload.expired ? (
        <span className={styles.expiredBadge}>已過期</span>
      ) : (
        <span className={styles.size}>{formatBytes(upload.sizeBytes)}</span>
      )}
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          aria-label={`Remove ${upload.name}`}
          onClick={onRemove}
        >
          <CloseOutlined aria-hidden />
        </button>
      )}
    </span>
  );
};

export default AttachmentChip;
