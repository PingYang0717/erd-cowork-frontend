import React from 'react';

import type { Festival } from '@/utils/festival';

import styles from './FestiveDecoration.module.css';

/** What the middle of the header shows during a festival: a few small hand-drawn
 *  figures, drifting. Decoration and nothing else — `aria-hidden`, no pointer events, no
 *  copy — so it neither reads nor gets in the way. The colours are the festival's own
 *  (a moon is yellow in both themes); only the bats borrow the text colour so they stay
 *  visible on a dark header. */
interface FestiveDecorationProps {
  festival: Festival;
}

const MidAutumn: React.FC = () => (
  <>
    <svg className={styles.cloud} viewBox="0 0 40 16" width="40" height="16">
      <path
        d="M8 14h24a6 6 0 0 0-1-11.9A8 8 0 0 0 16 4a6 6 0 0 0-8 10Z"
        fill="var(--erd-color-fill-tertiary, rgba(0, 0, 0, 0.04))"
        stroke="var(--erd-color-border, #d9d9d9)"
      />
    </svg>
    <svg className={styles.float} viewBox="0 0 36 36" width="36" height="36">
      <circle cx="18" cy="18" r="15" fill="#f7d774" />
      <circle cx="12" cy="13" r="2.5" fill="#efc65a" />
      <circle cx="23" cy="22" r="3.5" fill="#efc65a" />
      <circle cx="14" cy="24" r="1.5" fill="#efc65a" />
    </svg>
    <svg className={styles.floatSlow} viewBox="0 0 24 28" width="24" height="28">
      <ellipse cx="9" cy="7" rx="2.2" ry="7" fill="#fff" stroke="#d9d9d9" />
      <ellipse cx="15" cy="7" rx="2.2" ry="7" fill="#fff" stroke="#d9d9d9" />
      <ellipse cx="12" cy="20" rx="9" ry="7" fill="#fff" stroke="#d9d9d9" />
      <circle cx="9" cy="19" r="1" fill="#333" />
      <circle cx="15" cy="19" r="1" fill="#333" />
      <ellipse cx="12" cy="22" rx="1.4" ry="0.9" fill="#f2a0b5" />
    </svg>
  </>
);

const Pumpkin: React.FC<{ className?: string; size: number }> = ({ className, size }) => (
  <svg className={className} viewBox="0 0 32 32" width={size} height={size}>
    <rect x="14" y="3" width="4" height="6" rx="1.5" fill="#5b8a3c" />
    <ellipse cx="16" cy="19" rx="14" ry="11" fill="#f28c28" />
    <ellipse cx="9" cy="19" rx="5" ry="10.5" fill="none" stroke="#d9741a" strokeWidth="1.2" />
    <ellipse cx="23" cy="19" rx="5" ry="10.5" fill="none" stroke="#d9741a" strokeWidth="1.2" />
    <path d="M9 15l4 4h-8z" fill="#3b1d0c" />
    <path d="M23 15l4 4h-8z" fill="#3b1d0c" />
    <path d="M8 23q8 6 16 0l-2 2h-2l-1.5 1.5-1.5-1.5h-2l-1.5 1.5-1.5-1.5h-2z" fill="#3b1d0c" />
  </svg>
);

const Bat: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 32 16" width="28" height="14">
    <path
      d="M0 6q6-8 12 0l2-3 2 3 2-3 2 3q6-8 12 0-5 1-6 6-4-3-7 1l-3-2-3 2q-3-4-7-1-1-5-6-6Z"
      fill="var(--erd-color-text, rgba(0, 0, 0, 0.88))"
    />
  </svg>
);

const Halloween: React.FC = () => (
  <>
    <Bat className={styles.batLeft} />
    <Pumpkin className={styles.float} size={30} />
    <Pumpkin className={styles.floatSlow} size={22} />
    <Bat className={styles.batRight} />
  </>
);

const Snowflake: React.FC<{ className: string; size: number }> = ({ className, size }) => (
  <svg className={className} viewBox="0 0 16 16" width={size} height={size}>
    <g stroke="#8fc4ea" strokeWidth="1.6" strokeLinecap="round">
      <path d="M8 1v14M1 8h14M3 3l10 10M13 3L3 13" />
    </g>
  </svg>
);

const Christmas: React.FC = () => (
  <>
    <Snowflake className={styles.fall} size={10} />
    <Snowflake className={styles.fallLate} size={8} />
    <svg className={styles.float} viewBox="0 0 32 36" width="30" height="34">
      <path d="M16 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3L16 14l-4.8 2.6.9-5.3L8.3 7.6l5.3-.8z" fill="#f7d774" />
      <path d="M16 8l9 12H7z" fill="#3a9d5d" />
      <path d="M16 15l11 13H5z" fill="#2f8a4f" />
      <rect x="13" y="28" width="6" height="6" fill="#7a4a1f" />
      <circle cx="13" cy="19" r="1.6" fill="#e5484d" />
      <circle cx="19" cy="24" r="1.6" fill="#e5484d" />
      <circle cx="11" cy="25" r="1.6" fill="#f7d774" />
    </svg>
    <Snowflake className={styles.fallLater} size={9} />
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

/** The avatar's Halloween face: the pumpkin stands in for the person entirely. */
export const PumpkinAvatar: React.FC<{ size: number }> = ({ size }) => <Pumpkin size={size} />;

/** The avatar's Christmas hat, perched on the disc's upper left. */
export const SantaHat: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 28 24" width="26" height="22">
    <path d="M4 18Q6 4 20 3q3 0 4 3L12 18z" fill="#e5484d" />
    <circle cx="24" cy="5" r="3.2" fill="#fff" />
    <rect x="2" y="16" width="16" height="5" rx="2.5" fill="#fff" />
  </svg>
);
