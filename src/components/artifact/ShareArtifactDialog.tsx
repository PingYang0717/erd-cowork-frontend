import {
  AppstoreOutlined,
  CheckOutlined,
  CopyOutlined,
  FundOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { Button, Input, Modal, Select } from 'antd';
import React, { useState } from 'react';

import { useShareArtifact } from '@/hooks/useArtifactMutations';
import { useDirectory } from '@/hooks/useDirectory';
import type { Artifact } from '@/types/api/index';

import styles from './ShareArtifactDialog.module.css';

interface ShareArtifactDialogProps {
  open: boolean;
  onClose: () => void;
  artifact: Artifact;
}

const ShareArtifactDialog: React.FC<ShareArtifactDialogProps> = ({ open, onClose, artifact }) => {
  const { data: directory } = useDirectory();
  const shareArtifact = useShareArtifact();
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleClose() {
    setTargetIds([]);
    setShareUrl(null);
    setCopied(false);
    onClose();
  }

  function handleConfirm() {
    shareArtifact.mutate(
      { id: artifact.id, targetIds },
      { onSuccess: (result) => setShareUrl(result.url) },
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl ?? '');
    } catch {
      // clipboard may be unavailable (e.g. insecure context); the link is
      // still visible and selectable in the input for manual copying
    }
    setCopied(true);
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title="分享 Artifact"
      width={460}
      footer={null}
      destroyOnHidden
    >
      <p className={styles.subtitle}>Artifact 已生成,可分享給團隊檢視。</p>
      <div className={styles.infoCard} aria-label="Artifact 資訊">
        <span className={styles.infoCardIcon} aria-hidden>
          {artifact.kind === 'dashboard' ? <FundOutlined /> : <AppstoreOutlined />}
        </span>
        <span className={styles.infoCardText}>
          <span className={styles.infoCardName}>{artifact.name}</span>
          <span className={styles.infoCardKind}>
            {artifact.kind === 'dashboard' ? 'Dashboard' : 'Slides'} · eRD Cowork
          </span>
        </span>
        {artifact.generated && (
          <span className={styles.infoCardGeneratedChip}>
            <CheckOutlined aria-hidden />
            已生成
          </span>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>分享對象</div>
        <Select
          mode="multiple"
          virtual={false}
          showSearch
          optionFilterProp="label"
          value={targetIds}
          onChange={setTargetIds}
          options={(directory ?? []).map((entry) => ({ value: entry.id, label: entry.label }))}
          placeholder="搜尋部門碼 / 課別碼 或 NT account · 中文名,可多選…"
          style={{ width: '100%' }}
        />
        <div className={styles.hint}>
          可混選部門(A10INTD1-1)、課別(INTD-1)與人員(CHXXGHYC · 鄭凱宇)
        </div>
      </div>

      {shareUrl && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>分享連結</div>
          <div className={styles.linkRow}>
            <Input readOnly prefix={<LinkOutlined aria-hidden />} value={shareUrl} />
            <Button
              type="primary"
              autoInsertSpace={false}
              icon={copied ? <CheckOutlined aria-hidden /> : <CopyOutlined aria-hidden />}
              onClick={handleCopy}
            >
              {copied ? '已複製' : '複製'}
            </Button>
          </div>
          <div className={styles.confirmBanner}>
            已加入左側 Artifacts 清單 — 可到 Artifacts 開啟或再次分享。
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <Button autoInsertSpace={false} onClick={handleClose}>
          {shareUrl ? '完成' : '取消'}
        </Button>
        {!shareUrl && (
          <Button
            type="primary"
            autoInsertSpace={false}
            disabled={targetIds.length === 0}
            loading={shareArtifact.isPending}
            onClick={handleConfirm}
          >
            分享
          </Button>
        )}
      </div>
    </Modal>
  );
};

export { ShareArtifactDialog };
export default ShareArtifactDialog;
