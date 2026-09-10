import React, { useMemo, useState } from 'react';
import { App, Button, Input, Modal, Select } from 'antd';
import { CheckOutlined, CopyOutlined, FundOutlined, LinkOutlined } from '@ant-design/icons';

import { DIRECTORY_SEARCH_MIN_LENGTH } from '@/api/directoryApi';
import { useUpdateArtifactShares } from '@/hooks/useArtifactMutations';
import { useArtifactShares } from '@/hooks/useArtifactShares';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDirectorySearch } from '@/hooks/useDirectorySearch';
import { useTranslations } from '@/i18n/useTranslations';
import type { Artifact, DirectoryEntry, ShareTarget } from '@/types/api';
import { artifactHref } from '@/utils/artifactUrl';
import {
  directoryEntryKey,
  directoryEntryMatches,
  directoryEntryOptionText,
  directoryEntrySelectedName,
  directoryShareTarget,
  employeeAvatarUrl,
} from '@/utils/directoryEntry';

import styles from './ShareArtifactDialog.module.css';

interface ShareArtifactDialogProps {
  open: boolean;
  onClose: () => void;
  artifact: Artifact;
}

const ShareArtifactDialog: React.FC<ShareArtifactDialogProps> = ({ open, onClose, artifact }) => {
  const t = useTranslations();
  const { message } = App.useApp();
  const updateShares = useUpdateArtifactShares();
  const { shares, isLoading, isUnavailable } = useArtifactShares(artifact.id, open);

  const [copied, setCopied] = useState(false);
  const [edited, setEdited] = useState(false);
  const [recipients, setRecipients] = useState<DirectoryEntry[]>([]);

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
  const chosen = edited ? recipients : alreadyShared;
  const shareUrl = artifactHref(artifact.id);

  const handleChoose = (next: DirectoryEntry[]) => {
    setEdited(true);
    setRecipients(next);
  };

  const handleClose = () => {
    setEdited(false);
    onClose();
  };

  const handleConfirm = () => {
    const before = alreadyShared.map(directoryShareTarget);
    const after = chosen.map(directoryShareTarget);
    const key = (target: ShareTarget) => `${target.type}:${target.id}`;
    const beforeKeys = new Set(before.map(key));
    const afterKeys = new Set(after.map(key));
    const add = after.filter((target) => !beforeKeys.has(key(target)));
    const remove = before.filter((target) => !afterKeys.has(key(target)));

    updateShares.mutate(
      { id: artifact.id, update: { add, remove } },
      // Submitting is the end of the dialog: the recipient list was the thing being
      // edited, and once it is saved there is nothing left here to do.
      {
        onSuccess: () => {
          handleClose();
          // Closing is not proof that anything was saved. Submit is also the way out —
          // an unchanged list closes the dialog exactly the same way — and sharing is the
          // one action here whose outcome lands on other people: nothing behind this
          // dialog changes when it works, and the Gallery's Shared badge only knows
          // shared-at-all from not-shared-at-all. So the toast is the only thing that can
          // say who can see this now. `message.success?.` — outside `AppProviders`
          // (component tests) `useApp` answers with an empty object.
          if (add.length === 0 && remove.length === 0) {
            return;
          }
          message.success?.(after.length > 0 ? t.share.sharedWith(after.length) : t.share.sharingRemoved);
        },
      }
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Inside the try: the tick and the wording are the only confirmation a copy gets,
      // and they used to appear whether or not anything reached the clipboard. The link
      // stays visible and selectable in the field for copying by hand.
      setCopied(true);
    } catch {
      // Nothing to add — the field is right there, and it still holds the link.
    }
  };

  return (
    <Modal open={open} onCancel={handleClose} title={t.share.title} width={460} footer={null} destroyOnHidden>
      <p className={styles.subtitle}>{t.share.subtitle}</p>
      <div className={styles.infoCard} aria-label="Artifact details">
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
            {t.share.published}
          </span>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t.share.recipientsLabel}</div>
        <RecipientSelect value={chosen} loading={isLoading} disabled={isUnavailable} onChange={handleChoose} />
        {/* Editing is closed rather than the dialog: a delta built on a baseline nobody
            could read is not an edit the user meant to make. Submit stays pressable —
            it is also the way out, and an unchanged list sends an empty delta. */}
        <div className={isUnavailable ? styles.error : styles.hint}>
          {isUnavailable ? t.share.unavailable : t.share.recipientsHint}
        </div>
      </div>

      {/* Always here, not revealed by sharing. The link is the Artifact's address, not a
          reward for pressing a button — someone who opened this dialog only to copy it
          should not have to change the recipient list first. */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t.share.linkLabel}</div>
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
            {copied ? t.share.copied : t.share.copy}
          </Button>
        </div>
        {/* Styled as a hint, not as the green success banner it used to be: the link is
            here from the moment the dialog opens, so a panel announcing that something
            succeeded would be claiming it before anything had happened. */}
        <div className={styles.hint}>{t.share.linkHint}</div>
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
          {t.share.submit}
        </Button>
      </div>
    </Modal>
  );
};

