import React, { useLayoutEffect, useRef, useState } from 'react';

import { clippingBox, clippingElement } from '@/utils/clippingBox';
import type { Festival } from '@/utils/festival';
import { phaseNow } from '@/utils/festiveClock';
import { GROUND_BACKDROPS, WEATHER_TILES } from './festiveMotifs';

import styles from './EmptyStateFestive.module.css';

/** The two empty panes' festive centrepiece (CONTEXT.md, 節慶裝飾): a round window where
 *  the icon tile usually sits, with one creature that lives in the pair of them: at home
 *  in the thread pane's window, then out through the glass, across the pane, over the
 *  rule into the Artifact pane and in through that one's window; a few seconds there,
 *  and back the same way. One creature, seen from two panes.
 *
 *  The point is the crossing, and it has to come round quickly: these panes are on
 *  screen only until the first message, so a loop that showed it once a minute would
 *  never be seen. The loop is 18s, with a crossing every 9s.
 *
 *  Nothing is exchanged between the panes — they cannot see each other. Both run the
 *  loop off the wall clock (`phaseNow`), and agree on two instants in it: the hand-offs,
 *  when the creature is at the rule between them, going and coming back. Each pane draws
 *  the creature twice — a leg leaving its window, a leg arriving — and measures how far
 *  its own edge is from its window, works out where in each leg's keyframes the creature
 *  crosses that edge, and shifts that leg so the moment falls on its hand-off. The two
 *  legs' stretches at home overlap, so the pane needs no third drawing to be the
 *  resident: two identical drawings at one spot read as one. So the arrival lands where
 *  the departure left off whenever either pane mounted and however wide the panes are.
 *
 *  What is behind the glass is the same world as everywhere else on the screen, seen
 *  through a round hole: the festival's sky tint over its ground band (the very band the
 *  floor along the window's foot is made of), the same weather falling through it, and
 *  silhouettes in the text colour at low opacity. Only the creature carries colour — the
 *  header's rule for its near piece. One a festival, none of them used on the header or
 *  the floor: Santa in his sleigh over the Christmas snow, the coming year's sheep in the
 *  New Year street, a ghost under the Halloween tree, and Chang'e flying in the
 *  Mid-Autumn moon. */

const INK = 'var(--erd-color-text, rgba(0, 0, 0, 0.88))';

/** The loop: at home in one window, across to the other, at home there, and back. Short
 *  on purpose — see above. */
const LOOP_S = 18;

/** The two hand-offs: the shares of the loop at which the creature is at the rule
 *  between the panes, going right and coming back. The only two instants the panes
 *  share. Half a loop apart, so it is at home the same while in each window. */
const HANDOFF = { toRight: 0.25, toLeft: 0.75 } as const;

/** One leg of the journey as one pane draws it: the creature leaving this pane's window
 *  for the other pane, or arriving from it. */
type Leg = 'out' | 'in';

/** The legs in the CSS keyframes' own terms — the steady stretch of each, as (share of
 *  the loop, distance of the creature's centre from the window in px). One speed on
 *  every leg, 744px over 12% of the loop (about 340px/s): the two halves of a crossing
 *  can only meet at the rule if they cross it at the same speed. A pane's edge falls in
 *  this stretch for any pane this app lays out; nearer or farther is clamped to its end.
 *  Kept in step with `leg-out` / `leg-in` in the stylesheet by hand. */
const FLIGHT: Record<Leg, { fromShare: number; fromPx: number; toShare: number; toPx: number }> = {
  out: { fromShare: 0.26, fromPx: 16, toShare: 0.38, toPx: 760 },
  in: { fromShare: 0.62, fromPx: 760, toShare: 0.74, toPx: 16 },
};

/** Where the creature is assumed to cross until the pane has been measured: about the
 *  middle of the flight. Replaced before first paint. */
const UNMEASURED_PX = 388;

/** The height the creature crosses the rule at, as a share of the window's height — the
 *  other thing both panes agree on. The two windows do not sit at one height (the thread
 *  pane's is pushed up by the composer under it), so each pane also measures how far its
 *  window is from this line and lets the flight drift to it by the edge. */
const FLIGHT_LINE_SHARE = 0.465;

/** The flight's length in px, the distance the drift is spread over. */
const FLIGHT_PX = 760 - 16;

/** The header slides one 56px weather tile in 14s; the window's tile is the same. */
const WEATHER_S = 14;

/* ---------- the residents ---------- */

