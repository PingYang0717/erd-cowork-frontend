import { CloseOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';
import React from 'react';

import type { Upload } from '@/types/api/index';
import { formatBytes } from '@/utils/formatBytes';

import styles from './AttachmentChip.module.css';

interface AttachmentChipProps {
  upload: Upload;
  onRemove?: () => void;
}

const AttachmentChip: React.FC<AttachmentChipProps> = ({ upload, onRemove }) => {
  const isSpreadsheet = /\.(xlsx|xls)$/i.test(upload.fileName);

  return (
    <span className={styles.chip}>
      {isSpreadsheet ? <FileExcelOutlined aria-hidden /> : <FileTextOutlined aria-hidden />}
      <span className={styles.name}>{upload.fileName}</span>
      <span className={styles.size}>{formatBytes(upload.sizeBytes)}</span>
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          aria-label={`Remove ${upload.fileName}`}
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
