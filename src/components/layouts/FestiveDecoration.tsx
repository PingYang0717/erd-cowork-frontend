import React from 'react';

import type { Festival } from '@/utils/festival';

import styles from './FestiveDecoration.module.css';

/** What the middle of the header shows during a festival: one continuous scene, not a
 *  row of figures. Every festival is built the same way —
 *
 *    sky   a faint tint washed across the band
 *    far   a repeating silhouette pattern, drifting slowly
 *    mid   a second pattern in front of it, drifting a little faster (parallax)
 *    near  a few fixed pieces standing on the band's floor, at most breathing
 *
 *  — and the whole picture moves as a picture: the two layers slide, the lights
 *  breathe, nothing hops or wobbles on its own. Decoration and nothing else:
 *  `aria-hidden`, no pointer events, no copy.
 *
 *  Silhouettes take the text colour at low opacity, so the same drawing sits on the
 *  light and the dark header; only the near pieces carry the festival's own colours.
 *  Pattern and gradient ids are fixed — two instances would define them identically. */
interface FestiveDecorationProps {
  festival: Festival;
}

/** One repeating silhouette band. The tile repeats across the stage and the layer slides
 *  by exactly one tile per loop, so the drift never jumps. */
interface PatternLayerProps {
  id: string;
  /** Tile width in px; the CSS loop distance must match (`--fd-tile`). */
  tile: number;
  className: string;
  opacity: number;
  children: React.ReactNode;
}

const PatternLayer: React.FC<PatternLayerProps> = ({ id, tile, className, opacity, children }) => (
  <svg
    className={className}
    style={{ ['--fd-tile' as string]: `${tile}px`, width: `calc(100% + ${tile}px)` }}
    height="56"
    preserveAspectRatio="none"
  >
    <defs>
      <pattern id={id} width={tile} height="56" patternUnits="userSpaceOnUse">
        {children}
      </pattern>
    </defs>
    <rect width="100%" height="56" fill={`url(#${id})`} opacity={opacity} />
  </svg>
);

const INK = 'var(--erd-color-text, rgba(0, 0, 0, 0.88))';

/* ---------- Mid-Autumn: a moonlit sky over a bank of clouds ---------- */