/** Every resident is drawn with its own gradients, so it takes an `id` to keep them
 *  apart: the same creature is drawn twice a pane (at home and out in the pane) and in
 *  both panes. */
interface CreatureProps {
  id: string;
}

/** Christmas's Santa in his sleigh, flying to the right, 72 × 38: one reindeer out in
 *  front, antlers up and legs stretched in the gallop, the reins back to Santa's hand;
 *  the sleigh red with its gold runner curling up at the front, the sack behind him. */
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
      <linearGradient id={`${id}-deer`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a5733f" />
        <stop offset="100%" stopColor="#7a4e2a" />
      </linearGradient>
    </defs>
    {/* the reindeer: legs in the gallop, body, neck and head, antlers, the red nose */}
    <g stroke={`url(#${id}-deer)`} strokeWidth="2.2" strokeLinecap="round" fill="none">
      <path d="M50 26l-5 6M54 27l-1 7M60 26l4 6M63 25l5 4" />
    </g>
    <ellipse cx="57" cy="22" rx="9" ry="5.2" fill={`url(#${id}-deer)`} />
    <ellipse cx="57" cy="24" rx="5" ry="2.4" fill="#d9c3a8" opacity="0.6" />
    <path d="M63 19q3-6 4-9" stroke={`url(#${id}-deer)`} strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="68.5" cy="9.5" rx="3.6" ry="2.6" fill={`url(#${id}-deer)`} />
    <path d="M66 7l-2-4M66 7l1-5M64 3l-2-1M65 2l2-1" stroke="#5a3a20" strokeWidth="1.1" strokeLinecap="round" />
    <ellipse cx="65" cy="8.5" rx="1.6" ry="0.9" fill="#8a5a2b" transform="rotate(-30 65 8.5)" />
    <circle cx="69.5" cy="8.8" r="0.6" fill="#2b2b33" />
    <circle cx="71.6" cy="10.4" r="1.2" fill="#e5484d" />
    <circle cx="71.3" cy="10.1" r="0.4" fill="#fff" opacity="0.7" />
    {/* harness and reins */}
    <path d="M58 17q-1 4 0 8" stroke="#d8232a" strokeWidth="1" />
    <path d="M52 19q-8-2-18 1" fill="none" stroke="#5a3a20" strokeWidth="0.8" />
    {/* the sleigh: runner, then the body over it */}
    <path d="M4 34q2 3 6 3h32q4 0 6-3" fill="none" stroke="#d9a83f" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M42 34q6-1 6-7" fill="none" stroke="#d9a83f" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M10 34v-3M22 34v-3M36 34v-3" stroke="#d9a83f" strokeWidth="1.2" />
    <circle cx="10" cy="18" r="6.5" fill={`url(#${id}-sack)`} />
    <path d="M12 12q2-2 4-1" fill="none" stroke="#6d4423" strokeWidth="2" strokeLinecap="round" />
    <path d="M6 22q-2-6 5-8h28q5 0 6 5l-2 12H8z" fill={`url(#${id}-coat)`} />
    <path d="M8 27h35l-1 4H8z" fill="#000" opacity="0.1" />
    <path d="M6 21.5q4-1.5 8-1.5h25q4 0 5.5 2" fill="none" stroke="#f2c14e" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M12 26q6 3 12 0" fill="none" stroke="#f2c14e" strokeWidth="0.9" opacity="0.8" />
    {/* Santa, seated: coat, arm on the reins, head, beard, hat */}
    <path d="M18 22V16q0-6 6-7h6q6 1 6 7v6z" fill={`url(#${id}-coat)`} />
    <rect x="17.5" y="20.5" width="19" height="2.4" fill="#2b2b33" />
    <rect x="25.5" y="20" width="3.4" height="3.4" rx="0.7" fill="#f2c14e" />
    <rect x="26.6" y="9" width="2" height="11" fill="#fff" />
    <path d="M34 17l6 2" stroke="#d1292c" strokeWidth="3.4" strokeLinecap="round" />
    <circle cx="40.5" cy="19.4" r="1.8" fill="#2b2b33" />
    <circle cx="27" cy="7" r="5.2" fill={`url(#${id}-skin)`} />
    <circle cx="24" cy="8.5" r="1.2" fill="#e8807a" opacity="0.45" />
    <circle cx="30" cy="8.5" r="1.2" fill="#e8807a" opacity="0.45" />
    <circle cx="25.2" cy="6.6" r="0.7" fill="#2b2b33" />
    <circle cx="28.8" cy="6.6" r="0.7" fill="#2b2b33" />
    <circle cx="27" cy="8.4" r="1.1" fill="#e59a8a" />
    <path d="M21.5 8.5q0 7.5 5.5 9 5.5-1.5 5.5-9-2 4-5.5 4.5-3.5-.5-5.5-4.5z" fill={`url(#${id}-beard)`} />
    <path d="M23.8 9.8q3.2-1.8 6.4 0-1.2 1.8-3.2 1.2-2 .6-3.2-1.2z" fill="#fff" />
    <path d="M21 3.5C22 -1 28 -2 32 0c2 1 3 2.5 3.5 4.5z" fill={`url(#${id}-coat)`} />
    <path d="M32 0q3.5 1 5.5 5.5" fill="none" stroke="#c9262a" strokeWidth="3" strokeLinecap="round" />
    <circle cx="38" cy="6.2" r="2" fill="#fff" />
    <rect x="20" y="3" width="16.5" height="3" rx="1.5" fill="#fff" />
  </g>
);

