import React, { useState } from 'react';

import {
  BellMotif,
  BulbMotif,
  CatMotif,
  CatWalker,
  FlagMotif,
  GROUND_BACKDROPS,
  HangingBatMotif,
  IngotsMotif,
  KnotMotif,
  LionWalker,
  MandarinsMotif,
  PumpkinMotif,
  RabbitsAndMooncakeMotif,
  RabbitWalker,
  RabbitWithLanternMotif,
  RedEnvelopesMotif,
  RedLanternMotif,
  ReindeerWalker,
  SmallTreeMotif,
  SnowmanMotif,
  StrungLanternMotif,
  TasselMotif,
  WEATHER_TILES,
} from '@/components/layouts/festiveMotifs';
import type { Festival } from '@/utils/festival';

import styles from './SessionRailFestive.module.css';
import fd from '@/components/layouts/FestiveDecoration.module.css';

/** The session rail's three echoes of the header's festive scene (CONTEXT.md, 節慶裝飾),
 *  each in a place the mockup leaves empty, none moving anything the mockup draws:
 *
 *    string   the rule under the Artifacts/Skills rows becomes the header's hung line —
 *             the same lanterns, flags, bulbs or red lanterns, smaller, swinging in step
 *    weather  what falls in the header's sky (snow, plum petals; Mid-Autumn's sky
 *             lanterns rise instead) spills over the rail's top and thins out by 112px,
 *             so the bar and the rail read as one picture rather than two dressed boxes
 *    ground   a 40px strip at the rail's foot: a band of the festival's ground — snow,
 *             grass, a bank of cloud, swept red-and-gold — with a few of the header's
 *             standing pieces on it
 *
 *  The ground is the one that costs space: it is reserved, not painted behind the list,
 *  because rows scrolling over a snowman looked like a bug. Halloween has no weather —
 *  nothing falls in its header either.
 *
 *  The ground is also the one that answers the pointer. The header's rule is that what
 *  stands on the floor does not move; here it is "does not move until touched": the
 *  pointer over the strip makes each piece stir once (a hat tips, a tail flicks, ears
 *  perk), and a click on a piece plays it a bigger one-shot turn (a jump, a run off and
 *  back, a burst of coins) after which it stands still again. Between times one walker a
 *  festival crosses the floor and waits out of sight, the way the header's traveller
 *  does. Decoration still: `aria-hidden`, not in the tab order, nothing the app does
 *  depends on it. The drawings come from `festiveMotifs`, the same paths as the header's. */

interface RailFestiveProps {
  festival: Festival;
  /** The collapsed rail's narrow versions: a shorter line, a single standing piece. */
  compact?: boolean;
}

/** The phase a hung thing swings at, from where it hangs — the header's rule, so a
 *  lantern here and one above at the same fraction move together. */
const swayAt = (at: number): React.CSSProperties => ({ animationDelay: `${-(at * 9.7).toFixed(2)}s` });

/** Where the line hangs at fraction `t`, for `M0 3q${w/2} ${sag} ${w} 0`. */
const dropAt = (t: number, sag: number): number => 3 + 2 * t * (1 - t) * sag;

interface Hung {
  at: number;
  node: React.ReactNode;
  /** Christmas's bulbs twinkle in two phases; nothing else on a string does. */
  twinkle?: 'early' | 'late';
}

interface StringSpec {
  stroke: string;
  strokeOpacity: number;
  /** How tall the full line's box is: the line's own sag plus the longest thing on it,
   *  and no more. It stands in for a 1px rule, so every pixel it keeps is a pixel the
   *  session list does not get — bells and bulbs need less room than lanterns. */
  depth: number;
  full: Hung[];
  compact: Hung[];
}

const LIGHT_COLORS = ['#ff5c5c', '#f5d777', '#5cc282', '#6fb3ff'];

