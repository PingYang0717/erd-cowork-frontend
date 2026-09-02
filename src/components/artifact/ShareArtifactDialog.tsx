import { CheckOutlined, CopyOutlined, FundOutlined, LinkOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Select } from 'antd';
import React, { useMemo, useState } from 'react';

import { DIRECTORY_SEARCH_MIN_LENGTH } from '@/api/directoryApi';
import { useUpdateArtifactShares } from '@/hooks/useArtifactMutations';
import { useArtifactShares } from '@/hooks/useArtifactShares';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDirectorySearch } from '@/hooks/useDirectorySearch';
import type { Artifact, DirectoryEntry, ShareTarget } from '@/types/api';
import { artifactHref } from '@/utils/artifactUrl';
import {
  directoryEntryKey,
  directoryEntryLabel,
  directoryEntryMatches,
  directoryShareTarget,
} from '@/utils/directoryEntry';

import styles from './ShareArtifactDialog.module.css';

interface ShareArtifactDialogProps {
  open: boolean;
  onClose: () => void;
  artifact: Artifact;
}

const ShareArtifactDialog: React.FC<ShareArtifactDialogProps> = ({ open, onClose, artifact }) => {
  const { shares, isLoading } = useArtifactShares(artifact.id, open);
  const updateShares = useUpdateArtifactShares();
  const [recipients, setRecipients] = useState<DirectoryEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const shareUrl = artifactHref(artifact.id);

  // Opening loads who it is already shared with, and the picker starts from them: this
  // is an edit to a list, not a fresh act each time. Adjusted during render on the
  // open/closed transition so the field never shows an empty state it is about to fill.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setRecipients([]);
      setCopied(false);
    }
  }

  // The share list comes back in the picker's own shape, so it is already what the field
  // works in — recipients read with their names, and nothing has to be mapped.
  const alreadyShared = shares;
  const [edited, setEdited] = useState(false);
  const chosen = edited ? recipients : alreadyShared;

  function handleChoose(next: DirectoryEntry[]) {
    setEdited(true);
    setRecipients(next);
  }

  function handleClose() {
    setEdited(false);
    onClose();
  }

  function handleConfirm() {
    const before = alreadyShared.map(directoryShareTarget);
    const after = chosen.map(directoryShareTarget);
    const key = (target: ShareTarget) => `${target.type}:${target.id}`;
    const beforeKeys = new Set(before.map(key));
    const afterKeys = new Set(after.map(key));

    updateShares.mutate(
      {
        id: artifact.id,
        update: {
          add: after.filter((target) => !beforeKeys.has(key(target))),
          remove: before.filter((target) => !afterKeys.has(key(target))),
        },
      },
      // Submitting is the end of the dialog: the recipient list was the thing being
      // edited, and once it is saved there is nothing left here to do.
      { onSuccess: handleClose },
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
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
        <RecipientSelect value={chosen} loading={isLoading} onChange={handleChoose} />
        <div className={styles.hint}>
          可混選部門(A10INTD1-1)、課別(INTD-1)與人員(CHXXGHYC · 鄭凱宇)
        </div>
      </div>

      {/* Always here, not revealed by sharing. The link is the Artifact's address, not a
          reward for pressing a button — someone who opened this dialog only to copy it
          should not have to change the recipient list first. */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>分享連結</div>
        <div className={styles.linkRow}>
          <Input readOnly prefix={<LinkOutlined aria-hidden />} value={shareUrl} />
          {/* Secondary, not primary: a dialog has one button that finishes the job, and
              this is not it. The confirmation the user needs after pressing it is the
              tick and the wording, which do not depend on a colour. */}
          <Button
            className={styles.dialogButton}
            autoInsertSpace={false}
            icon={copied ? <CheckOutlined aria-hidden /> : <CopyOutlined aria-hidden />}
            onClick={handleCopy}
          >
            {copied ? '已複製' : '複製'}
          </Button>
        </div>
        {/* Styled as a hint, not as the green success banner it used to be: the link is
            here from the moment the dialog opens, so a panel announcing that something
            succeeded would be claiming it before anything had happened. */}
        <div className={styles.hint}>
          已加入左側 Artifacts 清單 — 可到 Artifacts 開啟或再次分享。
        </div>
      </div>

      <div className={styles.actions}>
        {/* Always pressable. Submit is also how this dialog is finished with, so gating
            it on having changed something leaves someone who only came to copy the link
            with no way out but the corner cross. Submitting an unchanged list sends an
            empty delta, which is a no-op. */}
        <Button
          type="primary"
          className={styles.dialogButton}
          autoInsertSpace={false}
          loading={updateShares.isPending}
          onClick={handleConfirm}
        >
          Submit
        </Button>
      </div>
    </Modal>
  );
};

interface RecipientSelectProps {
  /** The chosen entries themselves, not their keys: the share payload needs each one's
   *  type and id, which only the entry carries. */
  value: DirectoryEntry[];
  /** True while the existing share list is still being read. */
  loading: boolean;
  onChange: (entries: DirectoryEntry[]) => void;
}

/** The directory is the whole organisation, so this searches the backend rather than
 *  filtering a list it holds. Two consequences shape the field: nothing is offered until
 *  the key is long enough to narrow anything (`filterOption={false}` hands matching to
 *  the backend), and what the user picked has to survive the options list changing under
 *  it — so chosen entries are remembered here and merged back into the options. */
const RecipientSelect: React.FC<RecipientSelectProps> = ({ value, loading, onChange }) => {
  const [keyword, setKeyword] = useState('');
  const { entries, isSearching, enabled } = useDirectorySearch(useDebouncedValue(keyword));

  // Every option the field can currently show: what the search just returned, plus
  // everything already chosen. The chosen ones have to stay in the list — a value with no
  // matching option renders as its raw key, which is how recipients loaded from the
  // server first showed up as `ORG:INTD-1` instead of their name.
  const options = useMemo(() => {
    const byKey = new Map(value.map((entry) => [directoryEntryKey(entry), entry]));
    for (const entry of entries) {
      byKey.set(directoryEntryKey(entry), entry);
    }
    return [...byKey.entries()].map(([key, entry]) => ({
      value: key,
      label: directoryEntryLabel(entry),
      entry,
    }));
  }, [entries, value]);

  function handleChange(keys: string[]) {
    // Resolve the keys back to entries. The caller works in entries, not keys: the share
    // payload needs each one's kind and id, which only the entry carries.
    const known = new Map([...value, ...entries].map((entry) => [directoryEntryKey(entry), entry]));
    onChange(
      keys
        .map((key) => known.get(key))
        .filter((entry): entry is DirectoryEntry => entry !== undefined),
    );
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
        // Narrows on every field a row can be found by, not on the label: a person is as
        // findable by their org as by their name. The backend is searching too, but on
        // the debounced keyword — this is what answers the keystroke in between, and it
        // never hides a row the backend returned, because it looks at more than the
        // backend was given.
        filterOption: (input, option) =>
          option?.entry === undefined || directoryEntryMatches(option.entry, input),
        searchValue: keyword,
        onSearch: setKeyword,
      }}
      loading={isSearching || loading}
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
