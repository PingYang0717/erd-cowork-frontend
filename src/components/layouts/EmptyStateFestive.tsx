import React from 'react';

import type { Festival } from '@/utils/festival';

import styles from './EmptyStateFestive.module.css';

/** The two empty panels' festive centrepiece (CONTEXT.md, 節慶裝飾): a porthole where the
 *  icon tile usually sits, with something living inside it, and — every so often — that
 *  something coming out.
 *
 *  The point is the coming out. A drawing with a little animation on it is a sticker with
 *  a tic; what makes this worth a second look is that the window is somewhere a creature
 *  lives, and that once in a while it leaves. It slips out through the ring, which rings
 *  behind it like struck glass, crosses the whole panel, passes the rule into the other
 *  panel, and goes in through that one's ring. Most of the time you get the quiet version,
 *  the scene inside drifting; the rest is worth catching.
 *
 *  Nothing is exchanged between the panels — they cannot see each other. Both run one long
 *  loop, and the right-hand panel's copy is offset by exactly the time the crossing takes,
 *  so the arrival lands where the departure left off.
 *
 *  Built for Lunar New Year first, deliberately: the feel is the hard part, and it is
 *  cheaper to get one right than four wrong. The other three follow the same skeleton —
 *  a ring, a scene clipped inside it, an inhabitant, one escape per loop.
 *
 *  Passes this replaced, recorded in ADR-0002: the rail's floor copied piece for piece, a
 *  mark breathing behind the words, a full-panel parallax scene, and trinkets hung on the
 *  icon tile.
 */

const INK = 'var(--erd-color-text, rgba(0, 0, 0, 0.88))';

/** The loop every part of this shares. Long on purpose: the escape is the payoff, and a
 *  payoff that comes round every ten seconds stops being one. */
const LOOP_S = 46;

/** How much of the loop the crossing takes, and therefore how far behind the left panel
 *  the right one runs. */
const CROSS_SHARE = 0.28;

/** Lunar New Year's koi, nose to the right, 40 × 20. The tail and the fins carry their own
 *  beats over the body's roll: a fish that moves in one piece is a fish-shaped card. */
const Koi: React.FC = () => (
  <g className={styles.koiBody}>
    <path className={styles.koiFinTop} d="M20 6.4q3-5 7.4-4.6-1.4 3.8-4.2 5.8z" fill="#f5a03c" opacity="0.85" />
    <path className={styles.koiTail} d="M12 10q-6-6-11.4-6.8 3.2 6.8 0 13.6Q6 16 12 10z" fill="#f5a03c" />
    <path d="M10 10q9-7.6 19-2.6 5 2.4 9 1-3 6.6-9 5.4Q19 18.6 10 10z" fill="#f28c28" />
    <path d="M17 5.6q6-1.6 10 1.4-5 2.8-10-1.4z" fill="#fff" opacity="0.8" />
    <path d="M19 14.6q6 2 10-.6-5-2.8-10 .6z" fill="#fff" opacity="0.55" />
    <path className={styles.koiFinLow} d="M21 13.4q1.6 4 5.2 4.6-.8-3.4-2.8-5.2z" fill="#f5a03c" opacity="0.8" />
    <circle cx="33.4" cy="8.6" r="1" fill="#2b2b33" />
    <path d="M35.6 10.6q2.8.6 3.8 2.6" fill="none" stroke="#f5a03c" strokeWidth="0.8" strokeLinecap="round" />
  </g>
);

/** What is behind the glass. There is no ring: the header's band has no frame either — it
 *  fades out at both ends with a mask — and a lacquered rim with a highlight on it is the
 *  vocabulary of an app icon, not of the picture this is supposed to belong to. So the
 *  scene simply stops being there towards its edge, and the only hard shape on screen
 *  stays the text.
 *
 *  Everything inside follows the header's rule: silhouettes take the text colour at low
 *  opacity, and only the near piece — the koi — carries the festival's own colours. */
const PortholeScene: React.FC<{ id: string }> = ({ id }) => (
  <>
    <defs>
      <radialGradient id={`${id}-fade`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff" stopOpacity="1" />
        <stop offset="62%" stopColor="#fff" stopOpacity="1" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <mask id={`${id}-glass`}>
        <rect width="120" height="120" fill={`url(#${id}-fade)`} />
      </mask>
      <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d8232a" stopOpacity="0.05" />
        <stop offset="70%" stopColor="#d8232a" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#c8282f" stopOpacity="0.16" />
      </linearGradient>
    </defs>

    <g mask={`url(#${id}-glass)`}>
      {/* the wash: the header's sky tint, in a circle instead of a band */}
      <circle cx="60" cy="60" r="58" fill={`url(#${id}-wash)`} />

      {/* the pond floor and what grows out of it, in silhouette like every far layer the
          header draws */}
      <path d="M0 74q30-10 60 0t60 0v50H0z" fill={INK} opacity="0.08" />
      <g fill={INK} opacity="0.12">
        <ellipse cx="26" cy="92" rx="15" ry="4.4" />
        <path d="M26 92l-4-7" stroke={INK} strokeWidth="1.2" fill="none" />
        <ellipse cx="92" cy="84" rx="11" ry="3.4" />
        <ellipse cx="74" cy="100" rx="13" ry="4" />
      </g>
      <g className={styles.ripples} fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" opacity="0.14">
        <path d="M16 84h16M46 90h20M80 78h14M34 104h18" />
      </g>

      {/* the ripple the koi leaves behind when it goes through — the one thing here that
          reacts to anything, and the reason the exit reads as an exit */}
      <circle className={styles.ring} cx="86" cy="52" r="10" fill="none" stroke={INK} strokeWidth="1.4" />

      {/* the inhabitant, circling — and gone from here for as long as it is out */}
      <g className={styles.resident}>
        <g transform="translate(24 46) scale(0.82)">
          <Koi />
        </g>
      </g>
    </g>
  </>
);

interface PanelProps {
  festival: Festival;
  /** Which panel this is. The left one's koi leaves; the right one's arrives. */
  panel: 'left' | 'right';
}

/** The phase this panel runs the shared loop at. */
const phaseOf = (panel: PanelProps['panel']): string => `${panel === 'left' ? 0 : -LOOP_S * CROSS_SHARE}s`;

/** The porthole, in the icon tile's place. Only Lunar New Year is drawn so far; the other
 *  festivals fall back to the panel's own icon until they are. */
export const EmptyPorthole: React.FC<PanelProps> = ({ festival, panel }) => {
  if (festival !== 'lunarNewYear') {
    return null;
  }

  return (
    <span
      className={styles.porthole}
      aria-hidden
      data-festive-porthole={panel}
      style={{ ['--loop' as string]: `${LOOP_S}s`, ['--phase' as string]: phaseOf(panel) }}
    >
      <svg viewBox="0 0 120 120" width="118" height="118" overflow="visible">
        <PortholeScene id={`ph-${panel}`} />
      </svg>
      {/* The escapee is anchored to the window rather than to the panel: the two panels'
          empty states sit at different heights (one has a header over it), and a koi that
          left one window at one height and arrived at the other at another would be two
          fish. The panel clips it — that is what makes it leave the screen. */}
      <span
        className={`${styles.escape} ${panel === 'left' ? styles.escapeOut : styles.escapeIn}`}
        data-festive-escape={panel}
      >
        <svg viewBox="0 0 40 20" width="56" height="28" overflow="visible">
          <Koi />
        </svg>
      </span>
    </span>
  );
};
