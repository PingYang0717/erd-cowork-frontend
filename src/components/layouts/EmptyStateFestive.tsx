import React, { useState } from 'react';

import type { Festival } from '@/utils/festival';
import { phaseNow } from '@/utils/festiveClock';
import { GROUND_BACKDROPS, WEATHER_TILES } from './festiveMotifs';

import styles from './EmptyStateFestive.module.css';

/** The two empty panes' festive centrepiece (CONTEXT.md, 節慶裝飾): a round window where
 *  the icon tile usually sits, with something living inside it, and — every so often —
 *  that something coming out.
 *
 *  The point is the coming out. A drawing with a little animation on it is a sticker with
 *  a tic; what makes this worth a second look is that the window is somewhere a creature
 *  lives, and that once in a while it leaves. It slips out through the glass, which rings
 *  behind it, crosses the whole pane, passes the rule into the other pane, and goes in
 *  through that one's window. Most of the time you get the quiet version, the scene
 *  inside drifting; the rest is worth catching.
 *
 *  Nothing is exchanged between the panes — they cannot see each other. Both run one long
 *  loop off the wall clock (`phaseNow`), the right-hand pane a crossing behind the left,
 *  so the arrival lands where the departure left off whenever either pane mounted.
 *
 *  What is behind the glass is the same world as everywhere else on the screen, seen
 *  through a round hole: the festival's sky tint over its ground band (the very band the
 *  floor along the window's foot is made of), the same weather falling through it, and
 *  silhouettes in the text colour at low opacity. Only the creature carries colour — the
 *  header's rule for its near piece. One a festival, none of them used on the header or
 *  the floor: Santa on the Christmas snow, the coming year's sheep in the New Year
 *  street, a ghost under the Halloween tree, and Chang'e flying in the Mid-Autumn moon. */

const INK = 'var(--erd-color-text, rgba(0, 0, 0, 0.88))';

/** The loop every part of this shares. Long on purpose: the escape is the payoff, and a
 *  payoff that comes round every ten seconds stops being one. */
const LOOP_S = 46;

/** How much of the loop the crossing takes, and therefore how far behind the left pane
 *  the right one runs. */
const CROSS_SHARE = 0.28;

/** The header slides one 56px weather tile in 14s; the window's tile is the same. */
const WEATHER_S = 14;

/* ---------- the residents ---------- */

/** Every resident is drawn with its own gradients, so it takes an `id` to keep them
 *  apart: the same creature is drawn twice a pane (at home and out in the pane) and in
 *  both panes. */
interface CreatureProps {
  id: string;
}

/** Christmas's Santa, facing right, 44 × 44: the hat with its tip over, brows, cheeks,
 *  moustache and beard, the coat with fur down the front and at the hem, belt and buckle,
 *  boots, the sack over his shoulder, and a mitten up in a wave. */