const MidAutumn: React.FC = () => (
  <>
    <div className={styles.sky} style={{ background: 'linear-gradient(90deg, rgba(74, 92, 168, 0) 0%, rgba(74, 92, 168, 0.10) 35%, rgba(74, 92, 168, 0.10) 65%, rgba(74, 92, 168, 0) 100%)' }} />

    {/* far: small stars, and a thin high cloud line */}
    <PatternLayer id="fd-ma-far" tile={320} className={styles.far} opacity={0.3}>
      <g fill="#f8dc7a">
        <circle cx="24" cy="10" r="1.2" />
        <circle cx="88" cy="22" r="0.9" />
        <circle cx="140" cy="7" r="1.4" />
        <circle cx="196" cy="18" r="0.9" />
        <circle cx="252" cy="9" r="1.2" />
        <circle cx="300" cy="26" r="0.8" />
      </g>
      <path d="M40 30h60a5 5 0 0 0-2-9 8 8 0 0 0-15-2 6 6 0 0 0-10 3 5 5 0 0 0-33 8Z" fill={INK} opacity="0.35" />
      <path d="M210 24h50a4 4 0 0 0-2-7 7 7 0 0 0-13-1 5 5 0 0 0-8 2 4 4 0 0 0-27 6Z" fill={INK} opacity="0.3" />
    </PatternLayer>

    {/* mid: a rolling bank of clouds, resting on the floor of the band */}
    <PatternLayer id="fd-ma-mid" tile={320} className={styles.mid} opacity={0.08}>
      <path
        d="M0 56V44a10 10 0 0 1 18-6 12 12 0 0 1 22-4 9 9 0 0 1 16 2 14 14 0 0 1 26-2 8 8 0 0 1 14 3 11 11 0 0 1 20-2 13 13 0 0 1 24 4 9 9 0 0 1 16-1 12 12 0 0 1 22 2 10 10 0 0 1 18 3 8 8 0 0 1 14-2 11 11 0 0 1 20 3 9 9 0 0 1 16 0 13 13 0 0 1 24 3 10 10 0 0 1 18 2 8 8 0 0 1 12 1V56Z"
        fill={INK}
      />
    </PatternLayer>

    {/* near: flat shapes in the same language as the silhouettes behind them — a soft
        moon, a rabbit sitting on the cloud bank, a lantern hung at each end. */}
    <svg className={styles.near} style={{ left: '40%', top: 4 }} viewBox="0 0 48 48" width="40" height="40">
      <defs>
        <radialGradient id="fd-ma-halo" cx="50%" cy="50%" r="50%">
          <stop offset="45%" stopColor="#f6d365" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f6d365" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className={styles.breathe}>
        <circle cx="24" cy="24" r="24" fill="url(#fd-ma-halo)" />
      </g>
      <circle cx="24" cy="24" r="12" fill="#f5d777" />
      <circle cx="20" cy="20" r="2.2" fill="#e8c35a" opacity="0.7" />
      <circle cx="28" cy="27" r="3" fill="#e8c35a" opacity="0.7" />
    </svg>
    <svg className={styles.near} style={{ left: '52%', top: 56 - 18 }} viewBox="0 0 24 24" width="18" height="18" opacity="0.85">
      <path d="M7 12c-2-4-2-8 0-10 1.5 0 2.5 4 2.5 9zM17 12c2-4 2-8 0-10-1.5 0-2.5 4-2.5 9z" fill={INK} opacity="0.55" />
      <ellipse cx="12" cy="17" rx="8" ry="6.5" fill={INK} opacity="0.55" />
      <circle cx="9.5" cy="16" r="0.9" fill="#fff" />
      <circle cx="14.5" cy="16" r="0.9" fill="#fff" />
    </svg>
    {['5%', '92%'].map((left) => (
      <svg key={left} className={styles.near} style={{ left, top: 0 }} viewBox="0 0 20 40" width="16" height="32" opacity="0.9">
        <path d="M10 0v4" stroke="#c9a04a" strokeWidth="1.2" />
        <rect x="6" y="4" width="8" height="3" rx="1.2" fill="#d9b25c" />
        <ellipse cx="10" cy="18" rx="8.5" ry="10" fill="#e0454f" />
        <ellipse cx="10" cy="18" rx="3.2" ry="10" fill="none" stroke="#f08a8e" strokeWidth="0.7" opacity="0.6" />
        <rect x="6" y="28" width="8" height="3" rx="1.2" fill="#d9b25c" />
        <path d="M9 31v6M11 31v7" stroke="#d9b25c" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ))}
  </>
);

/* ---------- Halloween: a flock over a haunted skyline ---------- */

