import { CloseOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';
import React from 'react';

import type { UploadedFileInfo } from '@/types/api/index';
import { formatBytes } from '@/utils/formatBytes';

import styles from './AttachmentChip.module.css';

interface AttachmentChipProps {
  upload: UploadedFileInfo;
  onRemove?: () => void;
}

const AttachmentChip: React.FC<AttachmentChipProps> = ({ upload, onRemove }) => {
  const isSpreadsheet = /\.(xlsx|xls)$/i.test(upload.name);

  return (
    <span className={styles.chip}>
      {isSpreadsheet ? <FileExcelOutlined aria-hidden /> : <FileTextOutlined aria-hidden />}
      <span className={styles.name}>{upload.name}</span>
      <span className={styles.size}>{formatBytes(upload.sizeBytes)}</span>
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

export { AttachmentChip };
export default AttachmentChip;
