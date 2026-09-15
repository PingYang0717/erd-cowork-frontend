import React from 'react';

import type { Festival } from '@/utils/festival';

import styles from './FestiveDecoration.module.css';

/** What the middle of the header shows during a festival: a scene of small hand-drawn
 *  figures spread across the width, each moving on its own loop. Decoration and nothing
 *  else — `aria-hidden`, no pointer events, no copy — so it neither reads nor gets in
 *  the way. The colours are the festival's own (a moon is yellow in both themes); only
 *  the bats and the spider's thread borrow the text colour so they stay visible on a
 *  dark header.
 *
 *  Figures are placed by percentage of the stage width, so a wide window spreads them
 *  out and a narrow one gathers them; nothing is ever taller than the 56px bar. */
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

const Star: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 10 10" width={size} height={size}>
    <path d="M5 0l1.4 3.6L10 5 6.4 6.4 5 10 3.6 6.4 0 5l3.6-1.4z" fill="#f7d774" />
  </svg>
);

const Lantern: React.FC = () => (
  <svg viewBox="0 0 22 40" width="22" height="40">
    <rect x="10" y="0" width="2" height="6" fill="#b3893a" />
    <rect x="6" y="5" width="10" height="3" rx="1" fill="#c9a04a" />
    <ellipse cx="11" cy="19" rx="10" ry="11" fill="#e5484d" />
    <ellipse cx="11" cy="19" rx="4" ry="11" fill="none" stroke="#f08a8e" strokeWidth="1" />
    <ellipse cx="11" cy="19" rx="7.5" ry="11" fill="none" stroke="#f08a8e" strokeWidth="1" />
    <rect x="6" y="29" width="10" height="3" rx="1" fill="#c9a04a" />
    <path d="M9 32v6M11 32v7M13 32v6" stroke="#e5484d" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const Cloud: React.FC<{ width: number }> = ({ width }) => (
  <svg viewBox="0 0 56 20" width={width} height={(width * 20) / 56}>
    <path
      d="M10 18h36a7 7 0 0 0-1.5-13.8A10 10 0 0 0 26 6a8 8 0 0 0-16 12Z"
      fill="var(--erd-color-fill-tertiary, rgba(0, 0, 0, 0.04))"
      stroke="var(--erd-color-border, #d9d9d9)"
    />
  </svg>
);

const MidAutumn: React.FC = () => (
  <>
    <Placed at={4} top={12} className={styles.sway}>
      <Lantern />
    </Placed>
    <Placed at={14} top={10} className={styles.twinkle}>
      <Star size={8} />
    </Placed>
    <Placed at={24} top={30} className={styles.twinkleLate}>
      <Star size={6} />
    </Placed>
    <Placed at={34} top={16} className={styles.driftSlow}>
      <Cloud width={56} />
    </Placed>
    <Placed at={47} top={6} className={styles.glow}>
      <svg viewBox="0 0 48 48" width="44" height="44">
        <circle cx="24" cy="24" r="23" fill="#f7d774" opacity="0.25" />
        <circle cx="24" cy="24" r="18" fill="#f7d774" />
        <circle cx="17" cy="18" r="3" fill="#efc65a" />
        <circle cx="30" cy="28" r="4.5" fill="#efc65a" />
        <circle cx="19" cy="31" r="2" fill="#efc65a" />
      </svg>
    </Placed>
    <Placed at={60} top={22} className={styles.hop}>
      <svg viewBox="0 0 30 32" width="28" height="30">
        <ellipse cx="11" cy="8" rx="2.6" ry="8" fill="#fff" stroke="#c9c9c9" />
        <ellipse cx="19" cy="8" rx="2.6" ry="8" fill="#fff" stroke="#c9c9c9" />
        <ellipse cx="11" cy="8" rx="1.2" ry="5.5" fill="#f2a0b5" />
        <ellipse cx="19" cy="8" rx="1.2" ry="5.5" fill="#f2a0b5" />
        <ellipse cx="15" cy="22" rx="11" ry="9" fill="#fff" stroke="#c9c9c9" />
        <circle cx="11" cy="20" r="1.3" fill="#333" />
        <circle cx="19" cy="20" r="1.3" fill="#333" />
        <ellipse cx="15" cy="24" rx="1.6" ry="1" fill="#f2a0b5" />
      </svg>
    </Placed>
    <Placed at={72} top={34} className={styles.twinkle}>
      <Star size={7} />
    </Placed>
    <Placed at={80} top={8} className={styles.driftSlowLate}>
      <Cloud width={44} />
    </Placed>
    <Placed at={92} top={12} className={styles.swayLate}>
      <Lantern />
    </Placed>
  </>
);

/* ---------- Halloween ---------- */

const Bat: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 40 20" width={size} height={size / 2}>
    <path
      d="M0 8q7-10 15 0l2-4 3 4 3-4 2 4q8-10 15 0-6 1-7 7-5-4-9 1l-4-2-4 2q-4-5-9-1-1-6-7-7Z"
      fill="var(--erd-color-text, rgba(0, 0, 0, 0.88))"
    />
  </svg>
);