const STRINGS: Record<Festival, StringSpec> = {
  midAutumn: {
    stroke: 'var(--erd-color-text, rgba(0, 0, 0, 0.88))',
    strokeOpacity: 0.35,
    depth: 20,
    full: [
      { at: 0.1, node: <StrungLanternMotif transform="scale(0.5)" /> },
      { at: 0.25, node: <KnotMotif transform="scale(0.68)" /> },
      { at: 0.38, node: <StrungLanternMotif transform="scale(0.54)" /> },
      { at: 0.5, node: <KnotMotif transform="scale(0.68)" /> },
      { at: 0.62, node: <StrungLanternMotif transform="scale(0.54)" /> },
      { at: 0.75, node: <KnotMotif transform="scale(0.68)" /> },
      { at: 0.9, node: <StrungLanternMotif transform="scale(0.5)" /> },
    ],
    compact: [
      { at: 0.3, node: <StrungLanternMotif transform="scale(0.45)" /> },
      { at: 0.7, node: <StrungLanternMotif transform="scale(0.45)" /> },
    ],
  },
  halloween: {
    stroke: 'var(--erd-color-text, rgba(0, 0, 0, 0.88))',
    strokeOpacity: 0.35,
    depth: 16,
    full: [
      ...[0.06, 0.17, 0.39, 0.5, 0.61, 0.83, 0.94].map((at, i) => ({
        at,
        node: <FlagMotif color={i % 2 === 0 ? '#ef8a2c' : '#7a5cc6'} transform="scale(0.8)" />,
      })),
      { at: 0.28, node: <HangingBatMotif transform="scale(0.7)" /> },
      { at: 0.72, node: <HangingBatMotif transform="scale(0.7)" /> },
    ],
    compact: [
      { at: 0.3, node: <FlagMotif color="#ef8a2c" transform="scale(0.6)" /> },
      { at: 0.7, node: <FlagMotif color="#7a5cc6" transform="scale(0.6)" /> },
    ],
  },
  christmas: {
    stroke: '#8a8a96',
    strokeOpacity: 0.5,
    depth: 17,
    full: [
      ...[0.06, 0.18, 0.3, 0.42, 0.58, 0.7, 0.82, 0.94].map((at, i) => ({
        at,
        node: <BulbMotif color={LIGHT_COLORS[i % LIGHT_COLORS.length]} transform="scale(0.8)" />,
        twinkle: i % 2 === 0 ? ('early' as const) : ('late' as const),
      })),
      { at: 0.24, node: <BellMotif transform="scale(0.7)" /> },
      { at: 0.5, node: <BellMotif transform="scale(0.7)" /> },
      { at: 0.76, node: <BellMotif transform="scale(0.7)" /> },
    ],
    compact: [
      { at: 0.3, node: <BulbMotif color={LIGHT_COLORS[0]} transform="scale(0.6)" />, twinkle: 'early' },
      { at: 0.7, node: <BulbMotif color={LIGHT_COLORS[1]} transform="scale(0.6)" />, twinkle: 'late' },
    ],
  },
  lunarNewYear: {
    stroke: '#d9a83f',
    strokeOpacity: 0.6,
    depth: 20,
    full: [
      { at: 0.1, node: <RedLanternMotif transform="scale(0.5)" /> },
      { at: 0.25, node: <TasselMotif transform="scale(0.68)" /> },
      { at: 0.38, node: <RedLanternMotif transform="scale(0.54)" /> },
      { at: 0.5, node: <TasselMotif transform="scale(0.68)" /> },
      { at: 0.62, node: <RedLanternMotif transform="scale(0.54)" /> },
      { at: 0.75, node: <TasselMotif transform="scale(0.68)" /> },
      { at: 0.9, node: <RedLanternMotif transform="scale(0.5)" /> },
    ],
    compact: [
      { at: 0.3, node: <RedLanternMotif transform="scale(0.45)" /> },
      { at: 0.7, node: <RedLanternMotif transform="scale(0.45)" /> },
    ],
  },
};

