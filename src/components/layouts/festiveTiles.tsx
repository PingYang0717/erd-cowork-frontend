import React from 'react';

import { type Festival, FESTIVE_INK as INK } from '@/utils/festival';

/** The tiles the festive world is laid with, one set a festival: the ground band every
 *  surface's floor and both portholes stand on, and the weather that falls through every
 *  empty pane. Data, not components — kept apart from `festiveMotifs` so that file is
 *  only drawings, and this one is only what repeats. */

/* ---------- the ground they stand on ---------- */

interface GroundBackdrop {
  /** The tint rising off the floor: the header's sky gradient for this festival, turned
   *  over, because down here the colour belongs to the ground rather than the sky. */
  wash: string;
  /** The band the pieces stand on, drawn over a 240 × 40 tile that repeats seamlessly
   *  side by side: the two rolling layers meet their own ends at the same height and
   *  slope, and nothing else is drawn across the edge. Two layers, a far and a near, is
   *  what makes it ground rather than a line. */
  band: React.ReactNode;
}

/** The width of the tile every band is drawn on. */
export const GROUND_TILE = 240;

/** A rolling line across the tile, closed to the bottom: `halves` half-waves of `amp`
 *  from a baseline `y`. An even count so the tile ends the way it starts, sloping the
 *  same way, and the seam between two tiles is invisible. */
const rolling = (y: number, amp: number, halves: number): string => {
  const w = GROUND_TILE / halves;
  let d = `M0 40V${y}`;
  for (let i = 0; i < halves; i += 1) {
    const dy = i % 2 === 0 ? -amp : amp;
    d += i === 0 ? `c${w / 3} ${dy} ${(2 * w) / 3} ${dy} ${w} 0` : `s${(2 * w) / 3} ${dy} ${w} 0`;
  }
  return `${d}V40z`;
};

/** The same line open, for a stroke along the crest. */
const crest = (y: number, amp: number, halves: number): string =>
  rolling(y, amp, halves).replace('M0 40V', 'M0 ').replace(/V40z$/, '');

/** What a festival's floor is made of, for a surface that wants to stand something on it.
 *  Drawn here beside the pieces themselves rather than in the surface that uses it, so
 *  the ground and what stands on it stay one set of drawings.
 *
 *  Each is the near end of the header's scene: Christmas's snow, Halloween's grave
 *  grass, Mid-Autumn's bank of cloud at the water's edge, New Year's swept red-and-gold
 *  ground. The fills are chosen to read the same on a white pane and on a grey one —
 *  pure white snow was bright on the Artifact pane and invisible on the rail. */
