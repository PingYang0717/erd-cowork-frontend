import React, { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import styles from './Tooltip.module.css';

const SHOW_DELAY_MS = 350;

/** Roughly the tip's own height plus its 6px offset. Below this much room above the
 *  trigger, the tip would be clipped by whatever pane it sits in. */
const SPACE_NEEDED_ABOVE = 34;

/** The top edge the tip must stay under: the nearest ancestor that clips its overflow,
 *  or the viewport when nothing does. Every pane in the Studio clips (`overflow: hidden`
 *  on the columns), and the Artifact toolbar's pane starts right under the 56px header —
 *  so measured from the viewport there was "room" above the buttons, and the tip opened
 *  upward into a strip the pane sliced off. It looked like the header covering it. */
const clippingTop = (element: HTMLElement): number => {
  for (let node = element.parentElement; node !== null && node !== document.body; node = node.parentElement) {
    const { overflow, overflowX, overflowY } = getComputedStyle(node);
    if ([overflow, overflowX, overflowY].some((value) => value !== '' && value !== 'visible')) {
      return node.getBoundingClientRect().top;
    }
  }
  return 0;
};

interface TooltipProps {
  content: string;
  children: ReactNode;
  /** Extra class for the inline wrapper, for when it participates in a flex row. */
  wrapperClassName?: string;
}

/**
 * The mockup's `.erd-tip` tooltip: dark inverted surface that fades in after a 0.35s
 * hover delay — hover only: focus shows it immediately, because a keyboard user has
 * already committed to the control and the delay is a pointer affordance (ADR-0014 §tooltip-focus).
 *
 * Wraps its trigger in an inline container that owns the hover/focus tracking. When
 * the child is a single element, the open tip is wired to it with `aria-describedby`
 * — the `tipId` existed for exactly this and was connected to nothing, so the content
 * was never announced.
 */
const Tooltip: React.FC<TooltipProps> = ({ content, children, wrapperClassName }) => {
  const tipId = useId();

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [open, setOpen] = useState(false);
  const [below, setBelow] = useState(false);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const reveal = () => {
    // Flip below when there is no room above. Every toolbar in this app sits at the
    // top edge of a pane with `overflow: hidden`, so a tip that always opened upward
    // would be sliced off by the pane rather than shown.
    const wrapper = wrapperRef.current;
    const room = wrapper ? wrapper.getBoundingClientRect().top - clippingTop(wrapper) : SPACE_NEEDED_ABOVE;
    setBelow(room < SPACE_NEEDED_ABOVE);
    setOpen(true);
  };
  const showDelayed = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(reveal, SHOW_DELAY_MS);
  };
  const showNow = () => {
    clearTimeout(timerRef.current);
    reveal();
  };
  const hide = () => {
    clearTimeout(timerRef.current);
    setOpen(false);
  };

  // The describedby has to sit on the trigger itself — readers resolve it from the
  // focused element, not from an ancestor span. Only a single element child can carry
  // it; anything else keeps the old behaviour (visible, unannounced).
  const describedChild = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<{ 'aria-describedby'?: string }>, {
        'aria-describedby': open ? tipId : undefined,
      })
    : children;

  return (
    <span
      ref={wrapperRef}
      className={wrapperClassName ? `${styles.wrapper} ${wrapperClassName}` : styles.wrapper}
      onMouseEnter={showDelayed}
      onMouseLeave={hide}
      onFocus={showNow}
      onBlur={hide}
    >
      {describedChild}
      {open && (
        <span role="tooltip" id={tipId} className={below ? `${styles.tip} ${styles.tipBelow}` : styles.tip}>
          {content}
        </span>
      )}
    </span>
  );
};

export default Tooltip;