const JackOLantern: React.FC<{ size: number; glowClass: string }> = ({ size, glowClass }) => (
  <svg viewBox="0 0 40 40" width={size} height={size}>
    <path d="M18 3q2-3 5 0v6h-5z" fill="#5b8a3c" />
    <ellipse cx="20" cy="24" rx="19" ry="15" fill="#f28c28" />
    <ellipse cx="11" cy="24" rx="6" ry="14.5" fill="none" stroke="#d9741a" strokeWidth="1.4" />
    <ellipse cx="29" cy="24" rx="6" ry="14.5" fill="none" stroke="#d9741a" strokeWidth="1.4" />
    <g className={glowClass}>
      <path d="M10 20l5 5H7z" fill="#ffd166" />
      <path d="M30 20l5 5h-10z" fill="#ffd166" />
      <path d="M8 29q12 9 24 0l-3 3h-3l-2 2-2-2h-4l-2 2-2-2h-3z" fill="#ffd166" />
    </g>
  </svg>
);

const Halloween: React.FC = () => (
  <>
    <Placed at={3} top={10} className={styles.flyRight}>
      <Bat size={34} />
    </Placed>
    <Placed at={16} top={12} className={styles.bob}>
      <JackOLantern size={38} glowClass={styles.glowPulse} />
    </Placed>
    <Placed at={31} top={0} className={styles.dangle}>
      <svg viewBox="0 0 20 44" width="20" height="44">
        <path d="M10 0v26" stroke="var(--erd-color-text, rgba(0, 0, 0, 0.88))" strokeWidth="1" />
        <circle cx="10" cy="30" r="3" fill="#2b2b2b" />
        <circle cx="10" cy="37" r="5" fill="#2b2b2b" />
        <path
          d="M5 33l-4-4M15 33l4-4M4 37H0M16 37h4M5 41l-4 3M15 41l4 3"
          stroke="#2b2b2b"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="8.5" cy="36" r="1" fill="#fff" />
        <circle cx="11.5" cy="36" r="1" fill="#fff" />
      </svg>
    </Placed>
    <Placed at={45} top={6} className={styles.flyLeft}>
      <Bat size={28} />
    </Placed>
    <Placed at={57} top={8} className={styles.haunt}>
      <svg viewBox="0 0 30 38" width="30" height="38">
        <path d="M3 36V15a12 12 0 0 1 24 0v21l-4-4-4 4-4-4-4 4-4-4z" fill="#f4f4f6" stroke="#d0d0d6" />
        <circle cx="10.5" cy="15" r="2.2" fill="#2b2b2b" />
        <circle cx="19.5" cy="15" r="2.2" fill="#2b2b2b" />
        <ellipse cx="15" cy="22" rx="2.2" ry="3" fill="#2b2b2b" />
      </svg>
    </Placed>
    <Placed at={72} top={14} className={styles.bobLate}>
      <JackOLantern size={32} glowClass={styles.glowPulseLate} />
    </Placed>
    <Placed at={88} top={22} className={styles.flyRightLate}>
      <Bat size={30} />
    </Placed>
  </>
);

/* ---------- Christmas ---------- */

const Snowflake: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 16 16" width={size} height={size}>
    <g stroke="#9bcdf0" strokeWidth="1.8" strokeLinecap="round">
      <path d="M8 1v14M1 8h14M3 3l10 10M13 3L3 13" />
      <path d="M8 1l-2 2M8 1l2 2M8 15l-2-2M8 15l2-2M1 8l2-2M1 8l2 2M15 8l-2-2M15 8l-2 2" />
    </g>
  </svg>
);

const FLAKES: Array<{ at: number; size: number; className: string }> = [
  { at: 2, size: 12, className: styles.fall },
  { at: 12, size: 8, className: styles.fallLate },
  { at: 22, size: 10, className: styles.fallLater },
  { at: 38, size: 9, className: styles.fallLate },
  { at: 50, size: 13, className: styles.fall },
  { at: 62, size: 8, className: styles.fallLater },
  { at: 76, size: 11, className: styles.fallLate },
  { at: 90, size: 9, className: styles.fall },
  { at: 97, size: 7, className: styles.fallLater },
];

