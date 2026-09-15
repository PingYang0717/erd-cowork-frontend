import React from 'react';

import type { Festival } from '@/utils/festival';

import styles from './FestiveDecoration.module.css';

/** What the middle of the header shows during a festival: a small scene of hand-drawn
 *  figures spread across the width, each moving on its own slow loop. Decoration and
 *  nothing else — `aria-hidden`, no pointer events, no copy — so it neither reads nor
 *  gets in the way.
 *
 *  Drawn with gradients and soft glows rather than flat fills, so at header size the
 *  figures read as objects with volume instead of stickers. The colours are the
 *  festival's own (a moon is yellow in both themes); only the bats, the spider's thread
 *  and the clouds borrow theme tokens so they stay visible on a dark header.
 *
 *  Figures are placed by percentage of the stage width, so a wide window spreads them
 *  out and a narrow one gathers them; nothing is ever taller than the 56px bar. Gradient
 *  ids are fixed: two figures sharing one are drawn identically, so the collision is
 *  harmless. */
interface FestiveDecorationProps {
  festival: Festival;
}

interface PlacedProps {
  /** Horizontal position, as a percentage of the stage width. */
  at: number;
  /** Vertical anchor, in px from the top of the bar. */
  top?: number;
  className?: string;
  children: React.ReactNode;
}

/** Puts a figure at a point on the stage; the motion class goes on the inner element so
 *  the placement and the animation never fight over `transform`. */
const Placed: React.FC<PlacedProps> = ({ at, top = 8, className, children }) => (
  <span className={styles.slot} style={{ left: `${at}%`, top }}>
    <span className={className}>{children}</span>
  </span>
);

/* ---------- Mid-Autumn ---------- */

const Moon: React.FC = () => (
  <svg viewBox="0 0 64 64" width="56" height="56">
    <defs>
      <radialGradient id="fd-moon-halo" cx="50%" cy="50%" r="50%">
        <stop offset="45%" stopColor="#f6d365" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#f6d365" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="fd-moon" cx="38%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#fff6c7" />
        <stop offset="55%" stopColor="#f8dc7a" />
        <stop offset="100%" stopColor="#e3b64a" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="32" fill="url(#fd-moon-halo)" />
    <circle cx="32" cy="32" r="19" fill="url(#fd-moon)" />
    <g fill="#d9a83f" opacity="0.35">
      <circle cx="25" cy="26" r="3.2" />
      <circle cx="38" cy="36" r="4.6" />
      <circle cx="28" cy="41" r="2" />
      <circle cx="40" cy="24" r="1.6" />
    </g>
  </svg>
);

const Sparkle: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 12 12" width={size} height={size}>
    <path d="M6 0c.5 3.5 2.5 5.5 6 6-3.5.5-5.5 2.5-6 6-.5-3.5-2.5-5.5-6-6 3.5-.5 5.5-2.5 6-6z" fill="#f8dc7a" />
  </svg>
);

