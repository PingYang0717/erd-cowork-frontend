import React, { useCallback, useRef, useState } from 'react';
import { Popover } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ThunderboltFilled } from '@ant-design/icons';

import { useUserInfo } from '@/hooks/useUserInfo';
import UserAvatar from './UserAvatar';
import UserMenu from './UserMenu';

import styles from './AppHeader.module.css';

/** The bar above every route: the brand on the left, the account entry on the right.
 *
 *  Above the shell rather than inside it. The single-Artifact view is a route of its own
 *  with no session rail (`app/router.tsx`), and it needs the brand and the account entry
 *  as much as any other screen — one header over both is also one layout to keep, rather
 *  than a full-width bar on one route and an inset one on the other.
 *
 *  It renders unconditionally and depends on no request succeeding. That is what lets the
 *  failure card below it drop its own settings entry: whatever fails, the way to change
 *  language is still on screen.
 *
 *  **Styling is interim.** The mockup has no header yet, and ADR-0002 makes the mockup the
 *  visual authority for everything but the chat panel. This follows Claude Desktop's shell
 *  until the mockup gains one, and aligns to it then. */
const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const user = useUserInfo();

  const triggerRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);

  /** Escape closes and puts focus back on the opener (ADR-0014 §dialog-focus). */
  const dismiss = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  /** The trigger carries it too, not only the panel. Opening a Popover by click leaves the
   *  focus on the trigger — antd does not move it into the content — so a key pressed then
   *  never reaches the panel's own handler, and Escape did nothing at all. */
  const handleTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        dismiss();
      }
    },
    [dismiss, open]
  );

  return (
    /* Named because the thread already claims a `banner` landmark of its own — two
       unlabelled ones would be indistinguishable to anyone navigating by landmark. */
    <header aria-label="App header" className={styles.header}>
      <button type="button" className={styles.brand} onClick={() => navigate('/cowork')}>
        <ThunderboltFilled aria-hidden className={styles.brandIcon} />
        eRD Cowork
      </button>

      <div className={styles.spacer} />

      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement="bottomRight"
        arrow={false}
        // Gone from the document when closed, not merely hidden. antd keeps a popover's
        // content mounted after its first open — the menu would sit in the tree for the
        // rest of the session, and "is it closed?" would have no honest answer.
        destroyOnHidden
        content={<UserMenu name={user?.employeeName} department={user?.employeeOrgName} onDismiss={dismiss} />}
      >
        {/* A fixed English label rather than the reader's name: `aria-label`s stay out of
            the dictionary (ADR-0012), and a name that arrives late would rename the
            control under anyone already reading it. */}
        <button
          ref={triggerRef}
          type="button"
          aria-label="Account"
          // The trigger opens a panel and a reader has to hear that, the same contract
          // every other trigger in this app keeps (ADR-0014 §menu-keyboard). antd's
          // Popover adds nothing to a custom child, so the button says it itself.
          aria-haspopup="dialog"
          aria-expanded={open}
          className={styles.avatar}
          onKeyDown={handleTriggerKeyDown}
        >
          <UserAvatar name={user?.employeeName} src={user?.avatarUrl} />
        </button>
      </Popover>
    </header>
  );
};

export default AppHeader;
