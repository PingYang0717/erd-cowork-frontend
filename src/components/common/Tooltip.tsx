import React, { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import styles from './Tooltip.module.css';

const SHOW_DELAY_MS = 350;

/** Roughly the tip's own height plus its 6px offset. Below this much room above the
 *  trigger, the tip would be clipped by whatever pane it sits in. */
const SPACE_NEEDED_ABOVE = 34;

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
const Tooltip: React.FC<TooltipProps> = ({ content, children, wrapperClassName }) => {
  const [open, setOpen] = useState(false);
  const [below, setBelow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const show = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Flip below when there is no room above. Every toolbar in this app sits at the
      // top edge of a pane with `overflow: hidden`, so a tip that always opened upward
      // would be sliced off by the pane rather than shown.
      const top = wrapperRef.current?.getBoundingClientRect().top ?? SPACE_NEEDED_ABOVE;
      setBelow(top < SPACE_NEEDED_ABOVE);
      setOpen(true);
    }, SHOW_DELAY_MS);
  };
  const hide = () => {
    clearTimeout(timerRef.current);
    setOpen(false);
  };

  return (
    <span
      ref={wrapperRef}
      className={wrapperClassName ? `${styles.wrapper} ${wrapperClassName}` : styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          id={tipId}
          className={below ? `${styles.tip} ${styles.tipBelow}` : styles.tip}
        >
          {content}
        </span>
      )}
    </span>
  );
};

export default Tooltip;
