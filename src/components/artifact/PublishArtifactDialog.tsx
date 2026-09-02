import { Button, Input, Modal } from 'antd';
import React, { useState } from 'react';

import { useTranslations } from '@/i18n/useTranslations';

import styles from './PublishArtifactDialog.module.css';

interface PublishArtifactDialogProps {
  open: boolean;
  /** What the field starts on — the run's own name, as a suggestion to edit. */
  suggestedTitle: string;
  isPublishing: boolean;
  onCancel: () => void;
  onConfirm: (title: string) => void;
}

/** Asks for the name an Artifact goes on the shelf under.
 *
 *  Publishing is what puts a card in the Gallery, and the card is read by its title — so
 *  the title is the user's to write at that moment rather than inherited from whatever
 *  the run happened to be called. Required, because a card with no name is one nobody can
 *  find again.
 */
const PublishArtifactDialog: React.FC<PublishArtifactDialogProps> = ({
  open,
  suggestedTitle,
  isPublishing,
  onCancel,
  onConfirm,
}) => {
  const t = useTranslations();
  const [title, setTitle] = useState(suggestedTitle);
  // Reset to the suggestion each time it opens: a title abandoned last time should not
  // come back as the default for a different Artifact.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(suggestedTitle);
    }
  }

  const trimmed = title.trim();

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={t.artifact.publish}
      width={420}
      footer={null}
      destroyOnHidden
    >
      <p className={styles.subtitle}>{t.publishDialog.subtitle}</p>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="publish-artifact-title">
          {t.publishDialog.nameLabel}
        </label>
        <Input
          id="publish-artifact-title"
          value={title}
          maxLength={80}
          placeholder={t.publishDialog.namePlaceholder}
          onChange={(event) => setTitle(event.target.value)}
          onPressEnter={() => trimmed && onConfirm(trimmed)}
        />
        <div className={styles.hint}>{t.publishDialog.nameHint}</div>
      </div>
      <div className={styles.actions}>
        <Button autoInsertSpace={false} onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button
          type="primary"
          autoInsertSpace={false}
          disabled={trimmed === ''}
          loading={isPublishing}
          onClick={() => onConfirm(trimmed)}
        >
          {t.publishDialog.publish}
        </Button>
      </div>
    </Modal>
  );
};

export default PublishArtifactDialog;