const twinkleClass = (phase: Hung['twinkle']): string | undefined =>
  phase === 'early' ? fd.twinkle : phase === 'late' ? fd.twinkleLate : undefined;

/** The hung line. The swing is on an inner group and the placement on an outer one:
 *  the sway animation writes `transform`, and would otherwise overwrite the translate. */
export const FestiveString: React.FC<RailFestiveProps> = ({ festival, compact = false }) => {
  const spec = STRINGS[festival];
  const width = compact ? 36 : 240;
  const height = compact ? 16 : spec.depth;
  const sag = 5;
  const items = compact ? spec.compact : spec.full;
  return (
    <svg
      className={compact ? styles.railStringCompact : styles.railString}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
      data-festive-rail="string"
    >
      <path
        d={`M0 3q${width / 2} ${sag} ${width} 0`}
        fill="none"
        stroke={spec.stroke}
        strokeWidth="0.8"
        opacity={spec.strokeOpacity}
      />
      {items.map(({ at, node, twinkle }) => (
        <g key={at} className={twinkleClass(twinkle)} transform={`translate(${at * width} ${dropAt(at, sag)})`}>
          <g className={fd.sway} style={swayAt(at)}>
            {node}
          </g>
        </g>
      ))}
    </svg>
  );
};

/** How far the weather reaches down the rail before it has thinned to nothing. Two of
 *  the header's 56px tiles, so the sheet still loops without a seam. */
const WEATHER_REACH = 112;

/** The header's falling (or rising) sheet, continued over the rail's top. Same tile,
 *  same speed: the header slides one 56px tile in 14s, so two tiles take 28s. */
export const FestiveWeather: React.FC<{ festival: Festival }> = ({ festival }) => {
  const tile = WEATHER_TILES[festival];
  if (tile === null) {
    return null;
  }
  const down = tile.direction === 'down';
  const id = `fr-weather-${festival}`;
  return (
    <div className={styles.railWeather} aria-hidden data-festive-rail="weather">
      <svg
        className={down ? fd.snow : fd.rise}
        style={{
          ['--fd-tile' as string]: `${WEATHER_REACH}px`,
          top: down ? -WEATHER_REACH : 0,
          animationDuration: down ? '28s' : '52s',
        }}
        width="100%"
        height={WEATHER_REACH * 2}
      >
        <defs>
          <pattern id={id} width={tile.width} height={tile.height} patternUnits="userSpaceOnUse">
            {tile.body}
          </pattern>
        </defs>
        <rect width="100%" height={WEATHER_REACH * 2} fill={`url(#${id})`} opacity="0.85" />
      </svg>
    </div>
  );
};

/** The ground under the strip: the tint and the band, behind the pieces and out of the
 *  pointer's way. Without it the pieces stood on nothing — the rail's own background. */
const FestiveGroundBackdrop: React.FC<RailFestiveProps> = ({ festival, compact = false }) => {
  const backdrop = GROUND_BACKDROPS[festival];
  return (
    <div
      className={compact ? styles.railBackdropCompact : styles.railBackdrop}
      aria-hidden
      data-festive-ground="backdrop"
    >
      <div className={styles.railWash} style={{ background: backdrop.wash }} />
      <svg
        className={styles.railFloor}
        viewBox={compact ? '0 0 40 40' : '0 0 240 40'}
        preserveAspectRatio="none"
        aria-hidden
      >
        {compact ? backdrop.compactBand : backdrop.band}
      </svg>
    </div>
  );
};

type PieceKind =
  'snowman' | 'tree' | 'pumpkin' | 'cat' | 'rabbitLantern' | 'rabbitsCake' | 'envelopes' | 'ingots' | 'mandarins';

interface Standing {
  kind: PieceKind;
  /** Left edge as a fraction of the strip's width. */
  at: number;
  viewBox: string;
  width: number;
  height: number;
  node: React.ReactNode;
}