const Lantern: React.FC = () => (
  <svg viewBox="0 0 24 44" width="22" height="40">
    <defs>
      <linearGradient id="fd-lantern" x1="0" x2="1">
        <stop offset="0%" stopColor="#ff7b7b" />
        <stop offset="50%" stopColor="#e63946" />
        <stop offset="100%" stopColor="#b8202c" />
      </linearGradient>
    </defs>
    <path d="M12 0v5" stroke="#c9a04a" strokeWidth="1.2" />
    <rect x="7" y="5" width="10" height="3.5" rx="1.5" fill="#e6c168" />
    <ellipse cx="12" cy="20" rx="10.5" ry="11.5" fill="url(#fd-lantern)" />
    <g fill="none" stroke="#ffd6d6" strokeWidth="0.8" opacity="0.7">
      <ellipse cx="12" cy="20" rx="4" ry="11.5" />
      <ellipse cx="12" cy="20" rx="7.5" ry="11.5" />
    </g>
    <rect x="7" y="31" width="10" height="3.5" rx="1.5" fill="#e6c168" />
    <path d="M10 34.5v6.5M12 34.5v8M14 34.5v6.5" stroke="#e6c168" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

/** A translucent fill from the theme rather than a colour of its own: a white cloud
 *  vanished on the light header and turned to a black blob on the dark one. */
const Cloud: React.FC<{ width: number; faint?: boolean }> = ({ width, faint = false }) => (
  <svg viewBox="0 0 60 22" width={width} height={(width * 22) / 60} opacity={faint ? 0.6 : 1}>
    <path
      d="M8 20H52A6.5 6.5 0 0 0 49 7.5A11 11 0 0 0 28 5A8.5 8.5 0 0 0 8 20Z"
      fill="var(--erd-color-fill-tertiary, rgba(0, 0, 0, 0.04))"
      stroke="var(--erd-color-border, #d9d9d9)"
      strokeWidth="0.8"
    />
  </svg>
);

const Rabbit: React.FC = () => (
  <svg viewBox="0 0 30 34" width="26" height="30">
    <defs>
      <linearGradient id="fd-rabbit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e6e6ec" />
      </linearGradient>
    </defs>
    <g stroke="#cfcfd8" strokeWidth="0.8">
      <path d="M9 18c-3-6-3-13 0-16 2 0 3.5 6 3.5 14z" fill="url(#fd-rabbit)" />
      <path d="M21 18c3-6 3-13 0-16-2 0-3.5 6-3.5 14z" fill="url(#fd-rabbit)" />
      <ellipse cx="15" cy="24" rx="11" ry="9" fill="url(#fd-rabbit)" />
    </g>
    <path d="M9.6 15c-1.4-4-1.4-8.5 0-10.5.9 1.5 1.4 5.5 1.2 10z" fill="#f6c1cf" />
    <path d="M20.4 15c1.4-4 1.4-8.5 0-10.5-.9 1.5-1.4 5.5-1.2 10z" fill="#f6c1cf" />
    <circle cx="11" cy="22" r="1.2" fill="#3b3b46" />
    <circle cx="19" cy="22" r="1.2" fill="#3b3b46" />
    <ellipse cx="15" cy="25.5" rx="1.5" ry="1" fill="#f0a5b8" />
    <path d="M13 27q2 1.5 4 0" fill="none" stroke="#c98d9c" strokeWidth="0.8" strokeLinecap="round" />
  </svg>
);

const MidAutumn: React.FC = () => (
  <>
    <Placed at={3} top={10} className={styles.sway}>
      <Lantern />
    </Placed>
    <Placed at={12} top={12} className={styles.twinkle}>
      <Sparkle size={9} />
    </Placed>
    <Placed at={20} top={30} className={styles.twinkleLate}>
      <Sparkle size={6} />
    </Placed>
    <Placed at={27} top={20} className={styles.driftSlow}>
      <Cloud width={58} faint />
    </Placed>
    <Placed at={45} top={0} className={styles.breathe}>
      <Moon />
    </Placed>
    <Placed at={60} top={24} className={styles.hop}>
      <Rabbit />
    </Placed>
    <Placed at={66} top={34} className={styles.twinkle}>
      <Sparkle size={7} />
    </Placed>
    <Placed at={73} top={8} className={styles.driftSlowLate}>
      <Cloud width={48} />
    </Placed>
    <Placed at={85} top={18} className={styles.twinkleLate}>
      <Sparkle size={8} />
    </Placed>
    <Placed at={92} top={10} className={styles.swayLate}>
      <Lantern />
    </Placed>
  </>
);

/* ---------- Halloween ---------- */

const Bat: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 48 22" width={size} height={(size * 22) / 48}>
    <path
      d="M24 6c-1.2-2.4-3-3.6-3-3.6l.6 3.2c-3.6-4.2-9.6-4.8-15-1.2C3.4 6.4 1 9.6 0 12.4c3.2-1.6 6-1.4 8.2.4-1 2.2-1 4.2-.2 6.4 2.2-2 4.6-2.6 7.2-1.8.4 2 1.6 3.4 3.6 4.2.8-1.6 2.4-2.8 5.2-3.4 2.8.6 4.4 1.8 5.2 3.4 2-.8 3.2-2.2 3.6-4.2 2.6-.8 5 -.2 7.2 1.8.8-2.2.8-4.2-.2-6.4 2.2-1.8 5-2 8.2-.4-1-2.8-3.4-6-6.6-8-5.4-3.6-11.4-3-15 1.2l.6-3.2s-1.8 1.2-3 3.6z"
      fill="var(--erd-color-text, rgba(0, 0, 0, 0.88))"
    />
  </svg>
);

