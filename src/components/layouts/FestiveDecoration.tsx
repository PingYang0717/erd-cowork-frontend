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
 *  breathe, what hangs swings a little in the breeze, and one traveller a festival
 *  crosses the band and waits out of sight before coming round again. Nothing hops or
 *  wobbles on its own; nothing on the floor moves. Decoration and nothing else:
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

/** The festival's traveller: one figure that crosses the band left to right at `top`,
 *  then waits out of frame. `width` is what the track has to slide past to get it fully
 *  out; `delay` (negative) starts the loop part-way so the first crossing comes soon. */
interface TravellerProps {
  top: number;
  width: number;
  height: number;
  viewBox: string;
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}

const Traveller: React.FC<TravellerProps> = ({ top, width, height, viewBox, duration = 48, delay = -6, children }) => (
  <div
    className={styles.crossTrack}
    style={{ ['--fd-cross-w' as string]: `${width}px`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
  >
    <svg className={styles.crossing} style={{ top }} viewBox={viewBox} width={width} height={height}>
      {children}
    </svg>
  </div>
);

/** The phase a hung thing swings at, from where it hangs — so neighbours are never in step. */
const swayAt = (at: number): React.CSSProperties => ({ animationDelay: `${-(at * 9.7).toFixed(2)}s` });

/* ---------- Mid-Autumn: a lantern string over misty hills, the moon and its rabbits ---------- */

/** One lantern on the string, hung at a fraction of the band's width. The string sags
 *  as a quadratic curve (`M0 2 q200 14 400 0`, so y = 2 + 28·t·(1−t)); each lantern's
 *  drop is read off that curve, so they hang from the line wherever the band ends up. */
const StrungLantern: React.FC<{ at: number; size: number }> = ({ at, size }) => {
  const drop = 2 + 28 * at * (1 - at);
  return (
    <svg
      className={styles.near}
      style={{ left: `${at * 100}%`, top: drop, transform: 'translateX(-50%)' }}
      viewBox="-10 0 20 30"
      width={20 * size}
      height={30 * size}
    >
      <g className={styles.sway} style={swayAt(at)}>
        <path d="M0 0v3" stroke="#c9a04a" strokeWidth="1" />
        <ellipse className={styles.breathe} cx="0" cy="12" rx="9" ry="10" fill="#f6b26b" opacity="0.28" />
        <rect x="-3.5" y="3" width="7" height="2.2" rx="1" fill="#d9b25c" />
        <ellipse cx="0" cy="11.5" rx="6.5" ry="7.5" fill="#e0454f" />
        <ellipse cx="0" cy="11.5" rx="2.6" ry="7.5" fill="#ee6a72" opacity="0.7" />
        <rect x="-3.5" y="18" width="7" height="2.2" rx="1" fill="#d9b25c" />
        <path d="M-1 20.2v4M1 20.2v5" stroke="#d9b25c" strokeWidth="0.9" strokeLinecap="round" />
      </g>
    </svg>
  );
};

const MidAutumn: React.FC = () => (
  <>
    <div
      className={styles.sky}
      style={{
        background:
          'linear-gradient(180deg, rgba(44, 52, 128, 0.12) 0%, rgba(44, 52, 128, 0.02) 70%, rgba(44, 52, 128, 0) 100%), linear-gradient(90deg, rgba(60, 70, 160, 0) 0%, rgba(60, 70, 160, 0.10) 30%, rgba(60, 70, 160, 0.10) 70%, rgba(60, 70, 160, 0) 100%)',
      }}
    />

    {/* far: a sky of small stars, and two ranges of hills with mist between them */}
    <PatternLayer id="fd-ma-far" tile={360} className={styles.far} opacity={0.5}>
      <g fill="#f5d777">
        <circle cx="18" cy="9" r="1.1" />
        <circle cx="52" cy="20" r="0.7" />
        <circle cx="96" cy="6" r="1.3" />
        <circle cx="131" cy="15" r="0.8" />
        <circle cx="170" cy="4" r="0.9" />
        <circle cx="214" cy="12" r="1.2" />
        <circle cx="258" cy="21" r="0.7" />
        <circle cx="296" cy="8" r="1" />
        <circle cx="338" cy="17" r="0.8" />
        <path d="M76 24c.3 2 1.4 3.1 3.4 3.4-2 .3-3.1 1.4-3.4 3.4-.3-2-1.4-3.1-3.4-3.4 2-.3 3.1-1.4 3.4-3.4z" />
        <path d="M240 3c.3 2 1.4 3.1 3.4 3.4-2 .3-3.1 1.4-3.4 3.4-.3-2-1.4-3.1-3.4-3.4 2-.3 3.1-1.4 3.4-3.4z" />
      </g>
      <path
        d="M0 56V38c20-10 40-14 62-8 18 5 34 2 52-6 22-10 44-8 66 2 16 7 34 6 52-2 22-10 46-8 68 2 20 9 40 8 60 0V56Z"
        fill={INK}
        opacity="0.22"
      />

      {/* a pagoda on the far ridge */}
      <path
        d="M318 40h10v-3h-1v-3h-8v3h-1zM317 34l6-4 6 4zM319 30h8v-2h-8zM318 28l5-3 5 3zM320 25h6v-2h-6zM320 23l3-3 3 3z"
        fill={INK}
        opacity="0.32"
      />
      {/* a pavilion on the ridge */}
      <path d="M186 33h2v-3l-6-4-6 4v3h2v-6l4-3 4 3zM178 33h16v1h-16z M180 34h12v6h-12z" fill={INK} opacity="0.3" />
      <path d="M176 30l10-7 10 7-1 1-9-6-9 6z" fill={INK} opacity="0.3" />
      <path
        d="M0 56V46c26-8 50-10 76-4 20 5 40 3 60-4 24-8 48-6 72 2 18 6 36 5 54-2 24-9 50-7 74 1 10 3 18 4 24 3V56Z"
        fill={INK}
        opacity="0.14"
      />
    </PatternLayer>

    {/* mid: a bank of auspicious clouds along the floor, the hills' mist rolling through */}
    <PatternLayer id="fd-ma-mid" tile={320} className={styles.mid} opacity={0.14}>
      <g fill={INK}>
        <path d="M0 56V48a8 8 0 0 1 14-5 10 10 0 0 1 18-3 7 7 0 0 1 12 2 11 11 0 0 1 20-1 6 6 0 0 1 10 2 9 9 0 0 1 16-2 10 10 0 0 1 18 3 7 7 0 0 1 12-1 9 9 0 0 1 16 2 8 8 0 0 1 14 2 6 6 0 0 1 10-2 9 9 0 0 1 16 3 7 7 0 0 1 12 0 10 10 0 0 1 18 3 8 8 0 0 1 14 1 6 6 0 0 1 10 1 8 8 0 0 1 12-1 9 9 0 0 1 16 3 8 8 0 0 1 12 1V56Z" />
        <path d="M24 46a5 5 0 0 1 8-3 4 4 0 0 1 6 1 5 5 0 0 1-1 6H26a4 4 0 0 1-2-4z" opacity="0.5" />
        <path d="M150 44a5 5 0 0 1 8-3 4 4 0 0 1 6 1 5 5 0 0 1-1 6h-11a4 4 0 0 1-2-4z" opacity="0.5" />
        <path d="M262 45a5 5 0 0 1 8-3 4 4 0 0 1 6 1 5 5 0 0 1-1 6h-11a4 4 0 0 1-2-4z" opacity="0.5" />
      </g>
      {/* reeds at the water's edge */}
      <g fill="none" stroke={INK} strokeWidth="0.8" strokeLinecap="round" opacity="0.7">
        <path d="M70 56c1-5 0-9-2-12M74 56c0-5 2-8 5-10M78 56c-1-4-1-8 1-11" />
        <path d="M196 56c1-5 0-9-2-12M200 56c0-5 2-8 5-10M204 56c-1-4-1-8 1-11M208 56c1-3 0-6-1-8" />
        <path d="M300 56c1-5 0-9-2-12M304 56c0-5 2-8 5-10" />
      </g>
      <g fill={INK} opacity="0.7">
        <ellipse cx="68" cy="43" rx="1" ry="2.6" />
        <ellipse cx="79.5" cy="44.5" rx="1" ry="2.6" />
        <ellipse cx="194" cy="43" rx="1" ry="2.6" />
        <ellipse cx="205.5" cy="44.5" rx="1" ry="2.6" />
        <ellipse cx="298" cy="43" rx="1" ry="2.6" />
      </g>
    </PatternLayer>

    {/* the traveller: a skein of geese crossing under the moon, wings on the beat */}
    <Traveller top={9} width={64} height={16} viewBox="0 0 64 16" duration={52} delay={-8}>
      <g fill={INK} opacity="0.55">
        {(
          [
            [4, 10],
            [14, 7],
            [24, 4],
            [34, 2],
            [44, 4],
            [54, 7],
          ] as const
        ).map(([x, y], i) => (
          <g key={x} className={styles.flap} style={{ animationDelay: `${-i * 0.12}s`, animationDuration: '0.9s' }}>
            <path d={`M${x} ${y}l6 2-6 2 1.5-2z`} />
          </g>
        ))}
      </g>
    </Traveller>

    {/* sky lanterns: a tile of small warm lights sliding upward, so they rise as one */}
    <svg className={styles.rise} style={{ ['--fd-tile' as string]: '56px' }} width="100%" height="112">
      <defs>
        <pattern id="fd-ma-skylanterns" width="200" height="56" patternUnits="userSpaceOnUse">
          <g>
            <path d="M30 20l3-6h4l3 6-1 5h-8z" fill="#f6b26b" opacity="0.7" />
            <circle cx="35" cy="17" r="4" fill="#ffd28a" opacity="0.35" />
            <path d="M120 44l2.5-5h3.5l2.5 5-.8 4h-6.9z" fill="#f6b26b" opacity="0.6" />
            <circle cx="124" cy="41" r="3.5" fill="#ffd28a" opacity="0.3" />
            <path d="M172 8l2-4h3l2 4-.6 3.5h-5.8z" fill="#f6b26b" opacity="0.5" />
            <circle cx="175.5" cy="6" r="3" fill="#ffd28a" opacity="0.3" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="112" fill="url(#fd-ma-skylanterns)" />
    </svg>

    {/* near: the moon with the jade rabbit on its face, two rabbits and a mooncake on the
        cloud below it, an osmanthus branch at the right, and a string of lanterns across
        the top of the whole band */}
    <svg className={styles.near} style={{ left: '46%', top: 2 }} viewBox="0 0 52 52" width="44" height="44">
      <defs>
        <radialGradient id="fd-ma-halo" cx="50%" cy="50%" r="50%">
          <stop offset="42%" stopColor="#f6d365" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#f6d365" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#f6d365" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className={styles.breathe}>
        <circle cx="26" cy="26" r="26" fill="url(#fd-ma-halo)" />
      </g>
      <circle cx="26" cy="26" r="13.5" fill="#f5d777" />
      <circle cx="26" cy="26" r="13.5" fill="none" stroke="#fff3c4" strokeWidth="0.8" opacity="0.8" />
      {/* the jade rabbit, pounding under the osmanthus tree — the shape people know */}
      <g fill="#d9b453" opacity="0.6">
        <path d="M22 32c-1-3 0-6 2-7 .6-2 .4-4-.3-6 1.2.4 2 1.6 2.3 3 .8-1.4 1.8-2.4 3-2.6-.8 2-.9 4-.4 6 2.2.6 3.6 2.6 3.4 5.2-.2 1.6-1.2 2.6-2.8 3H24a3 3 0 0 1-2-1.6z" />
        <circle cx="31" cy="20" r="2.6" />
        <path d="M30 22l2 6" stroke="#d9b453" strokeWidth="1" />
      </g>
    </svg>

    {/* fireflies low over the clouds */}
    {[
      { left: '14%', top: 40, cls: styles.twinkle },
      { left: '22%', top: 46, cls: styles.twinkleLate },
      { left: '33%', top: 43, cls: styles.twinkle },
      { left: '70%', top: 44, cls: styles.twinkleLate },
      { left: '76%', top: 39, cls: styles.twinkle },
    ].map(({ left, top, cls }) => (
      <svg key={left} className={`${styles.near} ${cls}`} style={{ left, top }} viewBox="0 0 6 6" width="5" height="5">
        <circle cx="3" cy="3" r="2.6" fill="#f5d777" opacity="0.5" />
        <circle cx="3" cy="3" r="1.2" fill="#fff3b0" />
      </svg>
    ))}

    {/* a rabbit out with its lantern, at the left */}
    <svg className={styles.near} style={{ left: '17%', top: 56 - 20 }} viewBox="0 0 26 22" width="24" height="20">
      <g fill={INK} opacity="0.62">
        <path d="M9 10C7 6 7 2 9 0c1.5 0 2.5 4 2.5 9zM18 10c2-4 2-8 0-10-1.5 0-2.5 4-2.5 9z" />
        <ellipse cx="13.5" cy="15" rx="7.5" ry="6.5" />
        <path d="M20 12l4-4" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      </g>
      <circle cx="11" cy="14" r="0.9" fill="#fff" />
      <circle cx="16" cy="14" r="0.9" fill="#fff" />
      <path d="M24 8v2" stroke="#c9a04a" strokeWidth="0.8" />
      <ellipse cx="24" cy="13" rx="2.6" ry="3" fill="#e0454f" />
      <ellipse cx="24" cy="13" rx="3.6" ry="4" fill="#f6b26b" opacity="0.3" className={styles.breathe} />
    </svg>
    {/* tea for the moon-watching: a pot and two cups */}
    <svg className={styles.near} style={{ left: '35%', top: 56 - 12 }} viewBox="0 0 30 14" width="28" height="13">
      <path d="M4 13a6 6 0 0 1 12 0z" fill="#8c6b4a" />
      <ellipse cx="10" cy="7.5" rx="6" ry="1.6" fill="#a58462" />
      <rect x="9" y="4" width="2" height="3" fill="#8c6b4a" />
      <path d="M16 8q4-2 3 3" fill="none" stroke="#8c6b4a" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4 9q-3-1-1 3" fill="none" stroke="#8c6b4a" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M21 13a2.5 2.5 0 0 1 5 0zM19.5 10h8" fill="#c9c9d2" stroke="#c9c9d2" strokeWidth="0.8" />
      <path d="M21 10.5a2.5 2.5 0 0 1 5 0z" fill="#d6d6dc" />
    </svg>
    {/* a pomelo on the cloud */}
    <svg className={styles.near} style={{ left: '66%', top: 56 - 13 }} viewBox="0 0 16 14" width="15" height="13">
      <ellipse cx="8" cy="8.5" rx="6.5" ry="5.5" fill="#cddc6a" />
      <ellipse cx="6" cy="6.5" rx="2" ry="1.4" fill="#e3ec9a" opacity="0.7" />
      <path d="M8 3q3-3 6-1-3 1-6 1z" fill="#3f9a63" />
    </svg>
    {/* a second osmanthus at the left, fainter, mirroring the right */}
    <svg className={styles.near} style={{ left: 0, top: 14 }} viewBox="0 0 70 46" width="56" height="37" opacity="0.7">
      <path
        d="M0 6c12 2 24 8 34 18 8 8 16 14 26 18"
        fill="none"
        stroke={INK}
        strokeWidth="1.1"
        opacity="0.5"
        strokeLinecap="round"
      />
      <g fill={INK} opacity="0.45">
        <path d="M12 9c4-1 8 1 9 4-4 1-8-1-9-4z" />
        <path d="M24 20c4-1 7 1 8 4-3 1-7-1-8-4z" />
      </g>
      <g fill="#f2c14e">
        <circle cx="17" cy="17" r="1.2" />
        <circle cx="14" cy="19.5" r="1" />
        <circle cx="19" cy="20.5" r="0.9" />
        <circle cx="29" cy="27" r="1.2" />
        <circle cx="26" cy="29.5" r="1" />
        <circle cx="31" cy="30.5" r="0.9" />
      </g>
    </svg>

    {/* two rabbits on the cloud, one small, the mooncake between them */}
    <svg className={styles.near} style={{ left: '56%', top: 56 - 17 }} viewBox="0 0 48 22" width="40" height="17">
      <g fill={INK} opacity="0.62">
        <path d="M6 10C4 6 4 2 6 0c1.5 0 2.5 4 2.5 9zM15 10c2-4 2-8 0-10-1.5 0-2.5 4-2.5 9z" />
        <ellipse cx="10.5" cy="15" rx="8" ry="6.5" />
        <path d="M36 12c-1.6-3-1.6-6 0-8 1.2 0 2 3.2 2 7.2zM43 12c1.6-3 1.6-6 0-8-1.2 0-2 3.2-2 7.2z" />
        <ellipse cx="39.5" cy="16.5" rx="6.5" ry="5" />
      </g>
      <circle cx="8" cy="14" r="0.9" fill="#fff" />
      <circle cx="13" cy="14" r="0.9" fill="#fff" />
      <circle cx="37.5" cy="16" r="0.8" fill="#fff" />
      <circle cx="41.5" cy="16" r="0.8" fill="#fff" />
      {/* the mooncake: a round cake with its pressed pattern */}
      <ellipse cx="25" cy="18" rx="6" ry="3.6" fill="#c98a3c" />
      <ellipse cx="25" cy="16.6" rx="6" ry="3.4" fill="#e0a752" />
      <ellipse cx="25" cy="16.6" rx="3.6" ry="2" fill="none" stroke="#b8752e" strokeWidth="0.7" />
      <path d="M25 14.8v3.6M23 16.6h4" stroke="#b8752e" strokeWidth="0.6" />
    </svg>

    {/* osmanthus: a branch with clusters of tiny gold flowers, leaning in from the right */}
    <svg className={styles.near} style={{ right: 0, top: 10 }} viewBox="0 0 70 46" width="70" height="46">
      <path
        d="M70 6c-12 2-24 8-34 18-8 8-16 14-26 18"
        fill="none"
        stroke={INK}
        strokeWidth="1.1"
        opacity="0.5"
        strokeLinecap="round"
      />
      <path
        d="M52 14c-4 1-8 5-9 9M40 26c-4 2-8 6-9 10"
        fill="none"
        stroke={INK}
        strokeWidth="0.9"
        opacity="0.4"
        strokeLinecap="round"
      />
      <g fill={INK} opacity="0.45">
        <path d="M58 9c-4-1-8 1-9 4 4 1 8-1 9-4z" />
        <path d="M46 20c-4-1-7 1-8 4 3 1 7-1 8-4z" />
        <path d="M33 31c-4-1-7 1-8 4 3 1 7-1 8-4z" />
        <path d="M20 40c-4-1-7 1-8 4 3 1 7-1 8-4z" />
      </g>
      <g fill="#f2c14e">
        <circle cx="53" cy="17" r="1.3" />
        <circle cx="56" cy="19.5" r="1.1" />
        <circle cx="51" cy="20.5" r="1" />
        <circle cx="54.5" cy="22" r="1.2" />
        <circle cx="41" cy="27" r="1.3" />
        <circle cx="44" cy="29.5" r="1.1" />
        <circle cx="39" cy="30.5" r="1" />
        <circle cx="42.5" cy="32" r="1.2" />
        <circle cx="28" cy="37" r="1.2" />
        <circle cx="31" cy="39" r="1" />
        <circle cx="26.5" cy="40" r="1" />
      </g>
    </svg>

    {/* the lantern string: one line sagging gently across the band, six lanterns on it */}
    <svg className={styles.string} viewBox="0 0 400 56" preserveAspectRatio="none" width="100%" height="56">
      <path d="M0 2q200 14 400 0" fill="none" stroke={INK} strokeWidth="0.8" opacity="0.35" />
    </svg>
    {[0.145, 0.29, 0.5, 0.71, 0.855].map((at) => (
      <svg
        key={at}
        className={styles.near}
        style={{ left: `${at * 100}%`, top: 2 + 28 * at * (1 - at), transform: 'translateX(-50%)' }}
        viewBox="-4 0 8 14"
        width="8"
        height="14"
      >
        <g className={styles.sway} style={swayAt(at)}>
          <path d="M0 0v2" stroke="#c9a04a" strokeWidth="0.8" />
          <path d="M0 2l3 3-3 3-3-3z" fill="#e0454f" />
          <path d="M0 4.5l1.5 1.5L0 7.5 -1.5 6z" fill="#f08a8e" />
          <path d="M-1.2 8v5M1.2 8v5" stroke="#e0454f" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      </svg>
    ))}
    <StrungLantern at={0.07} size={0.95} />
    <StrungLantern at={0.22} size={0.8} />
    <StrungLantern at={0.36} size={1} />
    <StrungLantern at={0.64} size={0.85} />
    <StrungLantern at={0.78} size={1} />
    <StrungLantern at={0.93} size={0.8} />
  </>
);

/* ---------- Halloween: bunting over a haunted town ---------- */

const BAT =
  'M24 6c-1.2-2.4-3-3.6-3-3.6l.6 3.2c-3.6-4.2-9.6-4.8-15-1.2C3.4 6.4 1 9.6 0 12.4c3.2-1.6 6-1.4 8.2.4-1 2.2-1 4.2-.2 6.4 2.2-2 4.6-2.6 7.2-1.8.4 2 1.6 3.4 3.6 4.2.8-1.6 2.4-2.8 5.2-3.4 2.8.6 4.4 1.8 5.2 3.4 2-.8 3.2-2.2 3.6-4.2 2.6-.8 5-.2 7.2 1.8.8-2.2.8-4.2-.2-6.4 2.2-1.8 5-2 8.2-.4-1-2.8-3.4-6-6.6-8-5.4-3.6-11.4-3-15 1.2l.6-3.2s-1.8 1.2-3 3.6z';

/** One flag on the bunting, hung by a fraction of the width off the same sagging line
 *  the lanterns use. Orange and purple alternate down the string. */
const BuntingFlag: React.FC<{ at: number; color: string }> = ({ at, color }) => {
  const drop = 2 + 28 * at * (1 - at);
  return (
    <svg
      className={styles.near}
      style={{ left: `${at * 100}%`, top: drop - 1, transform: 'translateX(-50%)' }}
      viewBox="-6 0 12 12"
      width="12"
      height="12"
    >
      <g className={styles.sway} style={swayAt(at)}>
        <path d="M-5.5 0h11L0 11z" fill={color} opacity="0.9" />
      </g>
    </svg>
  );
};

const Halloween: React.FC = () => (
  <>
    <div
      className={styles.sky}
      style={{
        background:
          'linear-gradient(180deg, rgba(96, 52, 140, 0.14) 0%, rgba(96, 52, 140, 0.03) 70%, rgba(96, 52, 140, 0) 100%), linear-gradient(90deg, rgba(122, 70, 160, 0) 0%, rgba(122, 70, 160, 0.10) 30%, rgba(122, 70, 160, 0.10) 70%, rgba(122, 70, 160, 0) 100%)',
      }}
    />

    {/* far: stars, a flock of bats, and low hills */}
    <PatternLayer id="fd-hw-far" tile={360} className={styles.far} opacity={0.4}>
      <g fill="#f5d777" opacity="0.7">
        <circle cx="30" cy="8" r="0.9" />
        <circle cx="90" cy="16" r="0.7" />
        <circle cx="150" cy="5" r="1" />
        <circle cx="205" cy="13" r="0.7" />
        <circle cx="270" cy="7" r="0.9" />
        <circle cx="330" cy="18" r="0.8" />
      </g>
      <g fill={INK}>
        <path transform="translate(20 12) scale(0.5)" d={BAT} />
        <path transform="translate(120 24) scale(0.36)" d={BAT} />
        <path transform="translate(230 8) scale(0.46)" d={BAT} />
        <path transform="translate(300 20) scale(0.32)" d={BAT} />
      </g>
      <path d="M0 56V44c30-8 60-8 90-2s60 4 90-4 60-6 90 0 60 8 90 2V56Z" fill={INK} opacity="0.25" />
    </PatternLayer>

    {/* mid: the town — rooftops, a church, bare trees, gravestones, a fence */}
    <PatternLayer id="fd-hw-mid" tile={360} className={styles.mid} opacity={0.12}>
      <g fill={INK}>
        <path d="M0 56V40h14l6-10 6 10h6V30h4v-6l3-4 3 4v6h3v10h10l8-12 8 12h4V38h18v18Z" />
        <path d="M96 56V46l1-1 .5-8 2.5-3 2.5 3 .5 8 1 1v10Z" />
        <path d="M118 56V42c-3-2-4-6-3-10-2 1-4 0-5-2 3 0 5-2 6-4 1 2 3 3 5 2-1 3 0 6 2 8 3-1 5-3 5-6 1 3 0 6-2 8 3 1 5 3 4 6-3-1-5 0-6 2 1 2 2 4 1 6-2-1-4-2-4-4V56Z" />
        <path d="M150 56V44h3v-4l2-3 2 3v4h4v-4l2-3 2 3v4h4v-4l2-3 2 3v4h4v-4l2-3 2 3v4h3v12Z" />
        <path d="M200 56V36h6V28l5-7 5 7v8h6v-4h4v4h6v20Z" />
        <path d="M232 56v-8a4 4 0 0 1 8 0v8zM244 56v-6a3 3 0 0 1 6 0v6z" />
        <path d="M260 56V44h8l4-8 4 8h6v-6h5v6h8V56Z" />
        <path d="M300 56V46l1-1 .5-8 2.5-3 2.5 3 .5 8 1 1v10Z" />
        <path d="M322 56V44h3v-4l2-3 2 3v4h4v-4l2-3 2 3v4h4v-4l2-3 2 3v4h3v12Z" />
      </g>
    </PatternLayer>

    {/* fog: soft patches drifting along the floor, slower than the town behind them */}
    <PatternLayer id="fd-hw-fog" tile={300} className={styles.fog} opacity={0.9}>
      <g fill="var(--erd-color-bg-elevated, #fff)" opacity="0.55">
        <ellipse cx="40" cy="54" rx="44" ry="5" />
        <ellipse cx="150" cy="55" rx="60" ry="4" />
        <ellipse cx="250" cy="53" rx="40" ry="5.5" />
      </g>
    </PatternLayer>

    {/* near: the crescent with a witch crossing it, a cobweb in the corner, the ghost,
        a cauldron, a black cat, pumpkins and a haunted house on the floor, a bare
        branch at the right; bunting strung across the top */}
    <svg className={styles.near} style={{ left: '9%', top: 3 }} viewBox="0 0 40 32" width="30" height="24">
      <path d="M26 2a13 13 0 1 0 8 23A11 11 0 0 1 26 2z" fill="#f5d777" opacity="0.85" />
    </svg>
    {/* the traveller: the witch on her broom, flying the length of the sky — past the
        moon on her way, which is where she used to sit */}
    <Traveller top={5} width={44} height={22} viewBox="0 0 40 20" duration={44} delay={-10}>
      <g fill={INK} opacity="0.7">
        <path d="M2 14l14-3 1-2 3 1-2 3 8 1-1 1.5-8-.5-1 2.5 2 3-3-1-1-3-12 1z" />
        <path d="M16 9l-4-7 6 1z" />
        <path d="M2 14l-2 1 2 1z" />
      </g>
    </Traveller>
    {/* two bats close by, wings going */}
    {[
      { left: '30%', top: 6, scale: 0.34, delay: '0s' },
      { left: '80%', top: 12, scale: 0.28, delay: '-0.3s' },
    ].map(({ left, top, scale, delay }) => (
      <svg
        key={left}
        className={styles.near}
        style={{ left, top }}
        viewBox="0 0 48 24"
        width={48 * scale}
        height={24 * scale}
      >
        <g className={styles.flap} style={{ animationDelay: delay }}>
          <path d={BAT} fill={INK} opacity="0.75" />
        </g>
      </svg>
    ))}
    <svg className={styles.near} style={{ left: 0, top: 0 }} viewBox="0 0 30 30" width="26" height="26">
      <g fill="none" stroke={INK} strokeWidth="0.6" opacity="0.35">
        <path d="M0 0v26M0 0h26M0 0l20 20" />
        <path d="M0 8q4 1 6 6M0 15q7 2 11 11M0 22q9 3 14 8" />
        <path d="M8 0q1 4 6 6M15 0q2 7 11 11M22 0q3 9 8 14" />
      </g>
    </svg>
    <svg
      className={`${styles.near} ${styles.breathe}`}
      style={{ left: '61%', top: 8 }}
      viewBox="0 0 32 40"
      width="18"
      height="22"
    >
      <path
        d="M4 38V16a12 12 0 0 1 24 0v22c-2-2.4-4-2.4-6 0-2-2.4-4-2.4-6 0-2-2.4-4-2.4-6 0-2-2.4-4-2.4-6 0z"
        fill="#f2f2f7"
        opacity="0.9"
      />
      <ellipse cx="11.5" cy="16" rx="2" ry="2.6" fill="#3b3b46" />
      <ellipse cx="20.5" cy="16" rx="2" ry="2.6" fill="#3b3b46" />
      <ellipse cx="16" cy="23" rx="2" ry="2.8" fill="#3b3b46" />
    </svg>
    {/* the scarecrow, at the left of the field */}
    <svg className={styles.near} style={{ left: '13%', top: 56 - 30 }} viewBox="0 0 24 30" width="22" height="28">
      <path d="M12 30V8M4 12h16" stroke="#7a4e2a" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 12l-1 9h14l-1-9z" fill="#8a6b3f" />
      <path d="M5 14h14" stroke="#e5484d" strokeWidth="1.2" />
      <circle cx="12" cy="7" r="4.5" fill="#e8c27a" />
      <path d="M6 4l6-3 6 3-1 1H7z" fill="#5a3a20" />
      <circle cx="10.5" cy="7" r="0.7" fill="#2b2b33" />
      <circle cx="13.5" cy="7" r="0.7" fill="#2b2b33" />
      <path d="M3 19l-2 4M21 19l2 4" stroke="#c9a04a" strokeWidth="1" strokeLinecap="round" />
    </svg>
    {/* tombstones with a leaning cross */}
    <svg className={styles.near} style={{ left: '27%', top: 56 - 16 }} viewBox="0 0 28 16" width="24" height="14">
      <path d="M2 16v-8a5 5 0 0 1 10 0v8z" fill={INK} opacity="0.55" />
      <path d="M5 9h4M7 7v6" stroke="#f2f2f7" strokeWidth="0.8" opacity="0.7" />
      <path d="M16 16v-6a4 4 0 0 1 8 0v6z" fill={INK} opacity="0.5" />
      <path d="M26 16l-1.5-11M22 8l6-1" stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
    </svg>
    {/* a pumpkin bucket of candy */}
    <svg className={styles.near} style={{ left: '56%', top: 56 - 14 }} viewBox="0 0 18 16" width="16" height="14">
      <path d="M2 6q7 6 14 0" fill="none" stroke="#2b2b33" strokeWidth="1" />
      <path d="M2 6l2 10h10l2-10z" fill="#ef8a2c" />
      <path d="M5 9l2 2H4zM11 9l2 2h-3z" fill="#3b1d0c" />
      <circle cx="5" cy="5" r="1.6" fill="#7a5cc6" />
      <circle cx="9" cy="4" r="1.6" fill="#8fe388" />
      <circle cx="13" cy="5" r="1.6" fill="#ff5c5c" />
    </svg>
    {/* a small ghost peeking from behind the house */}
    <svg
      className={`${styles.near} ${styles.twinkleLate}`}
      style={{ left: '74%', top: 56 - 30 }}
      viewBox="0 0 16 18"
      width="12"
      height="14"
    >
      <path
        d="M2 18V8a6 6 0 0 1 12 0v10c-1-1.2-2-1.2-3 0-1-1.2-2-1.2-3 0-1-1.2-2-1.2-3 0-1-1.2-2-1.2-3 0z"
        fill="#f2f2f7"
        opacity="0.9"
      />
      <circle cx="5.8" cy="8" r="1" fill="#3b3b46" />
      <circle cx="10.2" cy="8" r="1" fill="#3b3b46" />
    </svg>
    {/* eyes glowing in the dark of the town */}
    {[
      { left: '38%', top: 44, cls: styles.twinkle },
      { left: '90%', top: 40, cls: styles.twinkleLate },
    ].map(({ left, top, cls }) => (
      <svg
        key={left}
        className={`${styles.near} ${cls}`}
        style={{ left, top }}
        viewBox="0 0 12 4"
        width="10"
        height="3.5"
      >
        <ellipse cx="3" cy="2" rx="2.4" ry="1.6" fill="#f5d777" />
        <ellipse cx="9" cy="2" rx="2.4" ry="1.6" fill="#f5d777" />
        <circle cx="3" cy="2" r="0.7" fill="#2b2b33" />
        <circle cx="9" cy="2" r="0.7" fill="#2b2b33" />
      </svg>
    ))}
    {/* cauldron */}
    <svg className={styles.near} style={{ left: '22%', top: 56 - 18 }} viewBox="0 0 24 24" width="18" height="18">
      <g className={styles.breathe} fill="#7ed957">
        <circle cx="8" cy="6" r="1.6" opacity="0.8" />
        <circle cx="14" cy="3" r="1.1" opacity="0.6" />
        <circle cx="17" cy="7" r="1.3" opacity="0.7" />
      </g>
      <ellipse cx="12" cy="10" rx="9" ry="2.4" fill="#5fb84a" />
      <path d="M3 10q9 4 18 0v4a9 8 0 0 1-18 0z" fill="#2b2b33" />
      <path d="M3 10q9 4 18 0" fill="none" stroke="#3d3d48" strokeWidth="1" />
      <path d="M6 22h3M15 22h3" stroke="#2b2b33" strokeWidth="2" strokeLinecap="round" />
    </svg>
    {/* pumpkins */}
    {[
      { left: '31%', size: 22 },
      { left: '43%', size: 16 },
      { left: '82%', size: 19 },
    ].map(({ left, size }) => (
      <svg
        key={left}
        className={styles.near}
        style={{ left, top: 56 - size }}
        viewBox="0 0 44 44"
        width={size}
        height={size}
      >
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
    {/* the black cat, sitting */}
    <svg className={styles.near} style={{ left: '51%', top: 56 - 16 }} viewBox="0 0 20 20" width="16" height="16">
      <path d="M4 20v-8a5 5 0 0 1 4-5V4l2 2 2-2v3a5 5 0 0 1 4 5v8z" fill="#1f1f26" />
      <path d="M16 18q4-2 2-8" fill="none" stroke="#1f1f26" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8.3" cy="9.5" r="0.9" fill="#8fe388" />
      <circle cx="11.7" cy="9.5" r="0.9" fill="#8fe388" />
    </svg>
    {/* the haunted house, windows lit */}
    <svg className={styles.near} style={{ left: '68%', top: 56 - 30 }} viewBox="0 0 34 30" width="34" height="30">
      <path d="M2 30V14l7-8 7 8v16zM16 30V10l8-8 8 8v20z" fill={INK} opacity="0.75" />
      <path d="M13 6h3V1h-3z" fill={INK} opacity="0.75" />
      <g className={styles.breathe} fill="#ffcf5c">
        <rect x="6" y="16" width="3.5" height="4" />
        <rect x="20" y="13" width="3.5" height="4.5" />
        <rect x="26" y="13" width="3.5" height="4.5" />
        <rect x="21" y="23" width="4" height="7" opacity="0.7" />
      </g>
    </svg>
    {/* a bare branch leaning in from the right, a bat hanging from it */}
    <svg className={styles.near} style={{ right: 0, top: 2 }} viewBox="0 0 70 46" width="70" height="46">
      <path
        d="M70 4c-10 4-20 12-30 22-8 8-18 14-30 18"
        fill="none"
        stroke={INK}
        strokeWidth="1.2"
        opacity="0.55"
        strokeLinecap="round"
      />
      <path
        d="M56 12c-5 0-9 3-11 7M42 26c-5 1-9 4-11 8M50 16c3-4 8-6 12-6"
        fill="none"
        stroke={INK}
        strokeWidth="0.9"
        opacity="0.45"
        strokeLinecap="round"
      />
      <path transform="translate(28 30) scale(0.42)" d={BAT} fill={INK} opacity="0.7" />
      {/* an owl, sitting where the branch is thickest */}
      <g transform="translate(50 6)">
        <path d="M0 14V6a5 5 0 0 1 10 0v8z" fill={INK} opacity="0.75" />
        <path d="M0 6l1-3 2 2M10 6l-1-3-2 2" fill={INK} opacity="0.75" />
        <circle cx="3.2" cy="6.5" r="1.6" fill="#f5d777" />
        <circle cx="6.8" cy="6.5" r="1.6" fill="#f5d777" />
        <circle cx="3.2" cy="6.5" r="0.6" fill="#2b2b33" />
        <circle cx="6.8" cy="6.5" r="0.6" fill="#2b2b33" />
        <path d="M5 8.5l-.8 1.2h1.6z" fill="#ef8a2c" />
      </g>
    </svg>
    {/* bunting */}
    <svg className={styles.string} viewBox="0 0 400 56" preserveAspectRatio="none" width="100%" height="56">
      <path d="M0 2q200 14 400 0" fill="none" stroke={INK} strokeWidth="0.8" opacity="0.35" />
    </svg>
    {[0.06, 0.15, 0.24, 0.33, 0.42, 0.51, 0.6, 0.69, 0.78, 0.87, 0.95].map((at, i) => (
      <BuntingFlag key={at} at={at} color={i % 2 === 0 ? '#ef8a2c' : '#7a5cc6'} />
    ))}
    {/* little bats hanging upside down between the flags */}
    {[0.195, 0.465, 0.735].map((at) => (
      <svg
        key={at}
        className={styles.near}
        style={{ left: `${at * 100}%`, top: 2 + 28 * at * (1 - at), transform: 'translateX(-50%)' }}
        viewBox="-5 0 10 12"
        width="10"
        height="12"
      >
        <path d="M0 0v3" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        <path d="M-1.5 3h3l.5 5-2 3-2-3z" fill={INK} opacity="0.7" />
        <path d="M-1.5 4l-3 3 2 1zM1.5 4l3 3-2 1z" fill={INK} opacity="0.7" />
      </svg>
    ))}
    {/* a spider on its thread, dropped from the bunting */}
    <svg className={styles.near} style={{ left: '46%', top: 10 }} viewBox="0 0 12 22" width="10" height="18">
      <path d="M6 0v12" stroke={INK} strokeWidth="0.6" opacity="0.5" />
      <circle cx="6" cy="14" r="1.6" fill="#2b2b33" />
      <circle cx="6" cy="18" r="2.6" fill="#2b2b33" />
      <path
        d="M3.5 16l-3-2M8.5 16l3-2M3.4 18H0M8.6 18H12M3.5 20l-3 2M8.5 20l3 2"
        stroke="#2b2b33"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  </>
);

/* ---------- Christmas: fairy lights over a snowy village ---------- */

/** One bulb on the light string, hung by a fraction of the width off the same sagging
 *  line; the colours cycle, and two twinkle phases alternate along it. */
const FairyLight: React.FC<{ at: number; color: string; late: boolean }> = ({ at, color, late }) => {
  const drop = 2 + 28 * at * (1 - at);
  return (
    <svg
      className={`${styles.near} ${late ? styles.twinkleLate : styles.twinkle}`}
      style={{ left: `${at * 100}%`, top: drop - 1, transform: 'translateX(-50%)' }}
      viewBox="-6 0 12 12"
      width="12"
      height="12"
    >
      <g className={styles.sway} style={swayAt(at)}>
        <path d="M0 0v2" stroke="#8a8a96" strokeWidth="0.8" />
        <circle cx="0" cy="6" r="5" fill={color} opacity="0.3" />
        <circle cx="0" cy="6" r="2.4" fill={color} />
      </g>
    </svg>
  );
};

const LIGHT_COLORS = ['#ff5c5c', '#f5d777', '#5cc282', '#6fb3ff'];

const Christmas: React.FC = () => (
  <>
    <div
      className={styles.sky}
      style={{
        background:
          'linear-gradient(180deg, rgba(60, 100, 170, 0.14) 0%, rgba(60, 100, 170, 0.03) 70%, rgba(60, 100, 170, 0) 100%), linear-gradient(90deg, rgba(90, 150, 220, 0) 0%, rgba(90, 150, 220, 0.10) 30%, rgba(90, 150, 220, 0.10) 70%, rgba(90, 150, 220, 0) 100%)',
      }}
    />

    {/* far: stars, snowy hills with distant pines */}
    <PatternLayer id="fd-xm-far" tile={320} className={styles.far} opacity={0.4}>
      <g fill="#fff" opacity="0.8">
        <circle cx="24" cy="8" r="0.9" />
        <circle cx="80" cy="15" r="0.7" />
        <circle cx="140" cy="5" r="1" />
        <circle cx="200" cy="12" r="0.7" />
        <circle cx="260" cy="7" r="0.9" />
        <circle cx="300" cy="17" r="0.7" />
      </g>
      <path d="M0 56V40c30-8 60-8 90 0s60 8 90 0 60-8 90 0 40 6 50 6V56Z" fill={INK} opacity="0.3" />
      <g fill={INK} opacity="0.3">
        <path d="M40 40l5-12 5 12zM100 42l4-10 4 10zM190 41l5-13 5 13zM260 43l4-9 4 9z" />
      </g>
    </PatternLayer>

    {/* mid: the village edge — pines, a hut, a fence, a church */}
    <PatternLayer id="fd-xm-mid" tile={320} className={styles.mid} opacity={0.14}>
      <g fill={INK}>
        <path d="M0 56V48l8-14 3 5 2-4 9 13v8Z" />
        <path d="M40 56v-6l10-18 3 6 3-5 11 17v6Z" />
        <path d="M76 56V44l9-8 9 8v12z" />
        <path d="M100 56v-8l7-12 3 4 2-3 8 11v8Z" />
        <path d="M130 56v-6h3v-2h2v2h3v-2h2v2h3v-2h2v2h3v6z" />
        <path d="M160 56V40h8V32l4-6 4 6v8h4v-4h3v4h5v16z" />
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

    {/* near: the tree and gifts, a snowman, candy canes in the snow, a cabin with its
        window lit, a reindeer on the ridge, holly at the right; fairy lights strung
        across the top — and a lamppost, a gingerbread man, a sled, a fence, a second
        tree, a sleigh crossing the sky, mistletoe at the left */}
    {/* the traveller: the sleigh and its reindeer, crossing the sky above the village */}
    <Traveller top={3} width={64} height={16} viewBox="0 0 64 16" duration={50} delay={-7}>
      <g fill={INK} opacity="0.6">
        <path d="M0 12l4-1 2-6h6l1 3h10l2-3h6l1 3 4-1v3l-2 2H2z" />
        <path d="M40 11l3-6h3l1 2 3-2h3l2 4 3-1v3l-2 2h-16zM46 5l-1-3h1l1 3zM48 5l1-3h1l-1 3z" />
        <path d="M54 11l3-6h3l1 2 3-2v7z" />
      </g>
      <circle cx="61" cy="8" r="1" fill="#ff5c5c" />
    </Traveller>
    {/* the star of the night */}
    <svg
      className={`${styles.near} ${styles.twinkle}`}
      style={{ left: '64%', top: 4 }}
      viewBox="0 0 14 14"
      width="12"
      height="12"
    >
      <path d="M7 0c.5 4 2.5 6.5 7 7-4.5.5-6.5 3-7 7-.5-4-2.5-6.5-7-7 4.5-.5 6.5-3 7-7z" fill="#f5d777" />
    </svg>
    {/* a lamppost with its warm light */}
    <svg className={styles.near} style={{ left: '12%', top: 56 - 34 }} viewBox="0 0 14 34" width="12" height="32">
      <path d="M7 34V9" stroke="#2b2b33" strokeWidth="1.6" />
      <path d="M3 34h8" stroke="#2b2b33" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 9h8l-1-6H4z" fill="#2b2b33" />
      <g className={styles.breathe}>
        <rect x="4.5" y="4" width="5" height="4.5" fill="#ffcf5c" />
        <circle cx="7" cy="7" r="6" fill="#ffcf5c" opacity="0.18" />
      </g>
      <path d="M2 3h10" stroke="#2b2b33" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2 3q5-2 10 0" fill="#fff" />
    </svg>
    {/* the gingerbread man */}
    <svg className={styles.near} style={{ left: '37%', top: 56 - 18 }} viewBox="0 0 14 18" width="13" height="17">
      <circle cx="7" cy="4" r="3.5" fill="#b9702f" />
      <path d="M5 7h4l3 3-1 2-2-1v7H5v-7l-2 1-1-2z" fill="#b9702f" />
      <circle cx="5.8" cy="3.5" r="0.6" fill="#2b2b33" />
      <circle cx="8.2" cy="3.5" r="0.6" fill="#2b2b33" />
      <path d="M5.5 5.5q1.5 1.2 3 0" fill="none" stroke="#2b2b33" strokeWidth="0.6" />
      <circle cx="7" cy="9.5" r="0.7" fill="#fff" />
      <circle cx="7" cy="12" r="0.7" fill="#fff" />
      <path d="M4 7.5q-1 .8-1.6 1.6M10 7.5q1 .8 1.6 1.6" stroke="#fff" strokeWidth="0.6" />
    </svg>
    {/* a fence half-buried in the snow */}
    <svg className={styles.near} style={{ left: '49%', top: 56 - 12 }} viewBox="0 0 34 12" width="32" height="11">
      <g fill="#7a4e2a">
        <path d="M2 12V4l2-2 2 2v8zM10 12V4l2-2 2 2v8zM18 12V4l2-2 2 2v8zM26 12V4l2-2 2 2v8z" />
        <rect x="0" y="5" width="34" height="1.6" />
        <rect x="0" y="9" width="34" height="1.6" />
      </g>
      <path d="M2 4h4M10 4h4M18 4h4M26 4h4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
    {/* a sled with a gift on it */}
    <svg className={styles.near} style={{ left: '66%', top: 56 - 14 }} viewBox="0 0 26 14" width="24" height="13">
      <path d="M2 12q1 2 3 2h18q2 0 3-2" fill="none" stroke="#7a4e2a" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="5" y="8" width="17" height="3" rx="1" fill="#a86b3a" />
      <path d="M6 8V6M21 8V6" stroke="#a86b3a" strokeWidth="1.2" />
      <rect x="9" y="1" width="8" height="7" rx="1" fill="#3f9a63" />
      <rect x="12.5" y="1" width="1.6" height="7" fill="#f5d777" />
      <rect x="9" y="3.8" width="8" height="1.6" fill="#f5d777" />
    </svg>
    {/* a second, smaller tree */}
    <svg className={styles.near} style={{ left: '86%', top: 56 - 22 }} viewBox="0 0 20 24" width="18" height="22">
      <path d="M10 1l5 7H5z" fill="#3f9a63" />
      <path d="M10 6l6 8H4z" fill="#358a57" />
      <path d="M10 12l8 9H2z" fill="#2c7a4b" />
      <rect x="8.5" y="21" width="3" height="3" fill="#7a4e2a" />
      <circle className={styles.twinkleLate} cx="8" cy="10" r="1" fill="#ff6b6b" />
      <circle className={styles.twinkle} cx="12" cy="15" r="1" fill="#f5d777" />
      <circle className={styles.twinkleLate} cx="7" cy="18" r="1" fill="#6fb3ff" />
    </svg>
    {/* mistletoe at the left, mirroring the holly */}
    <svg className={styles.near} style={{ left: 0, top: 12 }} viewBox="0 0 60 40" width="52" height="35" opacity="0.8">
      <path
        d="M0 4c10 2 20 8 28 16 6 6 12 12 20 16"
        fill="none"
        stroke="#5f8f3e"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <g fill="#8fbf6a">
        <path d="M10 8c3-2 7-1 8 2-1 1-3 1-3 3 2 0 3 2 2 4-3 0-6-2-7-5-2 0-3-2 0-4z" />
        <path d="M24 20c3-2 7-1 8 2-1 1-3 1-3 3 2 0 3 2 2 4-3 0-6-2-7-5-2 0-3-2 0-4z" />
      </g>
      <g fill="#f2f2f7" stroke="#c9c9d2" strokeWidth="0.5">
        <circle cx="16" cy="15" r="1.7" />
        <circle cx="19" cy="17" r="1.5" />
        <circle cx="30" cy="27" r="1.7" />
        <circle cx="33" cy="29" r="1.5" />
      </g>
    </svg>
    <svg className={styles.near} style={{ left: '20%', top: 56 - 34 }} viewBox="0 0 30 36" width="28" height="34">
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
      { left: '25%', w: 14, h: 12 },
      { left: '27.5%', w: 10, h: 9 },
    ].map(({ left, w, h }) => (
      <svg key={left} className={styles.near} style={{ left, top: 56 - h }} viewBox="0 0 32 28" width={w} height={h}>
        <rect x="2" y="8" width="28" height="19" rx="2" fill="#e04e56" />
        <rect x="13" y="8" width="6" height="19" fill="#f5d777" />
        <rect x="1" y="7" width="30" height="5" rx="1.5" fill="#c93a42" />
      </svg>
    ))}
    {/* candy canes stuck in the snow */}
    <svg className={styles.near} style={{ left: '33%', top: 56 - 16 }} viewBox="0 0 20 20" width="16" height="16">
      <g fill="none" strokeLinecap="round">
        <path d="M4 20V8a3.5 3.5 0 0 1 7 0" stroke="#e5e5ec" strokeWidth="3.4" />
        <path d="M4 20V8a3.5 3.5 0 0 1 7 0" stroke="#fff" strokeWidth="2.8" />
        <path d="M4 20V8a3.5 3.5 0 0 1 7 0" stroke="#e5484d" strokeWidth="2.8" strokeDasharray="2.2 2.2" />
        <path d="M12 20v-8a3 3 0 0 1 6 0" stroke="#e5e5ec" strokeWidth="3" />
        <path d="M12 20v-8a3 3 0 0 1 6 0" stroke="#fff" strokeWidth="2.4" />
        <path d="M12 20v-8a3 3 0 0 1 6 0" stroke="#e5484d" strokeWidth="2.4" strokeDasharray="2 2" />
      </g>
    </svg>
    {/* the snowman */}
    <svg className={styles.near} style={{ left: '42%', top: 56 - 26 }} viewBox="0 0 22 28" width="20" height="26">
      <circle cx="11" cy="20" r="7.5" fill="#fff" stroke="#d6dbe6" strokeWidth="0.8" />
      <circle cx="11" cy="9" r="5.5" fill="#fff" stroke="#d6dbe6" strokeWidth="0.8" />
      <rect x="6" y="1" width="10" height="2" rx="0.6" fill="#2b2b33" />
      <rect x="7.5" y="-2" width="7" height="4" fill="#2b2b33" />
      <circle cx="9" cy="8" r="0.8" fill="#2b2b33" />
      <circle cx="13" cy="8" r="0.8" fill="#2b2b33" />
      <path d="M11 9.5l4 1-4 1z" fill="#f28c28" />
      <path d="M6 13.5q5 2.5 10 0l1 2q-6 3-12 0z" fill="#e5484d" />
      <circle cx="11" cy="18" r="0.8" fill="#2b2b33" />
      <circle cx="11" cy="21.5" r="0.8" fill="#2b2b33" />
      <path d="M4 17l-4-3M18 17l4-3" stroke="#7a4e2a" strokeWidth="1" strokeLinecap="round" />
    </svg>
    {/* the cabin, window lit */}
    <svg className={styles.near} style={{ left: '58%', top: 56 - 26 }} viewBox="0 0 36 26" width="36" height="26">
      <rect x="5" y="10" width="26" height="16" fill="#7a4e2a" />
      <path d="M2 11l16-9 16 9z" fill="#fff" stroke="#d6dbe6" strokeWidth="0.8" />
      <rect x="24" y="1" width="4" height="7" fill="#5a3a20" />
      {/* smoke from the chimney, one puff after another */}
      {[0, 1.2, 2.4].map((delay) => (
        <circle
          key={delay}
          className={styles.smoke}
          style={{ animationDelay: `${delay}s` }}
          cx="26"
          cy="0"
          r="2"
          fill="#c9c9d2"
        />
      ))}
      <rect x="8" y="14" width="7" height="12" fill="#5a3a20" />
      <g className={styles.breathe}>
        <rect x="19" y="14" width="8" height="7" fill="#ffcf5c" />
        <rect x="19" y="14" width="8" height="7" fill="none" stroke="#5a3a20" strokeWidth="0.8" />
        <path d="M23 14v7M19 17.5h8" stroke="#5a3a20" strokeWidth="0.8" />
      </g>
      <rect x="4" y="9" width="28" height="2" fill="#fff" />
      <circle cx="11.5" cy="17" r="2.6" fill="none" stroke="#3f9a63" strokeWidth="1.6" />
      <circle cx="11.5" cy="14.6" r="0.7" fill="#e5484d" />
      <circle cx="9.3" cy="18.5" r="0.6" fill="#e5484d" />
      <circle cx="13.7" cy="18.5" r="0.6" fill="#e5484d" />
    </svg>
    {/* the reindeer, on the ridge */}
    <svg className={styles.near} style={{ left: '74%', top: 56 - 22 }} viewBox="0 0 26 22" width="24" height="20">
      <g fill={INK} opacity="0.7">
        <path d="M6 22v-8l-2-4 3-3h8l4 2 3-4 2 1-3 5v11h-2v-7h-2v7h-2v-6H9v6z" />
        <path d="M17 6l-2-4 1-1 2 4zM19 5l1-4h1l-1 4z" />
      </g>
      <circle cx="21.5" cy="7.5" r="1" fill="#ff5c5c" />
    </svg>
    {/* holly leaning in from the right */}
    <svg className={styles.near} style={{ right: 0, top: 6 }} viewBox="0 0 70 46" width="70" height="46">
      <path
        d="M70 6c-12 2-24 8-34 18-8 8-16 14-26 18"
        fill="none"
        stroke="#2c7a4b"
        strokeWidth="1.2"
        opacity="0.7"
        strokeLinecap="round"
      />
      <g fill="#3f9a63" opacity="0.85">
        <path d="M58 10c-3-2-7-1-9 2 1 1 3 1 3 3-2 0-3 2-2 4 3 0 6-2 7-5 2 0 3-2 1-4z" />
        <path d="M44 22c-3-2-7-1-9 2 1 1 3 1 3 3-2 0-3 2-2 4 3 0 6-2 7-5 2 0 3-2 1-4z" />
        <path d="M30 33c-3-2-7-1-9 2 1 1 3 1 3 3-2 0-3 2-2 4 3 0 6-2 7-5 2 0 3-2 1-4z" />
      </g>
      <g fill="#e5484d">
        <circle cx="52" cy="18" r="1.6" />
        <circle cx="49" cy="20" r="1.4" />
        <circle cx="53" cy="21.5" r="1.3" />
        <circle cx="38" cy="30" r="1.6" />
        <circle cx="35" cy="32" r="1.4" />
        <circle cx="39" cy="33.5" r="1.3" />
      </g>
    </svg>
    {/* fairy lights */}
    <svg className={styles.string} viewBox="0 0 400 56" preserveAspectRatio="none" width="100%" height="56">
      <path d="M0 2q200 14 400 0" fill="none" stroke="#8a8a96" strokeWidth="0.8" opacity="0.5" />
    </svg>
    {[0.05, 0.13, 0.21, 0.29, 0.37, 0.45, 0.53, 0.61, 0.69, 0.77, 0.85, 0.93].map((at, i) => (
      <FairyLight key={at} at={at} color={LIGHT_COLORS[i % LIGHT_COLORS.length]} late={i % 2 === 1} />
    ))}
    {/* golden bells between the bulbs */}
    {[0.17, 0.41, 0.65, 0.89].map((at) => (
      <svg
        key={at}
        className={styles.near}
        style={{ left: `${at * 100}%`, top: 2 + 28 * at * (1 - at), transform: 'translateX(-50%)' }}
        viewBox="-5 0 10 14"
        width="10"
        height="14"
      >
        <g className={styles.sway} style={swayAt(at)}>
          <path d="M0 0v2" stroke="#8a8a96" strokeWidth="0.8" />
          <path d="M-1.5 3h3l1 2M-1.5 3v5" fill="none" stroke="#e5484d" strokeWidth="1" />
          <path d="M-4 11q0-6 4-7 4 1 4 7z" fill="#f2c14e" />
          <rect x="-4.5" y="11" width="9" height="1.4" rx="0.7" fill="#d9a83f" />
          <circle cx="0" cy="13" r="1" fill="#d9a83f" />
        </g>
      </svg>
    ))}
  </>
);

/* ---------- Lunar New Year: red lanterns over tiled roofs, a lion and dragon through the town, plum petals ---------- */

/** A red lantern on the string, the New Year kind: round, red, a gold cap and foot, a
 *  tassel; hung off the same sagging curve as the other festivals' strings. */
const RedLantern: React.FC<{ at: number; size: number }> = ({ at, size }) => {
  const drop = 2 + 28 * at * (1 - at);
  return (
    <svg
      className={styles.near}
      style={{ left: `${at * 100}%`, top: drop, transform: 'translateX(-50%)' }}
      viewBox="-10 0 20 30"
      width={20 * size}
      height={30 * size}
    >
      <g className={styles.sway} style={swayAt(at)}>
        <path d="M0 0v3" stroke="#d9a83f" strokeWidth="1" />
        <ellipse className={styles.breathe} cx="0" cy="12" rx="9.5" ry="9" fill="#ffb15c" opacity="0.28" />
        <rect x="-3.5" y="3" width="7" height="2" rx="1" fill="#f2c14e" />
        <ellipse cx="0" cy="12" rx="7.5" ry="7" fill="#d8232a" />
        <ellipse cx="0" cy="12" rx="3" ry="7" fill="#f04a4f" opacity="0.7" />
        <path d="M-5.5 12h11" stroke="#b0161c" strokeWidth="0.6" opacity="0.6" />
        <rect x="-3.5" y="18" width="7" height="2" rx="1" fill="#f2c14e" />
        <path d="M-1.2 20v5M0 20v6M1.2 20v5" stroke="#f2c14e" strokeWidth="0.8" strokeLinecap="round" />
      </g>
    </svg>
  );
};

/** A firework burst: rays out from a centre, in one colour, twinkling. */
const Firework: React.FC<{ left: string; top: number; size: number; color: string; late: boolean }> = ({
  left,
  top,
  size,
  color,
  late,
}) => (
  <svg
    className={`${styles.near} ${late ? styles.twinkleLate : styles.twinkle}`}
    style={{ left, top }}
    viewBox="-10 -10 20 20"
    width={size}
    height={size}
  >
    <g stroke={color} strokeWidth="0.9" strokeLinecap="round" fill="none">
      <path d="M0-9v4M0 9v-4M-9 0h4M9 0h-4M-6.4-6.4l2.8 2.8M6.4 6.4l-2.8-2.8M-6.4 6.4l2.8-2.8M6.4-6.4l-2.8 2.8" />
    </g>
    <g fill={color}>
      <circle cx="0" cy="-9" r="1" />
      <circle cx="0" cy="9" r="1" />
      <circle cx="-9" cy="0" r="1" />
      <circle cx="9" cy="0" r="1" />
      <circle cx="-6.4" cy="-6.4" r="0.8" />
      <circle cx="6.4" cy="6.4" r="0.8" />
      <circle cx="-6.4" cy="6.4" r="0.8" />
      <circle cx="6.4" cy="-6.4" r="0.8" />
    </g>
    <circle cx="0" cy="0" r="1.4" fill="#fff" opacity="0.8" />
  </svg>
);

/** The dragon's body: seven hoops, each overlapping its neighbour by about half, on four
 *  poles. Long and slim rather than short and thick — at this size four fat hoops read as
 *  a prawn, and what makes a dragon legible here is the length of the ribbon and the wave
 *  running down it, not a face 20px tall. One lift period (1.6s) is split nine ways (tail,
 *  seven hoops, head), so the wave reaches each hoop a ninth later than the one behind it.
 */
const DRAGON_HOOPS = [18, 28, 38, 48, 58, 68, 78].map((x, i) => ({
  x,
  delay: -((i + 1) * 0.178),
  pole: i % 2 === 0,
}));

/** The dancers under the poles, on the same phase as the hoop each one carries. */
const DRAGON_POLES = DRAGON_HOOPS.filter((hoop) => hoop.pole);

const LunarNewYear: React.FC = () => (
  <>
    <div
      className={styles.sky}
      style={{
        background:
          'linear-gradient(180deg, rgba(200, 40, 50, 0.13) 0%, rgba(200, 40, 50, 0.03) 70%, rgba(200, 40, 50, 0) 100%), linear-gradient(90deg, rgba(230, 150, 40, 0) 0%, rgba(230, 150, 40, 0.10) 30%, rgba(230, 150, 40, 0.10) 70%, rgba(230, 150, 40, 0) 100%)',
      }}
    />

    {/* far: a night with fireworks already faded into stars, and a town of tiled roofs
        with turned-up eaves — a gate tower and a pagoda among them */}
    <PatternLayer id="fd-ny-far" tile={360} className={styles.far} opacity={0.45}>
      <g fill="#f5d777">
        <circle cx="22" cy="10" r="1" />
        <circle cx="66" cy="19" r="0.7" />
        <circle cx="118" cy="7" r="1.2" />
        <circle cx="160" cy="16" r="0.8" />
        <circle cx="206" cy="5" r="0.9" />
        <circle cx="252" cy="13" r="1.1" />
        <circle cx="298" cy="20" r="0.7" />
        <circle cx="340" cy="9" r="1" />
      </g>
      {/* two bursts left hanging in the sky, in outline */}
      <g fill="none" stroke="#f5d777" strokeWidth="0.6" strokeLinecap="round" opacity="0.7">
        <path d="M90 14v-6M90 14v6M90 14h-6M90 14h6M90 14l-4-4M90 14l4 4M90 14l-4 4M90 14l4-4" />
        <path d="M270 10v-5M270 10v5M270 10h-5M270 10h5M270 10l-3.5-3.5M270 10l3.5 3.5M270 10l-3.5 3.5M270 10l3.5-3.5" />
      </g>
      {/* the town: tiled roofs, eaves turned up at the ends — kept faint, so it reads as
          a skyline behind the lanterns rather than a row of dark blocks */}
      <g fill={INK} opacity="0.13">
        <path d="M0 56V40l2-3 12 1 12-1 2 3v16z" />
        <path d="M0 40l3-4 11-2 11 2 3 4-2-1-12-1-12 1z" />
        <path d="M34 56V38l3-5 14 2 14-2 3 5v18z" />
        <path d="M32 38l5-6 14-3 14 3 5 6-3-2-16-1-16 1z" />
        <path d="M74 56V42l2-3 9 1 9-1 2 3v14z" />
        <path d="M72 42l4-5 9-2 9 2 4 5-3-1-10-1-10 1z" />
        {/* the gate tower: two roofs, one on the other */}
        <path d="M104 56V36h30v20z" />
        <path d="M100 36l4-5 15-2 15 2 4 5-3-1-16-1-16 1z" />
        <path d="M107 30v-6h24v6z" />
        <path d="M104 24l4-5 11-2 11 2 4 5-3-1-12-1-12 1z" />
        <path d="M146 56V41l2-3 10 1 10-1 2 3v15z" />
        <path d="M144 41l4-5 10-2 10 2 4 5-3-1-11-1-11 1z" />
        <path d="M180 56V39l3-5 13 2 13-2 3 5v17z" />
        <path d="M178 39l5-6 13-3 13 3 5 6-3-2-15-1-15 1z" />
        {/* a pagoda, five tiers */}
        <path d="M232 56V46h14v10zM230 46l4-3 5-1 5 1 4 3zM234 42v-4h10v4zM232 38l4-3 3-1 3 1 4 3zM236 34v-4h6v4zM235 30l4-3 2-1 2 1 4 3zM237 26v-3h4v3zM236 23l3-3h1l3 3zM239 20v-4h1v4z" />
        <path d="M258 56V42l2-3 9 1 9-1 2 3v14z" />
        <path d="M256 42l4-5 9-2 9 2 4 5-3-1-10-1-10 1z" />
        <path d="M290 56V38l3-5 14 2 14-2 3 5v18z" />
        <path d="M288 38l5-6 14-3 14 3 5 6-3-2-16-1-16 1z" />
        <path d="M332 56V41l2-3 10 1 10-1 2 3v15z" />
        <path d="M330 41l4-5 10-2 10 2 4 5-3-1-11-1-11 1z" />
      </g>
    </PatternLayer>

    {/* mid: auspicious clouds along the floor, and lantern posts down the street */}
    <PatternLayer id="fd-ny-mid" tile={320} className={styles.mid} opacity={0.16}>
      <g fill={INK}>
        {/* lantern posts, a paper lantern on each */}
        <path d="M60 56V34h1.5v22zM60.75 30l3 3-3 5-3-5z" />
        <path d="M150 56V36h1.5v20zM150.75 32l3 3-3 5-3-5z" />
        <path d="M212 56V34h1.5v22zM212.75 30l3 3-3 5-3-5z" />
        {/* clouds */}
        <path d="M0 56v-6a6 6 0 0 1 10-4 7 7 0 0 1 12 2 5 5 0 0 1 8-1v9z" opacity="0.7" />
        <path d="M232 56v-7a7 7 0 0 1 12-4 8 8 0 0 1 14 2 6 6 0 0 1 10-1 5 5 0 0 1 8 2v8z" opacity="0.7" />
        <path d="M290 56v-6a6 6 0 0 1 10-4 7 7 0 0 1 12 2 5 5 0 0 1 8-1v9z" opacity="0.7" />
      </g>
    </PatternLayer>

    {/* the traveller: the troupe down the street — the lion leading, the dragon behind it.

        The body is a row of hoops that overlap by about half, not a chain of separate
        pieces: at this size separate pieces read as four lanterns on sticks, which is
        exactly what the string above the band already is. Overlapped, they hold one
        silhouette however far apart the wave has pushed them, and the gold ridge along
        the top is what makes that silhouette a dragon rather than a caterpillar. Each
        hoop enters the same lift a phase later than the one behind it, so the wave runs
        forwards; the amplitude has to be worth seeing at 29px tall, so it is most of a
        hoop's height. */}
    <Traveller top={56 - 29} width={170} height={29} viewBox="0 0 200 36" duration={56} delay={-12}>
      {/* the dancers, in silhouette like every other figure, bouncing on the same beat as
          the hoop they carry — a fraction of its height, their feet being on the street */}
      {DRAGON_POLES.map(({ x, delay }) => (
        <g key={`d${x}`} className={styles.dragonStep} style={{ animationDelay: `${delay}s` }}>
          <g fill={INK} stroke={INK} opacity="0.5">
            <path d={`M${x - 1.7} 36v-5.5M${x + 1.7} 36v-5.5`} strokeWidth="1.5" strokeLinecap="round" />
            <path d={`M${x - 2.6} 31v-5q0-2.2 2.6-2.2t2.6 2.2v5z`} stroke="none" />
            <circle cx={x} cy="21.6" r="2" stroke="none" />
          </g>
        </g>
      ))}

      {/* the tail, the hoops and the head — the one near piece that is the festival, in
          its own red and gold, and would be lost as a grey ribbon */}
      <g className={styles.dragonLift} style={{ animationDelay: '0s' }}>
        <path d="M12 13l-8-6 1.3 6-6-1.7 4.4 4.4-5.3 1.7 7 1.8 6.6.8z" fill="#f2c14e" />
      </g>
      {DRAGON_HOOPS.map(({ x, delay, pole }) => (
        <g key={x} className={styles.dragonLift} style={{ animationDelay: `${delay}s` }}>
          {pole && <path d={`M${x} 13V28`} stroke={INK} strokeWidth="0.9" opacity="0.45" />}
          <ellipse cx={x} cy="13" rx="8" ry="6.8" fill="#d8232a" />
          <ellipse cx={x} cy="13" rx="8" ry="2.6" fill="#f04a4f" opacity="0.55" />
          <path d={`M${x - 3} 6.6l3-3 3 3z`} fill="#f2c14e" />
        </g>
      ))}
      <g className={styles.dragonLift} style={{ animationDelay: '-1.602s' }}>
        <g transform="translate(76 3) scale(0.82)">
          {/* the mane the head sits in front of, a gold sawtooth over the body's joint */}
          <path d="M2 6l5 4-4 3 5 3-4 3 5 3-4 3V6z" fill="#f2c14e" />
          {/* the skull: blunt at the front, because a muzzle that tapers to a point is a
              beak, and one eye over a taper is a bird */}
          <path d="M6 13q0-11 13-11 14 0 17 8v5h-2v4q-4 6-15 6-13 0-13-12z" fill="#d8232a" />
          {/* the open jaw, and the gold fringe along it */}
          <path d="M22 19h14q-2 6-9 6-5 0-5-4z" fill="#a01319" />
          <path d="M22 19h14l-1 2H22z" fill="#f2c14e" />
          <path d="M30 22q3 1 4 3-3 1-4-3z" fill="#e0454f" />
          {/* antlers, swept back over the mane */}
          <path d="M14 2.5l-6-7 1 5-4-2 4 5zM21 1.5l-2-7 4 4 1-3 1 6z" fill="#f2c14e" />
          {/* the eye, set high and large, with a gold brow over it */}
          <path d="M22 6q4-2 8 1" fill="none" stroke="#f2c14e" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="26" cy="11" r="3.2" fill="#fff" />
          <circle cx="27" cy="11" r="1.6" fill="#2b2b33" />
          {/* whiskers, low and thin so they read as whiskers and not as a bill */}
          <path d="M36 15l7 2.5M36 17l6 5" stroke="#f2c14e" strokeWidth="1.1" strokeLinecap="round" opacity="0.9" />
        </g>
      </g>

      {/* the lion out in front, the same drawing the rail's floor walks (`LionWalker`),
          bigger here because it leads: the body hops, the head swings, the legs step */}
      <g transform="translate(112 3.5) scale(1.25)">
        <g fill={INK}>
          <path className={styles.lionLegA} d="M8 19l-1 7h3l1-7zM24 19l-1 7h3l1-7z" />
          <path className={styles.lionLegB} d="M13 19l-1 7h3l1-7zM29 19l-1 7h3l1-7z" />
        </g>
        <g className={styles.lionHop}>
          <path d="M4 20q8-8 16-6 6 2 10 0v6z" fill="#d8232a" />
          <path d="M6 18q7-6 14-4" fill="none" stroke="#f2c14e" strokeWidth="1" strokeDasharray="2 2" />
          <g className={styles.lionNod}>
            <path d="M22 16q-2-10 7-11 8 0 7 9l-2 3H24z" fill="#d8232a" />
            <path d="M23 8l-3-4 5 1zM28 4l1-4 2 4zM33 5l3-3-1 5z" fill="#f2c14e" />
            <path d="M24 16h12l-1 3H25z" fill="#f2c14e" />
            <circle cx="31" cy="10" r="1.8" fill="#fff" />
            <circle cx="31.4" cy="10" r="0.9" fill="#2b2b33" />
            <circle cx="36" cy="12" r="1.2" fill="#f2c14e" />
          </g>
        </g>
      </g>
    </Traveller>

    {/* petals: plum blossom drifting down, the same way the snow falls */}
    <svg className={styles.snow} style={{ ['--fd-tile' as string]: '56px' }} width="100%" height="112">
      <defs>
        <pattern id="fd-ny-petals" width="140" height="56" patternUnits="userSpaceOnUse">
          <g fill="#f4a7b9">
            <ellipse cx="12" cy="9" rx="1.9" ry="1.2" transform="rotate(-30 12 9)" />
            <ellipse cx="50" cy="22" rx="1.5" ry="1" transform="rotate(20 50 22)" />
            <ellipse cx="84" cy="5" rx="1.7" ry="1.1" transform="rotate(-50 84 5)" />
            <ellipse cx="112" cy="31" rx="1.4" ry="0.9" transform="rotate(35 112 31)" />
            <ellipse cx="30" cy="42" rx="1.6" ry="1" transform="rotate(-15 30 42)" />
            <ellipse cx="70" cy="50" rx="1.9" ry="1.2" transform="rotate(45 70 50)" />
            <ellipse cx="100" cy="52" rx="1.3" ry="0.9" transform="rotate(-40 100 52)" />
            <ellipse cx="128" cy="15" rx="1.5" ry="1" transform="rotate(10 128 15)" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="112" fill="url(#fd-ny-petals)" opacity="0.85" />
    </svg>

    {/* near: firecrackers hanging at the left, a lucky diamond, gold ingots, mandarins,
        a drum, red envelopes, fireworks over the town, a plum branch leaning in from the
        right; red lanterns strung across the top */}
    {/* a string of firecrackers, hung from the top left, one just gone off */}
    <svg className={styles.near} style={{ left: '4%', top: 0 }} viewBox="0 0 16 40" width="14" height="36">
      <g className={styles.sway} style={swayAt(0.5)}>
        <path d="M8 0v4" stroke="#d9a83f" strokeWidth="1" />
        <path d="M8 4q-4 6 0 12t0 12-2 8" fill="none" stroke="#d9a83f" strokeWidth="0.8" />
        <g fill="#d8232a">
          <rect x="3" y="6" width="4" height="7" rx="1" />
          <rect x="9" y="10" width="4" height="7" rx="1" />
          <rect x="3" y="16" width="4" height="7" rx="1" />
          <rect x="9" y="20" width="4" height="7" rx="1" />
          <rect x="3" y="26" width="4" height="7" rx="1" />
        </g>
        <g fill="#f2c14e">
          <rect x="3" y="8.5" width="4" height="1" />
          <rect x="9" y="12.5" width="4" height="1" />
          <rect x="3" y="18.5" width="4" height="1" />
          <rect x="9" y="22.5" width="4" height="1" />
          <rect x="3" y="28.5" width="4" height="1" />
        </g>
      </g>
      <g className={styles.pop} fill="#ffb15c">
        <path d="M11 32l1.5-3 .5 2.5 2-1-1 2.5 2.5.5-2.5 1 1.5 2-2.5-1-.5 2.5-1.5-2.5-2 1.5.5-2.5-2.5-.5 2.5-1z" />
      </g>
    </svg>
    {/* fireworks over the town */}
    <Firework left="36%" top={4} size={16} color="#ff6b6b" late={false} />
    <Firework left="58%" top={2} size={13} color="#f5d777" late />
    <Firework left="78%" top={7} size={11} color="#ff9a5c" late={false} />
    {/* the lucky diamond, red with a gold border and a knot above it */}
    <svg className={styles.near} style={{ left: '15%', top: 56 - 24 }} viewBox="0 0 22 24" width="20" height="22">
      <path d="M11 3v-3" stroke="#d9a83f" strokeWidth="1" />
      <path d="M11 4l9 9-9 9-9-9z" fill="#d8232a" />
      <path d="M11 6.5l6.5 6.5-6.5 6.5-6.5-6.5z" fill="none" stroke="#f2c14e" strokeWidth="0.9" />
      <circle cx="11" cy="13" r="2.6" fill="#f2c14e" />
      <circle cx="11" cy="13" r="1.1" fill="#d8232a" />
    </svg>
    {/* gold ingots on the floor */}
    <svg className={styles.near} style={{ left: '27%', top: 56 - 12 }} viewBox="0 0 30 12" width="28" height="11">
      <path d="M1 8q1-5 6-6 4 4 8 0 5 1 6 6-2 3-10 3T1 8z" fill="#f2c14e" />
      <path d="M3 7q2-3 5-3 3 3 6 0 3 0 5 3" fill="none" stroke="#d9a83f" strokeWidth="0.8" />
      <path d="M15 9q1-4 5-5 3 3 6 0 4 1 5 5-2 2-8 2t-8-2z" fill="#f5d777" />
    </svg>
    {/* a pair of mandarins with their leaves */}
    <svg className={styles.near} style={{ left: '46%', top: 56 - 12 }} viewBox="0 0 24 12" width="22" height="11">
      <circle cx="6" cy="7" r="5" fill="#f28c28" />
      <circle cx="17" cy="7.5" r="4.5" fill="#f5a03c" />
      <path d="M6 2l-1-1M17 3l-1-1" stroke="#7a4e2a" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M6 2q3-2 5 0-2 2-5 0zM17 3q3-2 5 0-2 2-5 0z" fill="#5f8f3e" />
    </svg>
    {/* a drum, red with gold studs, and its sticks */}
    <svg className={styles.near} style={{ left: '62%', top: 56 - 18 }} viewBox="0 0 24 18" width="22" height="17">
      <path d="M3 6h18v8q-9 3-18 0z" fill="#d8232a" />
      <ellipse cx="12" cy="6" rx="9" ry="3" fill="#f5e6c8" stroke="#d9a83f" strokeWidth="0.8" />
      <g fill="#f2c14e">
        <circle cx="5" cy="9" r="0.7" />
        <circle cx="8" cy="10" r="0.7" />
        <circle cx="12" cy="10.5" r="0.7" />
        <circle cx="16" cy="10" r="0.7" />
        <circle cx="19" cy="9" r="0.7" />
      </g>
      <path d="M6 5l-4-4M18 5l4-4" stroke="#7a4e2a" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4 18v-3M20 18v-3" stroke="#7a4e2a" strokeWidth="1.4" />
    </svg>
    {/* red envelopes leaning on each other */}
    <svg className={styles.near} style={{ left: '74%', top: 56 - 16 }} viewBox="0 0 20 16" width="18" height="15">
      <rect x="2" y="3" width="9" height="13" rx="1" fill="#c81e25" transform="rotate(-8 6.5 9.5)" />
      <rect x="9" y="1" width="9" height="15" rx="1" fill="#d8232a" />
      <rect x="9" y="1" width="9" height="4" rx="1" fill="#f04a4f" />
      <circle cx="13.5" cy="9.5" r="2" fill="none" stroke="#f2c14e" strokeWidth="0.8" />
      <circle cx="13.5" cy="9.5" r="0.7" fill="#f2c14e" />
    </svg>
    {/* a plum branch leaning in from the right */}
    <svg className={styles.near} style={{ right: 0, top: 4 }} viewBox="0 0 70 48" width="70" height="48">
      <path
        d="M70 6c-10 4-20 10-30 20-6 6-12 12-22 16"
        fill="none"
        stroke="#6b4423"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M48 20c-4-2-8-2-12-1M38 30c-5 0-9 2-12 5"
        fill="none"
        stroke="#6b4423"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {(
        [
          [56, 12],
          [46, 19],
          [36, 29],
          [28, 36],
          [40, 25],
          [30, 31],
        ] as const
      ).map(([x, y], i) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <g fill={i % 2 === 0 ? '#f4a7b9' : '#f7bfcc'}>
            <circle cx="0" cy="-2.6" r="1.7" />
            <circle cx="2.5" cy="-0.8" r="1.7" />
            <circle cx="1.5" cy="2.1" r="1.7" />
            <circle cx="-1.5" cy="2.1" r="1.7" />
            <circle cx="-2.5" cy="-0.8" r="1.7" />
          </g>
          <circle cx="0" cy="0" r="0.9" fill="#f2c14e" />
        </g>
      ))}
      <g fill="#e07a91">
        <circle cx="52" cy="17" r="1.1" />
        <circle cx="33" cy="34" r="1.1" />
        <circle cx="24" cy="40" r="0.9" />
      </g>
    </svg>
    {/* the lantern string */}
    <svg className={styles.string} viewBox="0 0 400 56" preserveAspectRatio="none" width="100%" height="56">
      <path d="M0 2q200 14 400 0" fill="none" stroke="#d9a83f" strokeWidth="0.9" opacity="0.6" />
    </svg>
    {[0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82].map((at, i) => (
      <RedLantern key={at} at={at} size={i % 2 === 0 ? 1.05 : 0.85} />
    ))}
    {/* gold tassels between the lanterns */}
    {[0.16, 0.4, 0.64, 0.88].map((at) => (
      <svg
        key={at}
        className={styles.near}
        style={{ left: `${at * 100}%`, top: 2 + 28 * at * (1 - at), transform: 'translateX(-50%)' }}
        viewBox="-4 0 8 14"
        width="8"
        height="14"
      >
        <g className={styles.sway} style={swayAt(at)}>
          <path d="M0 0v3" stroke="#d9a83f" strokeWidth="0.8" />
          <path d="M-2 3h4l-1 3h-2z" fill="#d8232a" />
          <path d="M-1.5 6v7M0 6v8M1.5 6v7" stroke="#f2c14e" strokeWidth="0.8" strokeLinecap="round" />
        </g>
      </svg>
    ))}
  </>
);

const SCENES: Record<Festival, React.FC> = {
  lunarNewYear: LunarNewYear,
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
 *  mouth rather than replaced by it. The mouth is a size larger than the disc, so a dark
 *  rim shows all round the head and the eyes and stem sit clear above it. Two layers,
 *  one component each; both share one 56×56 box whose mouth centre (28,36) the CSS puts
 *  on the disc's centre. */
export const PumpkinBehind: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 56 56" width="56" height="56">
    <path d="M25 8c1.5-3 4.5-3.5 7-1.5L31 14h-6z" fill="#5f8f3e" />
    <ellipse cx="28" cy="34" rx="28" ry="22" fill="#ef8a2c" />
    <g fill="none" stroke="#c9691c" strokeWidth="1.4" opacity="0.5">
      <ellipse cx="13" cy="34" rx="8" ry="21" />
      <ellipse cx="43" cy="34" rx="8" ry="21" />
    </g>
    <path d="M12 16l6 7H6z" fill="#3b1d0c" />
    <path d="M44 16l6 7H38z" fill="#3b1d0c" />
    <circle cx="28" cy="36" r="18.5" fill="#3b1d0c" />
  </svg>
);

export const PumpkinTeeth: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 56 56" width="56" height="56">
    {/* Two even rows along the mouth's rim: four hanging from the top, three rising from
        the bottom, in the pumpkin's own orange. */}
    <g fill="#ef8a2c">
      <path d="M13 24l5-3.5 1.5 7z" />
      <path d="M20 19.5l5-1.5.5 7z" />
      <path d="M31 18l5 1.5-.5 7z" />
      <path d="M37.5 20.5l5 3.5-6.5 3.5z" />
      <path d="M15 47l5 3.5 1-7z" />
      <path d="M25 52.5h6l-3-7z" />
      <path d="M36 50.5l5-3.5-6-3.5z" />
    </g>
  </svg>
);

/** The New Year cap: a red dome with a gold band round the brim and a gold knob on top,
 *  a short red tassel off the knob — the cap the God of Wealth wears in every shop
 *  window. Drawn to sit level, like the hat: a round cap on a round disc. */
export const LuckyCap: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 44 30" width="40" height="27">
    <defs>
      <linearGradient id="fd-cap" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f04a4f" />
        <stop offset="100%" stopColor="#b0161c" />
      </linearGradient>
    </defs>
    <path d="M6 24q0-16 16-16t16 16z" fill="url(#fd-cap)" />
    <path d="M10 22q1-10 12-11" fill="none" stroke="#ffb3b3" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    <path d="M22 8v14M9 21q13-7 26 0" fill="none" stroke="#8f0f14" strokeWidth="0.8" opacity="0.5" />
    <rect x="4" y="22" width="36" height="5" rx="2.5" fill="#f2c14e" stroke="#d9a83f" strokeWidth="0.8" />
    <circle cx="22" cy="7" r="3" fill="#f2c14e" stroke="#d9a83f" strokeWidth="0.8" />
    <path d="M24 8q5 1 6 6" fill="none" stroke="#d8232a" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M29 13l1.5 3M30 13.5l0 3.5M31 13l1 3" stroke="#d8232a" strokeWidth="0.9" strokeLinecap="round" />
  </svg>
);
