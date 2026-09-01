import { Button, Input, Modal } from 'antd';
import React, { useState } from 'react';

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
      title="發布 Artifact"
      width={420}
      footer={null}
      destroyOnHidden
    >
      <p className={styles.subtitle}>發布後會出現在 Artifacts 清單,並可分享給團隊檢視。</p>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="publish-artifact-title">
          名稱
        </label>
        <Input
          id="publish-artifact-title"
          value={title}
          maxLength={80}
          placeholder="例如:8 月 A14 良率追蹤"
          onChange={(event) => setTitle(event.target.value)}
          onPressEnter={() => trimmed && onConfirm(trimmed)}
        />
        <div className={styles.hint}>清單上就是用這個名稱找到它。</div>
      </div>
      <div className={styles.actions}>
        <Button autoInsertSpace={false} onClick={onCancel}>
          取消
        </Button>
        <Button
          type="primary"
          autoInsertSpace={false}
          disabled={trimmed === ''}
          loading={isPublishing}
          onClick={() => onConfirm(trimmed)}
        >
          發布
        </Button>
      </div>
    </Modal>
  );
};

export default PublishArtifactDialog;