const JackOLantern: React.FC<{ size: number; glowClass: string }> = ({ size, glowClass }) => (
  <svg viewBox="0 0 44 44" width={size} height={size}>
    <defs>
      <radialGradient id="fd-pumpkin" cx="38%" cy="32%" r="75%">
        <stop offset="0%" stopColor="#ffb457" />
        <stop offset="60%" stopColor="#f28c28" />
        <stop offset="100%" stopColor="#c8621a" />
      </radialGradient>
      <filter id="fd-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.4" />
      </filter>
    </defs>
    <path d="M20 4c1-2.5 3.5-3 5.5-1.5L25 11h-5z" fill="#5f8f3e" />
    <ellipse cx="22" cy="26" rx="20" ry="16" fill="url(#fd-pumpkin)" />
    <g fill="none" stroke="#b9571a" strokeWidth="1.2" opacity="0.6">
      <ellipse cx="11" cy="26" rx="7" ry="15.5" />
      <ellipse cx="33" cy="26" rx="7" ry="15.5" />
      <ellipse cx="22" cy="26" rx="3.5" ry="16" />
    </g>
    <g className={glowClass}>
      <g fill="#ffd166" filter="url(#fd-glow)" opacity="0.8">
        <path d="M11 22l6 6H6z" />
        <path d="M33 22l6 6h-12z" />
        <path d="M9 31q13 10 26 0l-3 3.5h-3.5l-2 2.5-2-2.5h-5l-2 2.5-2-2.5H12z" />
      </g>
      <g fill="#fff0b8">
        <path d="M11 22l6 6H6z" />
        <path d="M33 22l6 6h-12z" />
        <path d="M9 31q13 10 26 0l-3 3.5h-3.5l-2 2.5-2-2.5h-5l-2 2.5-2-2.5H12z" />
      </g>
    </g>
  </svg>
);

const Ghost: React.FC = () => (
  <svg viewBox="0 0 32 40" width="30" height="38">
    <defs>
      <linearGradient id="fd-ghost" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e4e4ee" />
      </linearGradient>
    </defs>
    <path
      d="M4 38V16a12 12 0 0 1 24 0v22c-2-2.4-4-2.4-6 0-2-2.4-4-2.4-6 0-2-2.4-4-2.4-6 0-2-2.4-4-2.4-6 0z"
      fill="url(#fd-ghost)"
      stroke="#cfcfdd"
      strokeWidth="0.8"
    />
    <ellipse cx="11.5" cy="16" rx="2" ry="2.6" fill="#3b3b46" />
    <ellipse cx="20.5" cy="16" rx="2" ry="2.6" fill="#3b3b46" />
    <ellipse cx="16" cy="23" rx="2" ry="2.8" fill="#3b3b46" />
    <circle cx="9" cy="21" r="1.6" fill="#f6c1cf" opacity="0.8" />
    <circle cx="23" cy="21" r="1.6" fill="#f6c1cf" opacity="0.8" />
  </svg>
);

const Spider: React.FC = () => (
  <svg viewBox="0 0 22 46" width="22" height="46">
    <path d="M11 0v26" stroke="var(--erd-color-text, rgba(0, 0, 0, 0.88))" strokeWidth="0.8" opacity="0.5" />
    <g stroke="#2b2b33" strokeWidth="1.3" strokeLinecap="round" fill="none">
      <path d="M6 33c-2-1-3.5-3-4-5M16 33c2-1 3.5-3 4-5M5 37c-2 0-3.5 0-5 0M17 37c2 0 3.5 0 5 0M6 41c-2 1-3 2.5-4 4M16 41c2 1 3 2.5 4 4" />
    </g>
    <circle cx="11" cy="30" r="3" fill="#2b2b33" />
    <circle cx="11" cy="37.5" r="5.5" fill="#2b2b33" />
    <circle cx="9.4" cy="36" r="1.1" fill="#fff" />
    <circle cx="12.6" cy="36" r="1.1" fill="#fff" />
    <circle cx="9.7" cy="36.2" r="0.5" fill="#2b2b33" />
    <circle cx="12.9" cy="36.2" r="0.5" fill="#2b2b33" />
  </svg>
);

const Halloween: React.FC = () => (
  <>
    <Placed at={3} top={12} className={styles.flyRight}>
      <Bat size={34} />
    </Placed>
    <Placed at={17} top={10} className={styles.bob}>
      <JackOLantern size={40} glowClass={styles.glowPulse} />
    </Placed>
    <Placed at={33} top={0} className={styles.dangle}>
      <Spider />
    </Placed>
    <Placed at={46} top={6} className={styles.flyLeft}>
      <Bat size={26} />
    </Placed>
    <Placed at={58} top={8} className={styles.haunt}>
      <Ghost />
    </Placed>
    <Placed at={73} top={16} className={styles.bobLate}>
      <JackOLantern size={32} glowClass={styles.glowPulseLate} />
    </Placed>
    <Placed at={88} top={24} className={styles.flyRightLate}>
      <Bat size={30} />
    </Placed>
  </>
);

/* ---------- Christmas ---------- */

