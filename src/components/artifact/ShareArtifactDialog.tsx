import { CheckOutlined, CopyOutlined, FundOutlined, LinkOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Select } from 'antd';
import React, { useMemo, useState } from 'react';

import { DIRECTORY_SEARCH_MIN_LENGTH } from '@/api/directoryApi';
import { useShareArtifact } from '@/hooks/useArtifactMutations';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDirectorySearch } from '@/hooks/useDirectorySearch';
import type { Artifact, DirectoryEntry } from '@/types/api/index';
import {
  directoryEntryKey,
  directoryEntryLabel,
  directoryShareTarget,
} from '@/utils/directoryEntry';

import styles from './ShareArtifactDialog.module.css';

interface ShareArtifactDialogProps {
  open: boolean;
  onClose: () => void;
  artifact: Artifact;
}

const ShareArtifactDialog: React.FC<ShareArtifactDialogProps> = ({ open, onClose, artifact }) => {
  const shareArtifact = useShareArtifact();
  const [recipients, setRecipients] = useState<DirectoryEntry[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleClose() {
    setRecipients([]);
    setShareUrl(null);
    setCopied(false);
    onClose();
  }

  function handleConfirm() {
    shareArtifact.mutate(
      { id: artifact.id, targets: recipients.map(directoryShareTarget) },
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
      <p className={styles.subtitle}>Artifact 已發布,可分享給團隊檢視。</p>
      <div className={styles.infoCard} aria-label="Artifact 資訊">
        <span className={styles.infoCardIcon} aria-hidden>
          <FundOutlined />
        </span>
        <span className={styles.infoCardText}>
          <span className={styles.infoCardName}>{artifact.title}</span>
          {/* The Artifact's kind returns as `type` once the backend adds it; until
              then there is nothing true to put in front of the product name. */}
          <span className={styles.infoCardKind}>eRD Cowork</span>
        </span>
        {artifact.publishedAt !== null && (
          <span className={styles.infoCardGeneratedChip}>
            <CheckOutlined aria-hidden />
            已發布
          </span>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>分享對象</div>
        <RecipientSelect value={recipients} onChange={setRecipients} />
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
            disabled={recipients.length === 0}
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

interface RecipientSelectProps {
  /** The chosen entries themselves, not their keys: the share payload needs each one's
   *  type and id, which only the entry carries. */
  value: DirectoryEntry[];
  onChange: (entries: DirectoryEntry[]) => void;
}

/** The directory is the whole organisation, so this searches the backend rather than
 *  filtering a list it holds. Two consequences shape the field: nothing is offered until
 *  the key is long enough to narrow anything (`filterOption={false}` hands matching to
 *  the backend), and what the user picked has to survive the options list changing under
 *  it — so chosen entries are remembered here and merged back into the options. */
const RecipientSelect: React.FC<RecipientSelectProps> = ({ value, onChange }) => {
  const [keyword, setKeyword] = useState('');
  const { entries, isSearching, enabled } = useDirectorySearch(useDebouncedValue(keyword));
  const [picked, setPicked] = useState<DirectoryEntry[]>([]);

  const options = useMemo(() => {
    const byKey = new Map(picked.map((entry) => [directoryEntryKey(entry), entry]));
    for (const entry of entries) {
      byKey.set(directoryEntryKey(entry), entry);
    }
    return [...byKey.entries()].map(([key, entry]) => ({
      value: key,
      label: directoryEntryLabel(entry),
    }));
  }, [entries, picked]);

  function handleChange(keys: string[]) {
    // Hold on to the entries behind the chosen keys. The options list is replaced by the
    // next search, and without this a recipient already picked would come back as a bare
    // key with no name on it — and, worse, with no way to build its share target.
    const known = new Map(
      [...picked, ...entries].map((entry) => [directoryEntryKey(entry), entry]),
    );
    const chosen = keys
      .map((key) => known.get(key))
      .filter((entry): entry is DirectoryEntry => entry !== undefined);
    setPicked(chosen);
    onChange(chosen);
  }

  return (
    <Select
      mode="multiple"
      virtual={false}
      // antd 6 moved search configuration onto `showSearch` itself; the flat
      // `filterOption` / `searchValue` / `onSearch` props are deprecated.
      // `filterOption: false` hands matching to the backend, which is doing the
      // searching — filtering again here would hide rows it deliberately returned.
      showSearch={{
        filterOption: false,
        searchValue: keyword,
        onSearch: setKeyword,
      }}
      loading={isSearching}
      value={value.map(directoryEntryKey)}
      onChange={handleChange}
      options={options}
      notFoundContent={
        isSearching
          ? '搜尋中…'
          : enabled
            ? '找不到符合的對象'
            : `請至少輸入 ${DIRECTORY_SEARCH_MIN_LENGTH} 個字元`
      }
      placeholder={`輸入 ${DIRECTORY_SEARCH_MIN_LENGTH} 個字元以上搜尋部門 / 課別 或 NT account · 姓名`}
      style={{ width: '100%' }}
    />
  );
};

export default ShareArtifactDialog;