const Halloween: React.FC = () => (
  <>
    <div className={styles.sky} style={{ background: 'linear-gradient(90deg, rgba(122, 70, 160, 0) 0%, rgba(122, 70, 160, 0.12) 35%, rgba(122, 70, 160, 0.12) 65%, rgba(122, 70, 160, 0) 100%)' }} />

    {/* far: a flock of bats, small and pale */}
    <PatternLayer id="fd-hw-far" tile={360} className={styles.far} opacity={0.28}>
      <g fill={INK}>
        <path transform="translate(20 10) scale(0.55)" d="M24 6c-1.2-2.4-3-3.6-3-3.6l.6 3.2c-3.6-4.2-9.6-4.8-15-1.2C3.4 6.4 1 9.6 0 12.4c3.2-1.6 6-1.4 8.2.4-1 2.2-1 4.2-.2 6.4 2.2-2 4.6-2.6 7.2-1.8.4 2 1.6 3.4 3.6 4.2.8-1.6 2.4-2.8 5.2-3.4 2.8.6 4.4 1.8 5.2 3.4 2-.8 3.2-2.2 3.6-4.2 2.6-.8 5-.2 7.2 1.8.8-2.2.8-4.2-.2-6.4 2.2-1.8 5-2 8.2-.4-1-2.8-3.4-6-6.6-8-5.4-3.6-11.4-3-15 1.2l.6-3.2s-1.8 1.2-3 3.6z" />
        <path transform="translate(120 22) scale(0.4)" d="M24 6c-1.2-2.4-3-3.6-3-3.6l.6 3.2c-3.6-4.2-9.6-4.8-15-1.2C3.4 6.4 1 9.6 0 12.4c3.2-1.6 6-1.4 8.2.4-1 2.2-1 4.2-.2 6.4 2.2-2 4.6-2.6 7.2-1.8.4 2 1.6 3.4 3.6 4.2.8-1.6 2.4-2.8 5.2-3.4 2.8.6 4.4 1.8 5.2 3.4 2-.8 3.2-2.2 3.6-4.2 2.6-.8 5-.2 7.2 1.8.8-2.2.8-4.2-.2-6.4 2.2-1.8 5-2 8.2-.4-1-2.8-3.4-6-6.6-8-5.4-3.6-11.4-3-15 1.2l.6-3.2s-1.8 1.2-3 3.6z" />
        <path transform="translate(230 6) scale(0.5)" d="M24 6c-1.2-2.4-3-3.6-3-3.6l.6 3.2c-3.6-4.2-9.6-4.8-15-1.2C3.4 6.4 1 9.6 0 12.4c3.2-1.6 6-1.4 8.2.4-1 2.2-1 4.2-.2 6.4 2.2-2 4.6-2.6 7.2-1.8.4 2 1.6 3.4 3.6 4.2.8-1.6 2.4-2.8 5.2-3.4 2.8.6 4.4 1.8 5.2 3.4 2-.8 3.2-2.2 3.6-4.2 2.6-.8 5-.2 7.2 1.8.8-2.2.8-4.2-.2-6.4 2.2-1.8 5-2 8.2-.4-1-2.8-3.4-6-6.6-8-5.4-3.6-11.4-3-15 1.2l.6-3.2s-1.8 1.2-3 3.6z" />
        <path transform="translate(300 18) scale(0.35)" d="M24 6c-1.2-2.4-3-3.6-3-3.6l.6 3.2c-3.6-4.2-9.6-4.8-15-1.2C3.4 6.4 1 9.6 0 12.4c3.2-1.6 6-1.4 8.2.4-1 2.2-1 4.2-.2 6.4 2.2-2 4.6-2.6 7.2-1.8.4 2 1.6 3.4 3.6 4.2.8-1.6 2.4-2.8 5.2-3.4 2.8.6 4.4 1.8 5.2 3.4 2-.8 3.2-2.2 3.6-4.2 2.6-.8 5-.2 7.2 1.8.8-2.2.8-4.2-.2-6.4 2.2-1.8 5-2 8.2-.4-1-2.8-3.4-6-6.6-8-5.4-3.6-11.4-3-15 1.2l.6-3.2s-1.8 1.2-3 3.6z" />
      </g>
    </PatternLayer>

    {/* mid: rooftops, a bare tree, a picket fence */}
    <PatternLayer id="fd-hw-mid" tile={360} className={styles.mid} opacity={0.11}>
      <g fill={INK}>
        <path d="M0 56V40h14l6-10 6 10h6V30h4v-6l3-4 3 4v6h3v10h10l8-12 8 12h4V38h18v18Z" />
        <path d="M96 56V46l1-1 .5-8 2.5-3 2.5 3 .5 8 1 1v10Z" />
        <path d="M118 56V42c-3-2-4-6-3-10-2 1-4 0-5-2 3 0 5-2 6-4 1 2 3 3 5 2-1 3 0 6 2 8 3-1 5-3 5-6 1 3 0 6-2 8 3 1 5 3 4 6-3-1-5 0-6 2 1 2 2 4 1 6-2-1-4-2-4-4V56Z" />
        <path d="M150 56V44h3v-4l2-3 2 3v4h4v-4l2-3 2 3v4h4v-4l2-3 2 3v4h4v-4l2-3 2 3v4h3v12Z" />
        <path d="M200 56V36h6V28l5-7 5 7v8h6v-4h4v4h6v20Z" />
        <path d="M250 56V44h8l4-8 4 8h6v-6h5v6h8V56Z" />
        <path d="M300 56V46l1-1 .5-8 2.5-3 2.5 3 .5 8 1 1v10Z" />
        <path d="M322 56V44h3v-4l2-3 2 3v4h4v-4l2-3 2 3v4h4v-4l2-3 2 3v4h3v12Z" />
      </g>
    </PatternLayer>

    {/* near: flat shapes — a crescent, a ghost fading in and out, pumpkins on the floor
        whose faces are the only thing that glows */}
    <svg className={styles.near} style={{ left: '10%', top: 4 }} viewBox="0 0 32 32" width="22" height="22">
      <path d="M22 3a13 13 0 1 0 8 23A11 11 0 0 1 22 3z" fill="#f5d777" opacity="0.85" />
    </svg>
    <svg className={`${styles.near} ${styles.breathe}`} style={{ left: '62%', top: 8 }} viewBox="0 0 32 40" width="18" height="22">
      <path d="M4 38V16a12 12 0 0 1 24 0v22c-2-2.4-4-2.4-6 0-2-2.4-4-2.4-6 0-2-2.4-4-2.4-6 0-2-2.4-4-2.4-6 0z" fill="#f2f2f7" opacity="0.9" />
      <ellipse cx="11.5" cy="16" rx="2" ry="2.6" fill="#3b3b46" />
      <ellipse cx="20.5" cy="16" rx="2" ry="2.6" fill="#3b3b46" />
      <ellipse cx="16" cy="23" rx="2" ry="2.8" fill="#3b3b46" />
    </svg>
    {[
      { left: '31%', size: 22 },
      { left: '43%', size: 16 },
      { left: '80%', size: 19 },
    ].map(({ left, size }) => (
      <svg key={left} className={styles.near} style={{ left, top: 56 - size }} viewBox="0 0 44 44" width={size} height={size}>
        <path d="M20 6c1-2.5 3.5-3 5.5-1.5L25 13h-5z" fill="#5f8f3e" />
        <ellipse cx="22" cy="28" rx="20" ry="15" fill="#ef8a2c" />
        <g fill="none" stroke="#c9691c" strokeWidth="1.4" opacity="0.45">
          <ellipse cx="11" cy="28" rx="7" ry="14.5" />
          <ellipse cx="33" cy="28" rx="7" ry="14.5" />
        </g>
        <g className={styles.breathe} fill="#fff0b8">
          <path d="M11 24l6 6H6z" />
          <path d="M33 24l6 6h-12z" />
          <path d="M9 33q13 10 26 0l-3 3.5h-3.5l-2 2.5-2-2.5h-5l-2 2.5-2-2.5H12z" />
        </g>
      </svg>
    ))}
  </>
);