/** What stands on the rail's floor. The first entry is the one the collapsed rail keeps.
 *  The parts that stir on hover carry a class from this stylesheet. */
const GROUNDS: Record<Festival, Standing[]> = {
  midAutumn: [
    {
      kind: 'rabbitLantern',
      at: 0.1,
      viewBox: '0 0 26 22',
      width: 26,
      height: 22,
      node: <RabbitWithLanternMotif glowClassName={`${fd.breathe} ${styles.glow}`} earsClassName={styles.ears} />,
    },
    {
      kind: 'rabbitsCake',
      at: 0.5,
      viewBox: '0 0 48 22',
      width: 44,
      height: 20,
      node: <RabbitsAndMooncakeMotif earsClassName={styles.ears} cakeClassName={styles.cake} />,
    },
  ],
  halloween: [
    {
      kind: 'pumpkin',
      at: 0.12,
      viewBox: '0 0 44 44',
      width: 28,
      height: 28,
      node: <PumpkinMotif faceClassName={`${fd.breathe} ${styles.face}`} />,
    },
    {
      kind: 'cat',
      at: 0.45,
      viewBox: '0 0 20 20',
      width: 17,
      height: 17,
      node: <CatMotif tailClassName={styles.tail} eyesClassName={styles.eyes} />,
    },
    {
      kind: 'pumpkin',
      at: 0.72,
      viewBox: '0 0 44 44',
      width: 20,
      height: 20,
      node: <PumpkinMotif faceClassName={`${fd.breathe} ${styles.face}`} />,
    },
  ],
  christmas: [
    {
      kind: 'snowman',
      at: 0.12,
      viewBox: '0 -2 22 30',
      width: 22,
      height: 30,
      node: <SnowmanMotif hatClassName={styles.hat} />,
    },
    {
      kind: 'tree',
      at: 0.5,
      viewBox: '0 0 20 24',
      width: 20,
      height: 24,
      node: (
        <SmallTreeMotif twinkle={`${fd.twinkle} ${styles.light}`} twinkleLate={`${fd.twinkleLate} ${styles.light}`} />
      ),
    },
    {
      kind: 'tree',
      at: 0.78,
      viewBox: '0 0 20 24',
      width: 15,
      height: 18,
      node: (
        <SmallTreeMotif twinkle={`${fd.twinkleLate} ${styles.light}`} twinkleLate={`${fd.twinkle} ${styles.light}`} />
      ),
    },
  ],
  lunarNewYear: [
    { kind: 'envelopes', at: 0.08, viewBox: '0 0 20 16', width: 20, height: 16, node: <RedEnvelopesMotif /> },
    { kind: 'ingots', at: 0.38, viewBox: '0 0 30 12', width: 30, height: 12, node: <IngotsMotif /> },
    { kind: 'mandarins', at: 0.7, viewBox: '0 0 24 12', width: 24, height: 12, node: <MandarinsMotif /> },
  ],
};

/** What a click throws off a piece, drawn over it while its turn plays: snow off the
 *  snowman and the trees, coins off the ingots, the character for luck off the red
 *  envelopes. Positioned in the piece's own viewBox; the strip clips whatever flies
 *  past its edge. */
const burstFor = (piece: Standing): React.ReactNode => {
  switch (piece.kind) {
    case 'snowman':
    case 'tree':
      return (
        <g className={styles.snowfall} fill="#fff" stroke="#d6dbe6" strokeWidth="0.4">
          <circle cx="4" cy="-3" r="1.2" />
          <circle cx="11" cy="-5" r="1.5" />
          <circle cx="17" cy="-2" r="1" />
        </g>
      );
    case 'ingots':
      return (
        <g className={styles.coins} fill="#f2c14e" stroke="#d9a83f" strokeWidth="0.5">
          <circle cx="8" cy="4" r="1.8" style={{ ['--coin-x' as string]: '-8px' }} />
          <circle cx="15" cy="3" r="2" style={{ ['--coin-x' as string]: '0px' }} />
          <circle cx="22" cy="4" r="1.8" style={{ ['--coin-x' as string]: '8px' }} />
        </g>
      );
    case 'envelopes':
      return (
        <text className={styles.luck} x="13.5" y="-2" textAnchor="middle" fontSize="8" fontWeight="700" fill="#d8232a">
          福
        </text>
      );
    default:
      return null;
  }
};

