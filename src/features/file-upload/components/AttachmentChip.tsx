import { CloseOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';

import type { Upload } from '@/types/api';
import { formatBytes } from '@/utils/formatBytes';

import styles from './AttachmentChip.module.css';

export function AttachmentChip({ upload, onRemove }: { upload: Upload; onRemove?: () => void }) {
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
}