/* ---------- Christmas: snow over a pine forest ---------- */

const Christmas: React.FC = () => (
  <>
    <div className={styles.sky} style={{ background: 'linear-gradient(90deg, rgba(90, 150, 220, 0) 0%, rgba(90, 150, 220, 0.12) 35%, rgba(90, 150, 220, 0.12) 65%, rgba(90, 150, 220, 0) 100%)' }} />

    {/* far: snowy hills with distant pines */}
    <PatternLayer id="fd-xm-far" tile={320} className={styles.far} opacity={0.12}>
      <path d="M0 56V40c30-8 60-8 90 0s60 8 90 0 60-8 90 0 40 6 50 6V56Z" fill={INK} />
      <g fill={INK}>
        <path d="M40 40l5-12 5 12zM100 42l4-10 4 10zM190 41l5-13 5 13zM260 43l4-9 4 9z" />
      </g>
    </PatternLayer>

    {/* mid: a row of pines */}
    <PatternLayer id="fd-xm-mid" tile={320} className={styles.mid} opacity={0.15}>
      <g fill={INK}>
        <path d="M0 56V48l8-14 3 5 2-4 9 13v8Z" />
        <path d="M40 56v-6l10-18 3 6 3-5 11 17v6Z" />
        <path d="M90 56v-8l7-12 3 4 2-3 8 11v8Z" />
        <path d="M140 56v-5l9-16 3 5 2-4 10 15v5Z" />
        <path d="M200 56v-7l8-14 3 5 2-4 9 13v7Z" />
        <path d="M250 56v-6l10-18 3 6 3-5 11 17v6Z" />
        <path d="M300 56v-8l7-12 3 4 2-3 8 11v8Z" />
      </g>
    </PatternLayer>

    {/* snow: a dotted tile sliding down, so the fall is one continuous sheet */}
    <svg className={styles.snow} style={{ ['--fd-tile' as string]: '56px' }} width="100%" height="112">
      <defs>
        <pattern id="fd-xm-snow" width="120" height="56" patternUnits="userSpaceOnUse">
          <g fill="#c9e3f7">
            <circle cx="10" cy="8" r="1.6" />
            <circle cx="46" cy="20" r="1.1" />
            <circle cx="78" cy="4" r="1.4" />
            <circle cx="104" cy="30" r="1" />
            <circle cx="28" cy="40" r="1.3" />
            <circle cx="66" cy="48" r="1.7" />
            <circle cx="92" cy="52" r="1" />
            <circle cx="116" cy="14" r="1.2" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="112" fill="url(#fd-xm-snow)" opacity="0.9" />
    </svg>

    {/* near: a small flat tree with its lights, two gifts beside it, all on the floor and
        off to the left so the forest keeps the middle */}
    <svg className={styles.near} style={{ left: '22%', top: 56 - 34 }} viewBox="0 0 30 36" width="28" height="34">
      <path d="M15 1l1.6 3.4 3.7.5-2.7 2.6.7 3.7L15 9.4l-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#f5d777" />
      <path d="M15 7l7 9H8z" fill="#3f9a63" />
      <path d="M15 13l9 11H6z" fill="#358a57" />
      <path d="M15 20l11 12H4z" fill="#2c7a4b" />
      <rect x="12.5" y="32" width="5" height="4" fill="#7a4e2a" />
      {(
        [
          [12, 15, '#ff6b6b', styles.twinkle],
          [18, 20, '#f5d777', styles.twinkleLate],
          [10, 27, '#6fb3ff', styles.twinkle],
          [20, 29, '#ff6b6b', styles.twinkleLate],
          [15, 24, '#f5d777', styles.twinkleLate],
        ] as const
      ).map(([x, y, color, cls]) => (
        <circle key={`${x}-${y}`} className={cls} cx={x} cy={y} r="1.3" fill={color} />
      ))}
    </svg>
    {[
      { left: '27%', w: 14, h: 12 },
      { left: '29.5%', w: 10, h: 9 },
    ].map(({ left, w, h }) => (
      <svg key={left} className={styles.near} style={{ left, top: 56 - h }} viewBox="0 0 32 28" width={w} height={h}>
        <rect x="2" y="8" width="28" height="19" rx="2" fill="#e04e56" />
        <rect x="13" y="8" width="6" height="19" fill="#f5d777" />
        <rect x="1" y="7" width="30" height="5" rx="1.5" fill="#c93a42" />
      </svg>
    ))}
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