interface Walker {
  width: number;
  height: number;
  viewBox: string;
  node: React.ReactNode;
  /** How long one loop takes, crossing and wait together. */
  duration: number;
  /** Negative: how far into the loop the first run starts. */
  delay: number;
}

const WALKERS: Record<Festival, Walker> = {
  christmas: {
    width: 30,
    height: 24,
    viewBox: '0 0 34 24',
    duration: 70,
    delay: -30,
    node: <ReindeerWalker legA={styles.legA} legB={styles.legB} bob={styles.walkBob} />,
  },
  halloween: {
    width: 28,
    height: 16,
    viewBox: '0 0 28 16',
    duration: 64,
    delay: -26,
    node: <CatWalker legA={styles.legA} legB={styles.legB} bob={styles.walkBob} />,
  },
  midAutumn: {
    width: 22,
    height: 16,
    viewBox: '0 0 22 16',
    duration: 76,
    delay: -34,
    node: <RabbitWalker bob={styles.hopBob} />,
  },
  lunarNewYear: {
    width: 40,
    height: 26,
    viewBox: '0 0 40 26',
    duration: 80,
    delay: -36,
    node: <LionWalker legA={styles.legA} legB={styles.legB} bob={styles.nod} />,
  },
};

/** The floor at the rail's foot. Still until touched: the pointer over the strip stirs
 *  the pieces once (their parts' hover rules), a click on one plays its turn — set by
 *  `data-poked`, cleared when the piece's own animation ends. Only the piece's own
 *  `animationend` counts: the lights and glows inside it never end, and the burst
 *  overlay ends on its own schedule. The collapsed rail keeps one piece and no walker. */
export const FestiveGround: React.FC<RailFestiveProps> = ({ festival, compact = false }) => {
  const [poked, setPoked] = useState<number | null>(null);

  const pieces = compact ? GROUNDS[festival].slice(0, 1) : GROUNDS[festival];
  const walker = WALKERS[festival];

  return (
    <div className={compact ? styles.railGroundCompact : styles.railGround} aria-hidden data-festive-rail="ground">
      <FestiveGroundBackdrop festival={festival} compact={compact} />
      {!compact && (
        <div
          className={fd.crossTrack}
          data-festive-walker={festival}
          style={{
            ['--fd-cross-w' as string]: `${walker.width}px`,
            animationDuration: `${walker.duration}s`,
            animationDelay: `${walker.delay}s`,
          }}
        >
          <svg
            className={`${fd.crossing} ${styles.walker}`}
            viewBox={walker.viewBox}
            width={walker.width}
            height={walker.height}
          >
            {walker.node}
          </svg>
        </div>
      )}
      {pieces.map((piece, i) => (
        <svg
          key={`${piece.kind}-${piece.at}`}
          className={`${styles.railPiece} ${styles[piece.kind]}`}
          data-piece={piece.kind}
          data-poked={poked === i ? 'true' : undefined}
          style={compact ? { left: `calc(50% - ${piece.width / 2}px)` } : { left: `${piece.at * 100}%` }}
          viewBox={piece.viewBox}
          width={piece.width}
          height={piece.height}
          onClick={() => setPoked(i)}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) {
              setPoked(null);
            }
          }}
        >
          {piece.node}
          {poked === i && burstFor(piece)}
        </svg>
      ))}
    </div>
  );
};