/** New Year's sheep — the coming year's animal — facing right, 48 × 34: a cloud of wool
 *  in overlapping curls, a tan face with a curled horn, hooves, a red Chinese knot with
 *  its tassels at the neck, and a red envelope carried in its mouth. */
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
    {/* the Chinese knot at the neck: the diamond, its loops, the two tassels */}
    <path d="M33.5 16l3 3-3 3-3-3z" fill="#d8232a" />
    <path d="M33.5 17.4l1.6 1.6-1.6 1.6-1.6-1.6z" fill="none" stroke="#f2c14e" strokeWidth="0.5" />
    <path
      d="M31 17.5q-2-1.5-1.5 1.5M36 17.5q2-1.5 1.5 1.5"
      fill="none"
      stroke="#d8232a"
      strokeWidth="0.9"
      strokeLinecap="round"
    />
    <path d="M32.6 22v4M34.4 22v4" stroke="#d8232a" strokeWidth="1" strokeLinecap="round" />
    <path d="M32.6 22.6h1.8" stroke="#f2c14e" strokeWidth="0.7" />
    {/* the red envelope in its mouth, gold band and seal */}
    <g transform="rotate(-12 47 17)">
      <rect x="44" y="15.5" width="6.4" height="4.4" rx="0.5" fill="#d8232a" />
      <rect x="44" y="15.5" width="6.4" height="1.3" rx="0.5" fill="#f04a4f" />
      <path d="M44.4 18.4h5.6" stroke="#f2c14e" strokeWidth="0.5" />
      <circle cx="47.2" cy="17.8" r="0.8" fill="none" stroke="#f2c14e" strokeWidth="0.45" />
    </g>
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
    creature: { draw: (id) => <Sheep id={id} />, width: 52, height: 34, homeScale: 0.66 },
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
    creature: { draw: (id) => <Santa id={id} />, width: 72, height: 38, homeScale: 0.56 },
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

/** The share of the loop at which a leg's creature is `distance` px from the window —
 *  at the pane's edge, when that is what is measured. */
const edgeShare = (leg: Leg, distance: number): number => {
  const flight = FLIGHT[leg];
  const along = Math.min(1, Math.max(0, (distance - flight.fromPx) / (flight.toPx - flight.fromPx)));
  return flight.fromShare + along * (flight.toShare - flight.fromShare);
};

/** Where each of this pane's legs stands in the loop: read off the clock, then shifted
 *  so that the creature crosses this pane's edge at that leg's hand-off — the left
 *  pane's `out` leg and the right pane's `in` leg meet at the rightward hand-off, the
 *  other two at the return. */
const phasesOf = (panel: PanelProps['panel'], edgeDistance: number): Record<Leg, string> => {
  const now = Date.now();
  const handoff: Record<Leg, number> =
    panel === 'left' ? { out: HANDOFF.toRight, in: HANDOFF.toLeft } : { out: HANDOFF.toLeft, in: HANDOFF.toRight };
  return {
    out: phaseNow(LOOP_S, now, (edgeShare('out', edgeDistance) - handoff.out) * LOOP_S),
    in: phaseNow(LOOP_S, now, (edgeShare('in', edgeDistance) - handoff.in) * LOOP_S),
  };
};

interface EdgeGeometry {
  /** From the window's centre — where the creature is anchored — to the edge it leaves
   *  or enters this pane by: the left pane's right edge, the right pane's left. */
  distance: number;
  /** How far down (up, when negative) the creature is at the far end of a leg, so that
   *  at the pane's edge it is on the flight line. In px, for the keyframes. */
  drift: number;
}

