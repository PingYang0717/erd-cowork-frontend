import React from 'react';
import { EditOutlined, ReloadOutlined } from '@ant-design/icons';

import { useTranslations } from '@/i18n/useTranslations';

import styles from './StoppedActions.module.css';

interface StoppedActionsProps {
  /** Sends the same question again. */
  onRetry: () => void;
  /** Puts the question back in the composer, unsent. */
  onEdit: () => void;
}

/** What to do about a run that stopped.
 *
 *  Both actions APPEND a turn — neither replaces the one that stopped, and neither can:
 *  the backend has no messages endpoint (docs/api/interface.md), so nothing in a thread
 *  can be edited or removed. That is why the second one is "edit and resend" rather than
 *  "edit": it puts the words back in the box, and what follows is a new question with the
 *  old one still above it. Calling it an edit would claim a thing this app cannot do.
 */
const StoppedActions: React.FC<StoppedActionsProps> = ({ onRetry, onEdit }) => {
  const t = useTranslations();

  return (
    <div className={styles.row}>
      <button type="button" className={styles.action} aria-label="Retry" onClick={onRetry}>
        <ReloadOutlined aria-hidden />
        {t.chat.retryRun}
      </button>
      <button type="button" className={styles.action} aria-label="Edit and resend" onClick={onEdit}>
        <EditOutlined aria-hidden />
        {t.chat.editAndResend}
      </button>
    </div>
  );
};

export default StoppedActions;