export const GROUND_BACKDROPS: Record<Festival, GroundBackdrop> = {
  christmas: {
    wash: 'linear-gradient(180deg, rgba(60, 100, 170, 0) 0%, rgba(60, 100, 170, 0.05) 55%, rgba(60, 100, 170, 0.12) 100%)',
    band: (
      <>
        {/* far drifts, then the near ones with their shadowed crest */}
        <path d={rolling(24, 7, 4)} fill="#e3e9f3" opacity="0.75" />
        <path d={rolling(30, 4, 6)} fill="#f1f4f9" />
        <path d={crest(30, 4, 6)} fill="none" stroke="#cdd6e6" strokeWidth="0.9" opacity="0.8" />
        {/* a little settled snow, brighter, on two of the drifts */}
        <path d="M52 40v-5c8-3 16-3 24 1v4z" fill="#fff" opacity="0.8" />
        <path d="M168 40v-4c7-3 14-3 20 1v3z" fill="#fff" opacity="0.8" />
      </>
    ),
  },
  halloween: {
    wash: 'linear-gradient(180deg, rgba(96, 52, 140, 0) 0%, rgba(96, 52, 140, 0.05) 55%, rgba(96, 52, 140, 0.13) 100%)',
    band: (
      <>
        <path d={rolling(25, 6, 4)} fill={INK} opacity="0.12" />
        <path d={rolling(31, 4, 6)} fill={INK} opacity="0.26" />
        {/* grass gone over, the way it is around the header's headstones */}
        <g fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" opacity="0.3">
          <path d="M28 40c1-4 0-6-2-8M33 40c0-4 2-6 5-7M38 40c-1-3-1-5 1-7" />
          <path d="M128 40c1-4 0-6-2-8M133 40c0-4 2-6 5-7M138 40c-1-3-1-5 1-7" />
          <path d="M206 40c1-4 0-6-2-8M211 40c0-4 2-6 5-7" />
        </g>
      </>
    ),
  },
  midAutumn: {
    wash: 'linear-gradient(180deg, rgba(44, 52, 128, 0) 0%, rgba(44, 52, 128, 0.05) 55%, rgba(44, 52, 128, 0.12) 100%)',
    band: (
      <>
        {/* a bank of cloud: round-topped, in two rows, the far one fainter */}
        <path
          d="M0 40V29a9 9 0 0 1 17-3 10 10 0 0 1 19-1 8 8 0 0 1 14 2 11 11 0 0 1 20-1 9 9 0 0 1 16 2 10 10 0 0 1 18-2 9 9 0 0 1 16 3 11 11 0 0 1 20-1 8 8 0 0 1 14 2 10 10 0 0 1 18-2 9 9 0 0 1 16 3 11 11 0 0 1 20-1 8 8 0 0 1 12 1V40z"
          fill={INK}
          opacity="0.09"
        />
        <path
          d="M0 40V33a8 8 0 0 1 15-2 9 9 0 0 1 17-1 7 7 0 0 1 12 2 10 10 0 0 1 18-1 8 8 0 0 1 14 2 9 9 0 0 1 16-2 8 8 0 0 1 14 3 10 10 0 0 1 18-1 7 7 0 0 1 12 2 9 9 0 0 1 16-2 8 8 0 0 1 14 3 10 10 0 0 1 18-1 8 8 0 0 1 14 2 7 7 0 0 1 12-1 10 10 0 0 1 12 0V40z"
          fill={INK}
          opacity="0.16"
        />
        {/* reeds at the water's edge, the same ones the header's mid layer carries */}
        <g fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" opacity="0.28">
          <path d="M60 40c1-5 0-8-2-11M64 40c0-5 2-7 5-9M68 40c-1-4-1-7 1-10" />
          <path d="M168 40c1-5 0-8-2-11M172 40c0-5 2-7 5-9" />
        </g>
        <g fill={INK} opacity="0.28">
          <ellipse cx="58" cy="29" rx="1" ry="2.4" />
          <ellipse cx="69" cy="30.5" rx="1" ry="2.4" />
          <ellipse cx="166" cy="29" rx="1" ry="2.4" />
        </g>
      </>
    ),
  },
  lunarNewYear: {
    wash: 'linear-gradient(180deg, rgba(200, 40, 50, 0) 0%, rgba(200, 40, 50, 0.04) 55%, rgba(200, 40, 50, 0.11) 100%)',
    band: (
      <>
        <path d={rolling(25, 6, 4)} fill="#d9a83f" opacity="0.16" />
        <path d={rolling(31, 4, 6)} fill="#d9a83f" opacity="0.32" />
        <path d={crest(31, 4, 6)} fill="none" stroke="#c8282f" strokeWidth="0.9" opacity="0.35" />
        {/* spent firecracker paper and a few plum petals come to rest on the ground */}
        <g fill="#c8282f" opacity="0.4">
          <ellipse cx="44" cy="36" rx="2.4" ry="1.2" transform="rotate(-12 44 36)" />
          <ellipse cx="96" cy="37" rx="2" ry="1" transform="rotate(8 96 37)" />
          <ellipse cx="150" cy="35" rx="2.6" ry="1.2" transform="rotate(-6 150 35)" />
          <ellipse cx="204" cy="37" rx="2" ry="1" transform="rotate(14 204 37)" />
        </g>
      </>
    ),
  },
};

/* ---------- what falls or rises ---------- */

/** The header's weather as a pattern tile, for the rail to let spill: Christmas's snow,
 *  Lunar New Year's plum petals, Mid-Autumn's sky lanterns. Halloween has none — nothing
 *  falls in its sky either. Each is a `<pattern>` body; the caller owns the id and the
 *  tile size named here. */
export const WEATHER_TILES = {
  christmas: {
    width: 120,
    height: 56,
    direction: 'down' as const,
    body: (
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
    ),
  },
  lunarNewYear: {
    width: 140,
    height: 56,
    direction: 'down' as const,
    body: (
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
    ),
  },
  midAutumn: {
    width: 200,
    height: 56,
    direction: 'up' as const,
    body: (
      <g>
        <path d="M30 20l3-6h4l3 6-1 5h-8z" fill="#f6b26b" opacity="0.7" />
        <circle cx="35" cy="17" r="4" fill="#ffd28a" opacity="0.35" />
        <path d="M120 44l2.5-5h3.5l2.5 5-.8 4h-6.9z" fill="#f6b26b" opacity="0.6" />
        <circle cx="124" cy="41" r="3.5" fill="#ffd28a" opacity="0.3" />
        <path d="M172 8l2-4h3l2 4-.6 3.5h-5.8z" fill="#f6b26b" opacity="0.5" />
        <circle cx="175.5" cy="6" r="3" fill="#ffd28a" opacity="0.3" />
      </g>
    ),
  },
  halloween: null,
} as const;