/** A person's photo, or their initial when there is none to fetch. Round, because that is
 *  how a person is drawn everywhere else in the app and a square would read as a logo.
 *
 *  `onError` rather than a HEAD request: the photo host answers for most employees and
 *  not for some, and the only honest way to learn which is to ask for the image. */
const RecipientAvatar: React.FC<{ entry: DirectoryEntry }> = ({ entry }) => {
  const src = employeeAvatarUrl(entry.emplId);
  const [failed, setFailed] = useState(false);
  const name = directoryEntrySelectedName(entry);

  if (src === null || failed) {
    return (
      <span aria-hidden className={styles.recipientAvatarFallback}>
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      // Decorative: the name is right beside it, and a screen reader reading the same
      // person twice is noise.
      alt=""
      aria-hidden
      src={src}
      className={styles.recipientAvatar}
      onError={() => setFailed(true)}
    />
  );
};

interface RecipientSelectProps {
  /** The chosen entries themselves, not their keys: the share payload needs each one's
   *  type and id, which only the entry carries. */
  value: DirectoryEntry[];
  /** True while the existing share list is still being read. */
  loading: boolean;
  /** The existing list could not be read, so there is no baseline to edit against. */
  disabled: boolean;
  onChange: (entries: DirectoryEntry[]) => void;
}

/** The directory is the whole organisation, so this searches the backend rather than
 *  filtering a list it holds. Two consequences shape the field: nothing is offered until
 *  the key is long enough to narrow anything (`filterOption={false}` hands matching to
 *  the backend), and what the user picked has to survive the options list changing under
 *  it — so chosen entries are remembered here and merged back into the options. */
const RecipientSelect: React.FC<RecipientSelectProps> = ({ value, loading, disabled, onChange }) => {
  const t = useTranslations();

  // Two, not one. `typed` is what is in the box; `keyword` is what the list was built
  // from. They part company at the moment of a pick: the box empties so the next name can
  // be typed straight away, while the list stays exactly as it was — a list that collapsed
  // on every pick would make choosing three people three searches.
  const [typed, setTyped] = useState('');
  const [keyword, setKeyword] = useState('');

  // Below the state it feeds from, against the top-block rule: the search hook's input
  // is the debounced keyword, and a dependency is a hard constraint the grouping yields to.
  const { entries, isSearching, isError, enabled } = useDirectorySearch(useDebouncedValue(keyword));

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
      label: directoryEntrySelectedName(entry),
      entry,
    }));
  }, [entries, value]);

  const handleChange = (keys: string[]) => {
    // The box empties, the list does not: `keyword` is deliberately left where it is.
    setTyped('');
    // Resolve the keys back to entries. The caller works in entries, not keys: the share
    // payload needs each one's kind and id, which only the entry carries.
    const known = new Map([...value, ...entries].map((entry) => [directoryEntryKey(entry), entry]));
    onChange(keys.map((key) => known.get(key)).filter((entry): entry is DirectoryEntry => entry !== undefined));
  };

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
        filterOption: (input, option) => option?.entry === undefined || directoryEntryMatches(option.entry, input),
        searchValue: typed,
        onSearch: (input) => {
          setTyped(input);
          setKeyword(input);
        },
      }}
      loading={isSearching || loading}
      disabled={disabled}
      value={value.map(directoryEntryKey)}
      onChange={handleChange}
      options={options}
      optionRender={(option) => {
        const entry = (option.data as { entry?: DirectoryEntry }).entry;
        if (entry === undefined) {
          return option.label;
        }
        return (
          <span className={styles.recipientOption}>
            {entry.type === 'EMPLOYEE' && <RecipientAvatar entry={entry} />}
            {directoryEntryOptionText(entry)}
          </span>
        );
      }}
      // A row already chosen is a tag above the box; marking it in the list as well says
      // the same thing twice, and the tick reads as "this row is the current answer" on a
      // list whose whole job is offering the next one.
      menuItemSelectedIcon={null}
      classNames={{ popup: { root: styles.recipientPopup } }}
      notFoundContent={
        isSearching
          ? t.share.searching
          : isError
            ? // Before "no match": a failed search wearing that answer sends the user
              // off to re-check a spelling that was never the problem.
              t.share.searchFailed
            : enabled
              ? t.share.noMatch
              : t.share.minChars(DIRECTORY_SEARCH_MIN_LENGTH)
      }
      placeholder={t.share.searchPlaceholder(DIRECTORY_SEARCH_MIN_LENGTH)}
      style={{ width: '100%' }}
    />
  );
};

export default ShareArtifactDialog;