const Christmas: React.FC = () => (
  <>
    {FLAKES.map((flake) => (
      <Placed key={flake.at} at={flake.at} top={-14} className={flake.className}>
        <Snowflake size={flake.size} />
      </Placed>
    ))}
    <Placed at={30} top={4} className={styles.bob}>
      <svg viewBox="0 0 40 50" width="40" height="50">
        <path
          className={styles.twinkle}
          d="M20 1l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L20 14.4l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z"
          fill="#f7d774"
        />
        <path d="M20 10l11 14H9z" fill="#3a9d5d" />
        <path d="M20 18l14 16H6z" fill="#34925a" />
        <path d="M20 27l17 18H3z" fill="#2f8a4f" />
        <rect x="16" y="44" width="8" height="6" fill="#7a4a1f" />
        <circle className={styles.twinkle} cx="16" cy="22" r="2" fill="#e5484d" />
        <circle className={styles.twinkleLate} cx="25" cy="30" r="2" fill="#f7d774" />
        <circle className={styles.twinkle} cx="12" cy="38" r="2" fill="#4c9be8" />
        <circle className={styles.twinkleLate} cx="28" cy="40" r="2" fill="#e5484d" />
        <circle className={styles.twinkleLate} cx="20" cy="35" r="2" fill="#f7d774" />
      </svg>
    </Placed>
    <Placed at={44} top={30} className={styles.bobLate}>
      <svg viewBox="0 0 30 26" width="26" height="22">
        <rect x="1" y="9" width="28" height="16" rx="2" fill="#e5484d" />
        <rect x="1" y="6" width="28" height="6" rx="1.5" fill="#c93a3f" />
        <rect x="12.5" y="6" width="5" height="19" fill="#f7d774" />
        <path d="M15 6q-6-8-6-2t6 2q6-8 6-2t-6 2" fill="none" stroke="#f7d774" strokeWidth="2" />
      </svg>
    </Placed>
    <Placed at={68} top={14} className={styles.sway}>
      <svg viewBox="0 0 20 40" width="18" height="36">
        <path d="M6 38V12a6 6 0 0 1 12 0" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <path
          d="M6 38V12a6 6 0 0 1 12 0"
          fill="none"
          stroke="#e5484d"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="4 4"
        />
      </svg>
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

/** The Christmas hat: brim across the top of the disc, cone leaning to the right, pom
 *  at the tip. Drawn to sit level — the disc is round, so a tilted hat reads as fallen
 *  off rather than worn. */
export const SantaHat: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 44 30" width="40" height="27">
    <path d="M7 21Q9 6 24 3q9-1 13 4L30 21z" fill="#e5484d" />
    <path d="M9 21Q12 9 24 5q5-1 8 1" fill="none" stroke="#f26b6f" strokeWidth="1.5" strokeLinecap="round" />
    {/* The white parts carry a soft grey edge: on the light header they would otherwise
        vanish into the background. */}
    <circle cx="38" cy="7" r="5" fill="#fff" stroke="#d6d6dc" strokeWidth="1" />
    <rect x="3" y="18" width="30" height="8" rx="4" fill="#fff" stroke="#d6d6dc" strokeWidth="1" />
  </svg>
);

/** The Halloween mouth: the pumpkin sits behind the disc with its mouth where the face
 *  is, and the teeth come back in front along the disc's rim — so the head is inside
 *  the mouth rather than replaced by it. Two layers, one component each. */
export const PumpkinBehind: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 48 50" width="48" height="50">
    <path d="M22 7q2-3 5 0v6h-5z" fill="#5b8a3c" />
    <ellipse cx="24" cy="30" rx="24" ry="19" fill="#f28c28" />
    <ellipse cx="13" cy="30" rx="7" ry="18.5" fill="none" stroke="#d9741a" strokeWidth="1.4" />
    <ellipse cx="35" cy="30" rx="7" ry="18.5" fill="none" stroke="#d9741a" strokeWidth="1.4" />
    <path d="M12 13l5 6H7z" fill="#3b1d0c" />
    <path d="M36 13l5 6H31z" fill="#3b1d0c" />
    <circle cx="24" cy="33" r="17" fill="#3b1d0c" />
  </svg>
);

export const PumpkinTeeth: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 48 50" width="48" height="50">
    {/* Two even rows along the mouth's rim: four hanging from the top, three rising from
        the bottom, each a clean triangle in the pumpkin's own orange. */}
    <g fill="#f28c28">
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
