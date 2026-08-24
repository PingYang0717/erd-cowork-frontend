import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import styles from './Tooltip.module.css';

const SHOW_DELAY_MS = 350;

interface TooltipProps {
  content: string;
  children: ReactNode;
  /** Extra class for the inline wrapper, for when it participates in a flex row. */
  wrapperClassName?: string;
}

/**
 * The mockup's `.erd-tip` tooltip: dark inverted surface that fades in after
 * a 0.35s hover/focus delay. Wraps its trigger in an inline container that
 * owns the hover/focus tracking, so the trigger element needs no extra props.
 */
export function Tooltip({ content, children, wrapperClassName }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tipId = useId();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const show = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
  };
  const hide = () => {
    clearTimeout(timerRef.current);
    setOpen(false);
  };

  return (
    <span
      className={wrapperClassName ? `${styles.wrapper} ${wrapperClassName}` : styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && (
        <span role="tooltip" id={tipId} className={styles.tip}>
          {content}
        </span>
      )}
    </span>
  );
}