const edgeGeometry = (porthole: HTMLElement, panel: PanelProps['panel']): EdgeGeometry => {
  const pane = clippingBox(porthole);
  const box = porthole.getBoundingClientRect();
  const centre = box.left + box.width / 2;
  const distance = panel === 'left' ? pane.right - centre : centre - pane.left;
  // The drift is linear along the flight, so the amount at its far end is the amount
  // wanted at the edge scaled up by the flight's length over the edge's distance. An
  // edge nearer than the flight's start would send it to infinity; no pane is that thin.
  const toLine = window.innerHeight * FLIGHT_LINE_SHARE - (box.top + box.height / 2);
  const drift = (toLine * FLIGHT_PX) / (Math.max(distance, 100) - 16);
  return { distance, drift };
};

/** What is behind the glass. There is no rim: the header's band has no frame either — it
 *  fades out at both ends with a mask — and a lacquered ring with a highlight on it is
 *  the vocabulary of an app icon, not of the picture this is supposed to belong to. So
 *  the scene simply stops being there towards its edge. The creature is not drawn here:
 *  it is the legs' business, at home or away. */
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
      </g>
    </>
  );
};

const LEGS: readonly Leg[] = ['out', 'in'];

/** The window, in the icon tile's place, and the creature on its two legs. */
const EmptyPorthole: React.FC<PanelProps> = ({ festival, panel }) => {
  const rootRef = useRef<HTMLSpanElement>(null);

  // Read once per measurement: a phase that moved with every render would move the
  // creature with it.
  const [phase, setPhase] = useState(() => ({
    legs: phasesOf(panel, UNMEASURED_PX),
    drift: 0,
    weather: phaseNow(WEATHER_S),
  }));

  // Where this pane's edge is can only be measured once the window is laid out; the
  // first read happens before first paint, so the creature never shows at the guessed
  // phase. The pane's shape goes on changing after that — the composer under the thread
  // pane grows as its chips come in and moves the window up, and the divider can be
  // dragged — so the pane is watched and the geometry read again whenever it changes.
  // Re-reading does not jolt the loop: the phase is read off the clock each time, so the
  // creature carries on from where it is; only the edge it is aiming for moves.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root === null) {
      return undefined;
    }
    const measure = () => {
      const { distance, drift } = edgeGeometry(root, panel);
      const legs = phasesOf(panel, distance);
      setPhase((previous) => ({ ...previous, legs, drift }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(clippingElement(root) ?? root);
    return () => observer.disconnect();
  }, [panel]);

  const { creature } = SCENES[festival];

  return (
    <span
      ref={rootRef}
      className={styles.porthole}
      aria-hidden
      data-festive-porthole={panel}
      style={{
        ['--loop' as string]: `${LOOP_S}s`,
        // Which way out of this pane the other one lies.
        ['--dir' as string]: panel === 'left' ? 1 : -1,
        ['--dy' as string]: `${phase.drift.toFixed(1)}px`,
        // The creature's scale when it is in the window: the size it was drawn at as the
        // resident (homeScale of the 120-unit view in 118px), over the 1.2× the legs
        // draw it at.
        ['--home' as string]: ((creature.homeScale * 118) / 144).toFixed(3),
      }}
    >
      <svg viewBox="0 0 120 120" width="118" height="118" overflow="visible">
        <PortholeScene id={`ph-${panel}-${festival}`} festival={festival} weatherPhase={phase.weather} />
      </svg>
      {/* The legs are anchored to the window rather than to the pane, and the pane clips
          them — that is what makes the creature leave the screen. The drawing is centred
          on the anchor, so the translate in the keyframes is where its centre is: the
          number the hand-off is worked out from. */}
      {LEGS.map((leg) => (
        <span
          key={leg}
          className={`${styles.escape} ${leg === 'out' ? styles.legOut : styles.legIn}`}
          data-festive-escape={panel}
          data-leg={leg}
          style={{ ['--phase' as string]: phase.legs[leg] }}
        >
          <svg
            viewBox={`0 0 ${creature.width} ${creature.height}`}
            width={creature.width * 1.2}
            height={creature.height * 1.2}
            style={{ left: -(creature.width * 1.2) / 2, top: -(creature.height * 1.2) / 2 }}
            overflow="visible"
          >
            {creature.draw(`ph-${panel}-${festival}-${leg}`)}
          </svg>
        </span>
      ))}
    </span>
  );
};

export default EmptyPorthole;
