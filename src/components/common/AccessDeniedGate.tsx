import React, { type ReactNode } from 'react';
import { StopOutlined } from '@ant-design/icons';

import { useTranslations } from '@/i18n/useTranslations';
import { useAccessDeniedStore } from '@/stores/useAccessDeniedStore';

import styles from './AccessDeniedGate.module.css';

interface AccessDeniedGateProps {
  children: ReactNode;
}

/** Stops the app when the account is refused.
 *
 *  An overlay rather than a route: the URL stays on the page the user was reading, which
 *  makes a reload the way back — it asks the backend again, so an entitlement granted in
 *  the meantime simply takes effect. A route would have needed the refusal carried in
 *  navigation state, which a reload throws away, leaving an icon over an empty page.
 *
 *  No dismiss. Closing it would return the user to a screen whose every request is refused
 *  for the same reason, which only defers this message behind a few more failures.
 *
 *  The backend's own sentence is the whole message. `ACCESS_DENIED` and
 *  `ENTITLEMENT_DENIED` need different things done about them — ask the resource owner,
 *  or apply for the entitlement — and the backend is the only party that knows which
 *  resource or which entitlement. This client has no copy that could say it.
 */
const AccessDeniedGate: React.FC<AccessDeniedGateProps> = ({ children }) => {
  const denial = useAccessDeniedStore((state) => state.denial);
  const t = useTranslations();

  return (
    <>
      {children}
      {denial !== null && (
        <div role="alert" aria-label="Access denied" className={styles.overlay}>
          <StopOutlined className={styles.icon} aria-hidden />
          <p className={styles.message}>{denial.message || t.errors.accessDeniedFallback}</p>
        </div>
      )}
    </>
  );
};

export default AccessDeniedGate;