const Snowflake: React.FC<{ size: number; soft?: boolean }> = ({ size, soft = false }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} opacity={soft ? 0.5 : 0.9}>
    <g stroke="#a9d6f5" strokeWidth="1.4" strokeLinecap="round" fill="none">
      <path d="M10 1.5v17M2.6 5.75l14.8 8.5M2.6 14.25l14.8-8.5" />
      <path d="M10 1.5l-2.2 2.2M10 1.5l2.2 2.2M10 18.5l-2.2-2.2M10 18.5l2.2-2.2" />
      <path d="M2.6 5.75l.8 3M2.6 5.75l3-.8M17.4 14.25l-.8-3M17.4 14.25l-3 .8" />
      <path d="M2.6 14.25l3 .8M2.6 14.25l.8-3M17.4 5.75l-3-.8M17.4 5.75l-.8 3" />
    </g>
    <circle cx="10" cy="10" r="1.6" fill="#d7ecfb" />
  </svg>
);

const Tree: React.FC = () => (
  <svg viewBox="0 0 44 54" width="42" height="52">
    <defs>
      <linearGradient id="fd-tier" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#5cc282" />
        <stop offset="100%" stopColor="#2a7a47" />
      </linearGradient>
      <filter id="fd-light" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
    </defs>
    <path
      d="M22 2l2.7 5.6 6.2.8-4.5 4.3 1.2 6.1L22 15.9l-5.6 2.9 1.2-6.1-4.5-4.3 6.2-.8z"
      fill="#f8dc7a"
      stroke="#e3b64a"
      strokeWidth="0.6"
    />
    <path d="M22 11l11 14H11z" fill="url(#fd-tier)" />
    <path d="M22 20l14 16H8z" fill="url(#fd-tier)" />
    <path d="M22 30l17 18H5z" fill="url(#fd-tier)" />
    <path d="M9 47q13 5 26 0" fill="none" stroke="#1f5f36" strokeWidth="1" opacity="0.5" />
    <rect x="18" y="47" width="8" height="7" rx="1" fill="#8a5a2b" />
    {(
      [
        [17, 24, '#ff5c5c', styles.twinkle],
        [27, 31, '#f8dc7a', styles.twinkleLate],
        [13, 41, '#5eaefc', styles.twinkle],
        [30, 43, '#ff5c5c', styles.twinkleLate],
        [22, 37, '#f8dc7a', styles.twinkleLate],
        [21, 20, '#5eaefc', styles.twinkle],
      ] as const
    ).map(([x, y, color, cls]) => (
      <g key={`${x}-${y}`} className={cls}>
        <circle cx={x} cy={y} r="3.2" fill={color} opacity="0.6" filter="url(#fd-light)" />
        <circle cx={x} cy={y} r="1.6" fill={color} />
      </g>
    ))}
  </svg>
);

const Gift: React.FC = () => (
  <svg viewBox="0 0 32 28" width="26" height="23">
    <defs>
      <linearGradient id="fd-gift" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff6b6b" />
        <stop offset="100%" stopColor="#c62f3a" />
      </linearGradient>
    </defs>
    <rect x="2" y="10" width="28" height="17" rx="2.5" fill="url(#fd-gift)" />
    <rect x="1" y="7" width="30" height="6.5" rx="2" fill="#d63a45" />
    <rect x="13" y="7" width="6" height="20" fill="#f8dc7a" />
    <rect x="1" y="7" width="30" height="6.5" rx="2" fill="none" stroke="#b02832" strokeWidth="0.6" opacity="0.6" />
    <path d="M16 7c-5-6-8-4-6 0M16 7c5-6 8-4 6 0" fill="none" stroke="#f8dc7a" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="16" cy="7" r="1.6" fill="#f3c94f" />
  </svg>
);

const CandyCane: React.FC = () => (
  <svg viewBox="0 0 22 44" width="18" height="36">
    {/* Edge first, then the white body, then the red stripes on top. */}
    <path d="M6 42V13a7 7 0 0 1 14 0" fill="none" stroke="#c9c9d2" strokeWidth="7.6" strokeLinecap="round" />
    <path d="M6 42V13a7 7 0 0 1 14 0" fill="none" stroke="#fff" strokeWidth="6.2" strokeLinecap="round" />
    <path d="M6 42V13a7 7 0 0 1 14 0" fill="none" stroke="#e5484d" strokeWidth="6.2" strokeLinecap="round" strokeDasharray="4 4" />
  </svg>
);

