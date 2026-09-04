import React from 'react';
import { LoadingOutlined } from '@ant-design/icons';

import { useTranslations } from '@/i18n/useTranslations';
import type { RepairOffer } from '@/stores/useRepairOfferStore';

import styles from './RepairOfferCard.module.css';

const MAX_MESSAGE = 120;

interface RepairOfferCardProps {
  offer: RepairOffer;
  onConfirm: () => void;
  onDismiss: () => void;
}

/** Offers to rebuild an artifact whose HTML threw while running. It sits in the thread
 *  rather than the Artifact pane because repairing is something the agent does, and the
 *  thread is where the agent's work is. */
const RepairOfferCard: React.FC<RepairOfferCardProps> = ({ offer, onConfirm, onDismiss }) => {
  const t = useTranslations();
  const firstMessage = offer.errors[0]?.message ?? '';
  const shown = firstMessage.length > MAX_MESSAGE ? `${firstMessage.slice(0, MAX_MESSAGE)}…` : firstMessage;

  return (
    <div className={styles.card}>
      <p className={styles.heading}>{t.repair.detected(offer.errors.length)}</p>
      {shown && <p className={styles.message}>{shown}</p>}

      {offer.status === 'pending' && (
        <div className={styles.actions}>
          <button type="button" className={styles.confirm} onClick={onConfirm}>
            {t.repair.repair}
          </button>
          <button type="button" className={styles.dismiss} onClick={onDismiss}>
            {t.repair.ignore}
          </button>
        </div>
      )}

      {offer.status === 'repairing' && (
        <p className={styles.progress}>
          <LoadingOutlined aria-hidden spin />
          {t.repair.repairing}
        </p>
      )}

      {offer.status === 'files-expired' && (
        <div className={styles.actions}>
          <span className={styles.failed}>{t.repair.filesExpired}</span>
          <button type="button" className={styles.dismiss} onClick={onDismiss}>
            {t.common.gotIt}
          </button>
        </div>
      )}

      {offer.status === 'failed' && (
        <div className={styles.actions}>
          <span className={styles.failed}>
            {t.repair.failed}
            {offer.failureMessage !== undefined && ` — ${offer.failureMessage}`}
          </span>
          <button type="button" className={styles.confirm} onClick={onConfirm}>
            {t.repair.tryAgain}
          </button>
          <button type="button" className={styles.dismiss} onClick={onDismiss}>
            {t.repair.ignore}
          </button>
        </div>
      )}
    </div>
  );
};

export default RepairOfferCard;
