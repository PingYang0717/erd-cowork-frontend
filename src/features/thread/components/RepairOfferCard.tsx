import { LoadingOutlined } from '@ant-design/icons';

import type { RepairOffer } from '@/features/artifact/store/useRepairOfferStore';

import styles from './RepairOfferCard.module.css';

const MAX_MESSAGE = 120;

/** Offers to rebuild an artifact whose HTML threw while running. It sits in the thread
 *  rather than the Artifact pane because repairing is something the agent does, and the
 *  thread is where the agent's work is. */
export function RepairOfferCard({
  offer,
  onConfirm,
  onDismiss,
}: {
  offer: RepairOffer;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const firstMessage = offer.errors[0]?.message ?? '';
  const shown =
    firstMessage.length > MAX_MESSAGE ? `${firstMessage.slice(0, MAX_MESSAGE)}…` : firstMessage;

  return (
    <div className={styles.card}>
      <p className={styles.heading}>⚠ 偵測到儀表板執行錯誤（{offer.errors.length} 個）</p>
      {shown && <p className={styles.message}>{shown}</p>}

      {offer.status === 'pending' && (
        <div className={styles.actions}>
          <button type="button" className={styles.confirm} onClick={onConfirm}>
            修復
          </button>
          <button type="button" className={styles.dismiss} onClick={onDismiss}>
            忽略
          </button>
        </div>
      )}

      {offer.status === 'repairing' && (
        <p className={styles.progress}>
          <LoadingOutlined aria-hidden spin />
          修復中，請稍候…
        </p>
      )}

      {offer.status === 'failed' && (
        <div className={styles.actions}>
          <span className={styles.failed}>修復未成功</span>
          <button type="button" className={styles.confirm} onClick={onConfirm}>
            再試一次
          </button>
          <button type="button" className={styles.dismiss} onClick={onDismiss}>
            忽略
          </button>
        </div>
      )}
    </div>
  );
}