const FLAKES: Array<{ at: number; size: number; className: string; soft?: boolean }> = [
  { at: 2, size: 12, className: styles.fall },
  { at: 9, size: 7, className: styles.fallLate, soft: true },
  { at: 16, size: 10, className: styles.fallLater },
  { at: 24, size: 6, className: styles.fall, soft: true },
  { at: 41, size: 9, className: styles.fallLate },
  { at: 52, size: 13, className: styles.fall },
  { at: 60, size: 7, className: styles.fallLater, soft: true },
  { at: 78, size: 11, className: styles.fallLate },
  { at: 86, size: 6, className: styles.fallLater, soft: true },
  { at: 93, size: 9, className: styles.fall },
];

const Christmas: React.FC = () => (
  <>
    {FLAKES.map((flake) => (
      <Placed key={flake.at} at={flake.at} top={-16} className={flake.className}>
        <Snowflake size={flake.size} soft={flake.soft} />
      </Placed>
    ))}
    <Placed at={30} top={3} className={styles.bob}>
      <Tree />
    </Placed>
    <Placed at={44} top={30} className={styles.bobLate}>
      <Gift />
    </Placed>
    <Placed at={69} top={12} className={styles.sway}>
      <CandyCane />
    </Placed>
  </>
);

const SCENES: Record<Festival, React.FC> = {
  midAutumn: MidAutumn,
  halloween: Halloween,
  christmas: Christmas,
};

const FestiveDecoration: React.FC<FestiveDecorationProps> = ({ festival }) => {
  const Scene = SCENES[festival];
  return (
    <div className={styles.stage} data-festival={festival} aria-hidden>
      <Scene />
    </div>
  );
};

export default FestiveDecoration;

/* ---------- The avatar's dressing ---------- */

/** The Christmas hat: brim across the top of the disc, cone leaning to the right, pom at
 *  the tip. Drawn to sit level — the disc is round, so a tilted hat reads as fallen off
 *  rather than worn. The white parts carry a soft grey edge so they do not vanish into
 *  the light header. */
export const SantaHat: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 44 30" width="40" height="27">
    <defs>
      <linearGradient id="fd-hat" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ff6b6b" />
        <stop offset="100%" stopColor="#c62f3a" />
      </linearGradient>
    </defs>
    <path d="M7 21Q9 6 24 3q9-1 13 4L30 21z" fill="url(#fd-hat)" />
    <path d="M10 20Q13 9 24 5.5" fill="none" stroke="#ffb3b3" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    <circle cx="38" cy="7" r="5" fill="#fff" stroke="#d6d6dc" strokeWidth="0.9" />
    <circle cx="36.5" cy="5.5" r="1.6" fill="#fff" opacity="0.9" />
    <rect x="3" y="18" width="30" height="8" rx="4" fill="#fff" stroke="#d6d6dc" strokeWidth="0.9" />
    <path d="M7 20.5q4 1.5 8 0t8 0 8 0" fill="none" stroke="#ececf2" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

/** The Halloween mouth: the pumpkin sits behind the disc with its mouth where the face
 *  is, and the teeth come back in front along the disc's rim — so the head is inside the
 *  mouth rather than replaced by it. Two layers, one component each. */
export const PumpkinBehind: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 48 50" width="48" height="50">
    <defs>
      <radialGradient id="fd-pumpkin-avatar" cx="40%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#ffb457" />
        <stop offset="60%" stopColor="#f28c28" />
        <stop offset="100%" stopColor="#c8621a" />
      </radialGradient>
    </defs>
    <path d="M22 7c1-2.5 3.5-3 5.5-1.5L27 13h-5z" fill="#5f8f3e" />
    <ellipse cx="24" cy="30" rx="24" ry="19" fill="url(#fd-pumpkin-avatar)" />
    <g fill="none" stroke="#b9571a" strokeWidth="1.2" opacity="0.55">
      <ellipse cx="12" cy="30" rx="7" ry="18.5" />
      <ellipse cx="36" cy="30" rx="7" ry="18.5" />
    </g>
    <path d="M12 13l5 6H7z" fill="#3b1d0c" />
    <path d="M36 13l5 6H31z" fill="#3b1d0c" />
    <circle cx="24" cy="33" r="17" fill="#3b1d0c" />
  </svg>
);

export const PumpkinTeeth: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 48 50" width="48" height="50">
    <g fill="#f6a24a">
      <path d="M11.5 22.5l5-3.5 1 7z" />
      <path d="M17.5 18.5l5-2 .5 7z" />
      <path d="M25 16.5l5 2-.5 7z" />
      <path d="M31.5 19l5 3.5-6 3.5z" />
      <path d="M13 44l5 3 .5-6.5z" />
      <path d="M21.5 48.5l5 0-2.5-6.5z" />
      <path d="M30 47l5-3-6-3.5z" />
    </g>
  </svg>
);