const Santa: React.FC<CreatureProps> = ({ id }) => (
  <g className={styles.bob}>
    <defs>
      <linearGradient id={`${id}-coat`} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stopColor="#e63a36" />
        <stop offset="100%" stopColor="#b51d21" />
      </linearGradient>
      <radialGradient id={`${id}-skin`} cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#fbd9bd" />
        <stop offset="100%" stopColor="#eab48e" />
      </radialGradient>
      <linearGradient id={`${id}-beard`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff" />
        <stop offset="100%" stopColor="#dfe3ec" />
      </linearGradient>
      <radialGradient id={`${id}-sack`} cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#a5713a" />
        <stop offset="100%" stopColor="#6d4423" />
      </radialGradient>
    </defs>
    {/* the sack, tied at the neck, over the far shoulder */}
    <ellipse cx="9" cy="22" rx="7.5" ry="8" fill={`url(#${id}-sack)`} />
    <path d="M11 14q2-3 5-2" fill="none" stroke="#6d4423" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M9.5 14.5h4" stroke="#f2c14e" strokeWidth="1" strokeLinecap="round" />
    <path d="M5 19q1 4 3 6" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.25" strokeLinecap="round" />
    {/* the far arm, on the sack's strap */}
    <path d="M15 24l-3-6" stroke="#b51d21" strokeWidth="4" strokeLinecap="round" />
    {/* the coat */}
    <path d="M13 41V28q0-9 7-10h8q7 1 7 10v13z" fill={`url(#${id}-coat)`} />
    <path d="M13 41V32q3 2 11 2t11-2v9z" fill="#000" opacity="0.08" />
    <rect x="22.8" y="18" width="2.6" height="20" fill="#fff" />
    <rect x="12.5" y="37.5" width="23" height="4" rx="2" fill="#fff" />
    <rect x="12.5" y="40" width="23" height="1.5" fill="#000" opacity="0.06" />
    <rect x="13" y="29.5" width="22" height="3.2" fill="#2b2b33" />
    <rect x="22" y="28.8" width="4.6" height="4.6" rx="0.9" fill="#f2c14e" />
    <rect x="23.1" y="29.9" width="2.4" height="2.4" rx="0.4" fill="#2b2b33" />
    {/* boots */}
    <path d="M14.5 41h7.5v3.6h-8.5z" fill="#2b2b33" />
    <path d="M26 41h7.5v3.6h-8z" fill="#2b2b33" />
    <path d="M15 41.8h5M27 41.8h5" stroke="#fff" strokeWidth="0.7" opacity="0.25" strokeLinecap="round" />
    {/* the near arm, waving from the shoulder */}
    <g className={styles.wave}>
      <path d="M33 25l6-10" stroke="#d1292c" strokeWidth="4.4" strokeLinecap="round" />
      <circle cx="38.6" cy="15.4" r="2.4" fill="#fff" />
      <circle cx="40.2" cy="12.6" r="2.7" fill="#2b2b33" />
      <path d="M38.2 11.4q-1.6 0-1.8 2" fill="none" stroke="#2b2b33" strokeWidth="1.6" strokeLinecap="round" />
    </g>
    {/* head */}
    <circle cx="24" cy="15" r="7" fill={`url(#${id}-skin)`} />
    <circle cx="20" cy="17" r="1.6" fill="#e8807a" opacity="0.45" />
    <circle cx="28" cy="17" r="1.6" fill="#e8807a" opacity="0.45" />
    <path
      d="M20 13q1.3-1 2.6 0M25.4 13q1.3-1 2.6 0"
      fill="none"
      stroke="#fff"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
    <circle cx="21.6" cy="14.6" r="0.9" fill="#2b2b33" />
    <circle cx="26.4" cy="14.6" r="0.9" fill="#2b2b33" />
    <circle cx="21.9" cy="14.3" r="0.3" fill="#fff" />
    <circle cx="26.7" cy="14.3" r="0.3" fill="#fff" />
    <circle cx="24" cy="17" r="1.5" fill="#e59a8a" />
    <circle cx="23.6" cy="16.6" r="0.5" fill="#fff" opacity="0.5" />
    {/* beard and moustache */}
    <path d="M16.5 17q0 10 7.5 11.5 7.5-1.5 7.5-11.5-2.5 5-7.5 5.5-5-.5-7.5-5.5z" fill={`url(#${id}-beard)`} />
    <path d="M19.5 22q4.5 4 9 0" fill="none" stroke="#cfd5e2" strokeWidth="0.7" opacity="0.8" />
    <path d="M19.8 18.6q4.2-2.4 8.4 0-1.6 2.4-4.2 1.6-2.6.8-4.2-1.6z" fill="#fff" />
    {/* hat: the cone, the brim, and the tip folded over to the right */}
    <path d="M16 10.5C17 3 24 0 29 2.5c2.5 1.2 3.5 3.6 4.5 8z" fill={`url(#${id}-coat)`} />
    <path d="M29 2.5q4 1.5 7 7.5" fill="none" stroke="#c9262a" strokeWidth="4" strokeLinecap="round" />
    <circle cx="36.4" cy="10.6" r="2.6" fill="#fff" />
    <circle cx="35.8" cy="9.9" r="0.9" fill="#fff" opacity="0.7" />
    <rect x="14" y="9" width="21" height="4" rx="2" fill="#fff" />
    <rect x="14" y="11.6" width="21" height="1.4" fill="#000" opacity="0.06" />
  </g>
);

/** New Year's sheep — the coming year's animal — facing right, 48 × 34: a cloud of wool
 *  in overlapping curls, a tan face with a curled horn, hooves, a red bow at the neck
 *  with a gold bell on it. */
const Sheep: React.FC<CreatureProps> = ({ id }) => (
  <g className={styles.bob}>
    <defs>
      <radialGradient id={`${id}-wool`} cx="45%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#fffdf8" />
        <stop offset="100%" stopColor="#e9e1d2" />
      </radialGradient>
      <radialGradient id={`${id}-face`} cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#f0dcc6" />
        <stop offset="100%" stopColor="#d9bc9d" />
      </radialGradient>
      <radialGradient id={`${id}-bell`} cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#ffe08a" />
        <stop offset="100%" stopColor="#d9a83f" />
      </radialGradient>
    </defs>
    {/* legs and hooves, the far pair darker */}
    <g stroke="#7a6a58" strokeWidth="2.6" strokeLinecap="round">
      <path d="M14 25v6M30 25v6" opacity="0.7" />
      <path d="M19 26v6M35 26v6" />
    </g>
    <g fill="#3b3028">
      <path d="M12.5 30.5h3v2.2h-3zM28.5 30.5h3v2.2h-3z" opacity="0.7" />
      <path d="M17.5 31.5h3v2.2h-3zM33.5 31.5h3v2.2h-3z" />
    </g>
    {/* the tail and the body: curls of wool */}
    <circle cx="8" cy="17" r="3" fill={`url(#${id}-wool)`} stroke="#d9cfc0" strokeWidth="0.7" />
    <g fill={`url(#${id}-wool)`} stroke="#d9cfc0" strokeWidth="0.7">
      <circle cx="14" cy="21" r="6" />
      <circle cx="21" cy="15" r="6.5" />
      <circle cx="29" cy="14.5" r="6.5" />
      <circle cx="35" cy="19" r="6" />
      <circle cx="26" cy="23" r="7" />
      <circle cx="18" cy="24" r="5.5" />
      <circle cx="33" cy="24.5" r="5.5" />
    </g>
    <path d="M12 23q12 8 24 0" fill="none" stroke="#000" strokeWidth="0.9" opacity="0.06" />
    {/* head: face, ear, horn, a cap of wool, eye and nose */}
    <ellipse cx="34" cy="11" rx="3.4" ry="1.6" fill={`url(#${id}-face)`} transform="rotate(-20 34 11)" />
    <ellipse cx="40" cy="14" rx="6" ry="5.2" fill={`url(#${id}-face)`} />
    <path d="M37.5 8.5q-4-4 .8-6.5" stroke="#c9a04a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d="M37.5 8.5q-3.2-3.2.5-5.2" stroke="#e5c56e" strokeWidth="0.6" fill="none" strokeLinecap="round" />
    <circle cx="39" cy="8.5" r="3.6" fill={`url(#${id}-wool)`} stroke="#d9cfc0" strokeWidth="0.7" />
    <circle cx="42.2" cy="13.2" r="1.1" fill="#2b2b33" />
    <circle cx="42.5" cy="12.8" r="0.35" fill="#fff" />
    <path d="M44.6 15.6q1.6.2 1.4 1.4" fill="none" stroke="#b58a8a" strokeWidth="0.8" strokeLinecap="round" />
    <circle cx="45.4" cy="15.2" r="0.9" fill="#c48a8a" />
    {/* the bow at the neck, and the bell hanging off it */}
    <path d="M33.5 18.5q-3.5-3-4.5-.5t4.5 2.5zM33.5 18.5q3.5-3 4.5-.5t-4.5 2.5z" fill="#d8232a" />
    <path d="M30 17.8q1.5 0 3 .7M37 17.8q-1.5 0-3 .7" fill="none" stroke="#f04a4f" strokeWidth="0.6" />
    <circle cx="33.5" cy="18.6" r="1.2" fill="#f2c14e" />
    <path d="M33.5 19.8v1.6" stroke="#d9a83f" strokeWidth="0.8" />
    <circle cx="33.5" cy="23" r="1.9" fill={`url(#${id}-bell)`} stroke="#b8862e" strokeWidth="0.5" />
    <path d="M32.3 23.4h2.4" stroke="#b8862e" strokeWidth="0.5" />
    <circle cx="33.5" cy="24.6" r="0.45" fill="#7a5a1e" />
  </g>
);

/** Mid-Autumn's Chang'e, flying up and to the right, 56 × 40: the skirt streaming out
 *  long behind her, water sleeves from both arms, a stole across the shoulders and two
 *  ribbons trailing, hair in two buns with a pin, one arm reaching for the moon. */
const ChangE: React.FC<CreatureProps> = ({ id }) => (
  <g className={styles.bob}>
    <defs>
      <linearGradient id={`${id}-gown`} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#f3c9d6" />
        <stop offset="55%" stopColor="#fbeef3" />
        <stop offset="100%" stopColor="#fff" />
      </linearGradient>
      <radialGradient id={`${id}-skin`} cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#fde4cf" />
        <stop offset="100%" stopColor="#f0c4a4" />
      </radialGradient>
    </defs>
    {/* the ribbons, streaming back from the shoulders */}
    <g className={styles.flutter} fill="none" strokeLinecap="round">
      <path d="M35 12q-9-9-20-5-6 2-13 0" stroke="#e8a0b0" strokeWidth="1.7" />
      <path d="M35 12q-9-9-20-5-6 2-13 0" stroke="#fff" strokeWidth="0.5" opacity="0.6" />
      <path d="M34 17q-8 7-18 5-6-1-13 2" stroke="#f2c14e" strokeWidth="1.5" />
    </g>
    {/* the far arm, back, with its sleeve falling */}
    <path d="M31 13l-6 4" stroke="#f0c4a4" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M26 15q-5 6-2 11 3-4 4-10z" fill={`url(#${id}-gown)`} stroke="#e8a0b0" strokeWidth="0.5" />
    {/* the skirt, a long sweep down and back to a curling hem */}
    <path
      d="M33 19c-6 2-11 8-17 12-5 3-10 6-15 5 4 3 10 3 16 0 7-4 12-9 18-13z"
      fill={`url(#${id}-gown)`}
      stroke="#e8a0b0"
      strokeWidth="0.6"
    />
    <path d="M30 22q-6 6-13 10M31 25q-5 5-11 8" fill="none" stroke="#e8a0b0" strokeWidth="0.6" opacity="0.8" />
    <path d="M1 36q-2 1-1 3" fill="none" stroke="#e8a0b0" strokeWidth="1" strokeLinecap="round" />
    {/* the torso, and the sash */}
    <path d="M31 11q4-3 8 0l1.5 9q-5.5 2.5-11 0z" fill={`url(#${id}-gown)`} stroke="#e8a0b0" strokeWidth="0.5" />
    <path d="M30.5 19.5q5 2 10.5 0" fill="none" stroke="#d9a83f" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M38 20q-1 3 0 6" fill="none" stroke="#d9a83f" strokeWidth="0.9" strokeLinecap="round" />
    {/* the stole across the shoulders */}
    <path d="M29 12q9-5 15 3" fill="none" stroke="#e8a0b0" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
    {/* the near arm, up toward the moon, its water sleeve hanging from the elbow */}
    <path d="M44 8q-2 6 2 11 2-5 1-11z" fill={`url(#${id}-gown)`} stroke="#e8a0b0" strokeWidth="0.5" />
    <path d="M40 12l8-8" stroke="#f0c4a4" strokeWidth="2" strokeLinecap="round" />
    <path d="M48 4q1.4-.6 2 .6" stroke="#f0c4a4" strokeWidth="1.5" strokeLinecap="round" />
    {/* the head: face in three-quarter, hair in two buns with the pin */}
    <circle cx="43" cy="7.5" r="4.6" fill={`url(#${id}-skin)`} />
    <path d="M38.4 7.2a4.6 4.6 0 0 1 9.2-.8q-2.2-1.8-4.8-.8-2.5-.4-4.4 1.6z" fill="#2b2b33" />
    <circle cx="40.6" cy="2.8" r="2.1" fill="#2b2b33" />
    <circle cx="45.6" cy="2.6" r="1.7" fill="#2b2b33" />
    <path d="M38.6 3.6l4.6-1.2" stroke="#f2c14e" strokeWidth="0.8" strokeLinecap="round" />
    <circle cx="38.2" cy="3.8" r="0.7" fill="#e0454f" />
    <path d="M38.6 8q-1.4 1.6-.8 3.4" fill="none" stroke="#2b2b33" strokeWidth="0.7" strokeLinecap="round" />
    <circle cx="44.6" cy="7.8" r="0.6" fill="#2b2b33" />
    <path d="M43.8 6.3q.9-.5 1.7 0" fill="none" stroke="#2b2b33" strokeWidth="0.45" strokeLinecap="round" />
    <circle cx="45.9" cy="9.6" r="0.5" fill="#e0454f" />
    <circle cx="45.4" cy="8.9" r="1.1" fill="#f08a8e" opacity="0.35" />
  </g>
);

/** Halloween's ghost, 30 × 34: the sheet with a little lavender in its folds, a wavy
 *  hem, eyes with a glint in them, an O of a mouth, and two arms out from under it. */
const Ghost: React.FC<CreatureProps> = ({ id }) => (
  <g className={styles.bob}>
    <defs>
      <linearGradient id={`${id}-sheet`} x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e4e2f0" />
      </linearGradient>
    </defs>
    <path d="M4 19q-4 2-3 6" stroke={`url(#${id}-sheet)`} strokeWidth="3" strokeLinecap="round" />
    <path d="M26 19q4 2 3 6" stroke={`url(#${id}-sheet)`} strokeWidth="3" strokeLinecap="round" />
    <path
      d="M4 31V13a11 11 0 0 1 22 0v18c-1.8-2.2-3.7-2.2-5.5 0-1.8-2.2-3.7-2.2-5.5 0-1.8-2.2-3.7-2.2-5.5 0-1.8-2.2-3.7-2.2-5.5 0z"
      fill={`url(#${id}-sheet)`}
      stroke="#d3d0e2"
      strokeWidth="0.6"
    />
    <path d="M8 12q2-6 8-6" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
    <path d="M19 16q2 6-1 12" fill="none" stroke="#c9c5dc" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
    <ellipse cx="11" cy="14" rx="1.7" ry="2.1" fill="#3b3b46" />
    <ellipse cx="18.5" cy="14" rx="1.7" ry="2.1" fill="#3b3b46" />
    <circle cx="11.6" cy="13.2" r="0.5" fill="#fff" />
    <circle cx="19.1" cy="13.2" r="0.5" fill="#fff" />
    <ellipse cx="14.8" cy="19.5" rx="1.6" ry="2.3" fill="#3b3b46" />
    <circle cx="8.5" cy="18" r="1.3" fill="#e8a0b0" opacity="0.35" />
    <circle cx="21" cy="18" r="1.3" fill="#e8a0b0" opacity="0.35" />
  </g>
);

interface Scene {
  /** The sky's tint at the top of the glass, and the ground's at the bottom. */
  sky: string;
  ground: string;
  /** What stands far off behind the creature, in silhouette. */
  far: React.ReactNode;
  creature: {
    draw: (id: string) => React.ReactNode;
    width: number;
    height: number;
    /** How large it is drawn behind the glass, as a share of its own size. */
    homeScale: number;
  };
}

const SCENES: Record<Festival, Scene> = {
  lunarNewYear: {
    sky: 'rgba(200, 40, 50, 0.05)',
    ground: 'rgba(200, 40, 50, 0.14)',
    far: (
      <>
        {/* lantern posts down the street and a firework left hanging, the header's far layer */}
        <circle
          cx="66"
          cy="34"
          r="10"
          fill="none"
          stroke={INK}
          strokeWidth="1"
          strokeDasharray="1.5 2.2"
          opacity="0.12"
        />
        <g stroke={INK} strokeWidth="1.2" strokeLinecap="round" opacity="0.14">
          <path d="M28 82V56M96 82V52" />
        </g>
        <g fill={INK} opacity="0.14">
          <ellipse cx="28" cy="53" rx="3.5" ry="4.5" />
          <ellipse cx="96" cy="49" rx="3.5" ry="4.5" />
        </g>
        <g transform="translate(0 80) scale(0.5 1)">{GROUND_BACKDROPS.lunarNewYear.band}</g>
      </>
    ),
    creature: { draw: (id) => <Sheep id={id} />, width: 48, height: 34, homeScale: 0.68 },
  },
  christmas: {
    sky: 'rgba(60, 100, 170, 0.06)',
    ground: 'rgba(60, 100, 170, 0.12)',
    far: (
      <>
        {/* distant pines on the hill, the way the header's far layer draws them */}
        <g fill={INK} opacity="0.1">
          <path d="M22 84l7-16 7 16zM26 74l3-8 3 8z" />
          <path d="M84 82l9-20 9 20zM88 70l5-10 5 10z" />
          <path d="M56 86l5-11 5 11z" />
        </g>
        <g transform="translate(0 80) scale(0.5 1)">{GROUND_BACKDROPS.christmas.band}</g>
      </>
    ),
    creature: { draw: (id) => <Santa id={id} />, width: 44, height: 44, homeScale: 0.78 },
  },
  halloween: {
    sky: 'rgba(96, 52, 140, 0.06)',
    ground: 'rgba(96, 52, 140, 0.13)',
    far: (
      <>
        {/* a bare tree, and the header's crescent low behind it */}
        <path d="M78 30a13 13 0 1 0 12 18 10 10 0 1 1-12-18z" fill={INK} opacity="0.1" />
        <g fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity="0.16">
          <path d="M34 84V54M34 62l-9-8M34 58l8-9M25 54l-4-6M42 49l6-3" />
        </g>
        <g transform="translate(0 80) scale(0.5 1)">{GROUND_BACKDROPS.halloween.band}</g>
      </>
    ),
    creature: { draw: (id) => <Ghost id={id} />, width: 30, height: 34, homeScale: 0.85 },
  },
  midAutumn: {
    sky: 'rgba(44, 52, 128, 0.05)',
    ground: 'rgba(44, 52, 128, 0.12)',
    far: (
      <>
        {/* the moon fills the glass: a pale disc with its seas, an osmanthus branch leaning
            in, the cloud bank low across it */}
        <circle cx="60" cy="58" r="40" fill="#f6dc8a" opacity="0.35" />
        <g fill={INK} opacity="0.06">
          <ellipse cx="48" cy="46" rx="9" ry="6" />
          <ellipse cx="70" cy="56" rx="6" ry="4" />
          <ellipse cx="56" cy="68" rx="5" ry="3" />
        </g>
        <path d="M120 74q-18-12-36-4" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" opacity="0.14" />
        <g fill="#f2c14e" opacity="0.5">
          <circle cx="92" cy="68" r="1.3" />
          <circle cx="98" cy="70.5" r="1.1" />
          <circle cx="104" cy="70" r="1.2" />
        </g>
        <g transform="translate(0 80) scale(0.5 1)">{GROUND_BACKDROPS.midAutumn.band}</g>
      </>
    ),
    creature: { draw: (id) => <ChangE id={id} />, width: 56, height: 40, homeScale: 0.62 },
  },
};

interface PanelProps {
  festival: Festival;
  /** Which pane this is. The left one's creature leaves; the right one's arrives. */
  panel: 'left' | 'right';
}

/** Where this pane's copy of the loop stands: read off the clock, the right-hand pane a
 *  crossing behind, so the two panes agree however far apart they mounted. */
const phaseOf = (panel: PanelProps['panel']): string => {
  const left = phaseNow(LOOP_S);
  if (panel === 'left') {
    return left;
  }
  return `${(parseFloat(left) - LOOP_S * CROSS_SHARE).toFixed(3)}s`;
};

/** What is behind the glass. There is no rim: the header's band has no frame either — it
 *  fades out at both ends with a mask — and a lacquered ring with a highlight on it is
 *  the vocabulary of an app icon, not of the picture this is supposed to belong to. So
 *  the scene simply stops being there towards its edge. */
const PortholeScene: React.FC<{ id: string; festival: Festival; weatherPhase: string }> = ({
  id,
  festival,
  weatherPhase,
}) => {
  const scene = SCENES[festival];
  const tile = WEATHER_TILES[festival];
  const down = tile?.direction === 'down';
  return (
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
          <stop offset="0%" stopColor={scene.sky} />
          <stop offset="100%" stopColor={scene.ground} />
        </linearGradient>
        {tile !== null && (
          <pattern id={`${id}-weather`} width={tile.width} height={tile.height} patternUnits="userSpaceOnUse">
            {tile.body}
          </pattern>
        )}
      </defs>

      <g mask={`url(#${id}-glass)`}>
        {/* the wash: the header's sky tint over the ground's, in a circle instead of a band */}
        <circle cx="60" cy="60" r="58" fill={`url(#${id}-wash)`} />

        {scene.far}

        {/* the same weather as everywhere else, through the glass */}
        {tile !== null && (
          <rect
            className={down ? styles.weatherDown : styles.weatherUp}
            style={{ animationDelay: weatherPhase }}
            x="0"
            y={down ? -tile.height : 0}
            width="120"
            height={120 + tile.height}
            fill={`url(#${id}-weather)`}
            opacity="0.7"
          />
        )}

        {/* the ring the creature leaves in the glass when it goes through — the one thing
            here that reacts to anything, and the reason the exit reads as an exit */}
        <circle className={styles.ring} cx="86" cy="52" r="10" fill="none" stroke={INK} strokeWidth="1.4" />

        {/* the inhabitant, at home — and gone from here for as long as it is out */}
        <g className={styles.resident}>
          <g
            transform={`translate(${60 - (scene.creature.width * scene.creature.homeScale) / 2} ${58 - (scene.creature.height * scene.creature.homeScale) / 2}) scale(${scene.creature.homeScale})`}
          >
            {scene.creature.draw(`${id}-home`)}
          </g>
        </g>
      </g>
    </>
  );
};

/** The window, in the icon tile's place, and the creature out in the pane. */
export const EmptyPorthole: React.FC<PanelProps> = ({ festival, panel }) => {
  // Read once: a phase that moved with every render would move the creature with it.
  const [phase] = useState(() => ({ loop: phaseOf(panel), weather: phaseNow(WEATHER_S) }));
  const scene = SCENES[festival];

  return (
    <span
      className={styles.porthole}
      aria-hidden
      data-festive-porthole={panel}
      style={{ ['--loop' as string]: `${LOOP_S}s`, ['--phase' as string]: phase.loop }}
    >
      <svg viewBox="0 0 120 120" width="118" height="118" overflow="visible">
        <PortholeScene id={`ph-${panel}-${festival}`} festival={festival} weatherPhase={phase.weather} />
      </svg>
      {/* The escapee is anchored to the window rather than to the pane: the two panes'
          empty states sit at different heights (one has a header over it), and a creature
          that left one window at one height and arrived at the other at another would be
          two creatures. The pane clips it — that is what makes it leave the screen. */}
      <span
        className={`${styles.escape} ${panel === 'left' ? styles.escapeOut : styles.escapeIn}`}
        data-festive-escape={panel}
      >
        <svg
          viewBox={`0 0 ${scene.creature.width} ${scene.creature.height}`}
          width={scene.creature.width * 1.2}
          height={scene.creature.height * 1.2}
          overflow="visible"
        >
          {scene.creature.draw(`ph-${panel}-${festival}-out`)}
        </svg>
      </span>
    </span>
  );
};
