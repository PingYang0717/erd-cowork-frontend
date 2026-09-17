import React from 'react';

import {
  BellMotif,
  BulbMotif,
  CatMotif,
  FlagMotif,
  HangingBatMotif,
  IngotsMotif,
  KnotMotif,
  MandarinsMotif,
  PumpkinMotif,
  RabbitsAndMooncakeMotif,
  RabbitWithLanternMotif,
  RedEnvelopesMotif,
  RedLanternMotif,
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
 *    ground   a 40px strip at the rail's foot with a few of the header's standing pieces
 *
 *  The ground is the one that costs space: it is reserved, not painted behind the list,
 *  because rows scrolling over a snowman looked like a bug. Halloween has no weather —
 *  nothing falls in its header either. All three are decoration and nothing else:
 *  `aria-hidden`, no pointer events, gone the moment the festival or the switch is. The
 *  drawings come from `festiveMotifs`, the same paths as the header's own. */

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
  full: Hung[];
  compact: Hung[];
}

const LIGHT_COLORS = ['#ff5c5c', '#f5d777', '#5cc282', '#6fb3ff'];

const STRINGS: Record<Festival, StringSpec> = {
  midAutumn: {
    stroke: 'var(--erd-color-text, rgba(0, 0, 0, 0.88))',
    strokeOpacity: 0.35,
    full: [
      { at: 0.1, node: <StrungLanternMotif transform="scale(0.62)" /> },
      { at: 0.25, node: <KnotMotif transform="scale(0.8)" /> },
      { at: 0.38, node: <StrungLanternMotif transform="scale(0.68)" /> },
      { at: 0.5, node: <KnotMotif transform="scale(0.8)" /> },
      { at: 0.62, node: <StrungLanternMotif transform="scale(0.68)" /> },
      { at: 0.75, node: <KnotMotif transform="scale(0.8)" /> },
      { at: 0.9, node: <StrungLanternMotif transform="scale(0.62)" /> },
    ],
    compact: [
      { at: 0.3, node: <StrungLanternMotif transform="scale(0.45)" /> },
      { at: 0.7, node: <StrungLanternMotif transform="scale(0.45)" /> },
    ],
  },
  halloween: {
    stroke: 'var(--erd-color-text, rgba(0, 0, 0, 0.88))',
    strokeOpacity: 0.35,
    full: [
      ...[0.06, 0.17, 0.39, 0.5, 0.61, 0.83, 0.94].map((at, i) => ({
        at,
        node: <FlagMotif color={i % 2 === 0 ? '#ef8a2c' : '#7a5cc6'} transform="scale(0.9)" />,
      })),
      { at: 0.28, node: <HangingBatMotif transform="scale(0.8)" /> },
      { at: 0.72, node: <HangingBatMotif transform="scale(0.8)" /> },
    ],
    compact: [
      { at: 0.3, node: <FlagMotif color="#ef8a2c" transform="scale(0.6)" /> },
      { at: 0.7, node: <FlagMotif color="#7a5cc6" transform="scale(0.6)" /> },
    ],
  },
  christmas: {
    stroke: '#8a8a96',
    strokeOpacity: 0.5,
    full: [
      ...[0.06, 0.18, 0.3, 0.42, 0.58, 0.7, 0.82, 0.94].map((at, i) => ({
        at,
        node: <BulbMotif color={LIGHT_COLORS[i % LIGHT_COLORS.length]} transform="scale(0.9)" />,
        twinkle: i % 2 === 0 ? ('early' as const) : ('late' as const),
      })),
      { at: 0.24, node: <BellMotif transform="scale(0.8)" /> },
      { at: 0.5, node: <BellMotif transform="scale(0.8)" /> },
      { at: 0.76, node: <BellMotif transform="scale(0.8)" /> },
    ],
    compact: [
      { at: 0.3, node: <BulbMotif color={LIGHT_COLORS[0]} transform="scale(0.6)" />, twinkle: 'early' },
      { at: 0.7, node: <BulbMotif color={LIGHT_COLORS[1]} transform="scale(0.6)" />, twinkle: 'late' },
    ],
  },
  lunarNewYear: {
    stroke: '#d9a83f',
    strokeOpacity: 0.6,
    full: [
      { at: 0.1, node: <RedLanternMotif transform="scale(0.62)" /> },
      { at: 0.25, node: <TasselMotif transform="scale(0.8)" /> },
      { at: 0.38, node: <RedLanternMotif transform="scale(0.68)" /> },
      { at: 0.5, node: <TasselMotif transform="scale(0.8)" /> },
      { at: 0.62, node: <RedLanternMotif transform="scale(0.68)" /> },
      { at: 0.75, node: <TasselMotif transform="scale(0.8)" /> },
      { at: 0.9, node: <RedLanternMotif transform="scale(0.62)" /> },
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
  const height = compact ? 16 : 26;
  const sag = compact ? 5 : 10;
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

interface Standing {
  /** Left edge as a fraction of the strip's width. */
  at: number;
  viewBox: string;
  width: number;
  height: number;
  node: React.ReactNode;
}

/** What stands on the rail's floor. The first entry is the one the collapsed rail keeps. */
const GROUNDS: Record<Festival, Standing[]> = {
  midAutumn: [
    {
      at: 0.1,
      viewBox: '0 0 26 22',
      width: 26,
      height: 22,
      node: <RabbitWithLanternMotif glowClassName={fd.breathe} />,
    },
    { at: 0.5, viewBox: '0 0 48 22', width: 44, height: 20, node: <RabbitsAndMooncakeMotif /> },
  ],
  halloween: [
    {
      at: 0.12,
      viewBox: '0 0 44 44',
      width: 28,
      height: 28,
      node: <PumpkinMotif faceClassName={fd.breathe} />,
    },
    { at: 0.45, viewBox: '0 0 20 20', width: 17, height: 17, node: <CatMotif /> },
    {
      at: 0.72,
      viewBox: '0 0 44 44',
      width: 20,
      height: 20,
      node: <PumpkinMotif faceClassName={fd.breathe} />,
    },
  ],
  christmas: [
    { at: 0.12, viewBox: '0 -2 22 30', width: 22, height: 30, node: <SnowmanMotif /> },
    {
      at: 0.5,
      viewBox: '0 0 20 24',
      width: 20,
      height: 24,
      node: <SmallTreeMotif twinkle={fd.twinkle} twinkleLate={fd.twinkleLate} />,
    },
    {
      at: 0.78,
      viewBox: '0 0 20 24',
      width: 15,
      height: 18,
      node: <SmallTreeMotif twinkle={fd.twinkleLate} twinkleLate={fd.twinkle} />,
    },
  ],
  lunarNewYear: [
    { at: 0.08, viewBox: '0 0 20 16', width: 20, height: 16, node: <RedEnvelopesMotif /> },
    { at: 0.38, viewBox: '0 0 30 12', width: 30, height: 12, node: <IngotsMotif /> },
    { at: 0.7, viewBox: '0 0 24 12', width: 24, height: 12, node: <MandarinsMotif /> },
  ],
};

/** The floor at the rail's foot. Still, like the header's near pieces: only a light
 *  breathes or a bauble twinkles. */
export const FestiveGround: React.FC<RailFestiveProps> = ({ festival, compact = false }) => {
  const pieces = compact ? GROUNDS[festival].slice(0, 1) : GROUNDS[festival];
  return (
    <div className={compact ? styles.railGroundCompact : styles.railGround} aria-hidden data-festive-rail="ground">
      {pieces.map((piece) => (
        <svg
          key={piece.at}
          className={styles.railPiece}
          style={compact ? { left: '50%', transform: 'translateX(-50%)' } : { left: `${piece.at * 100}%` }}
          viewBox={piece.viewBox}
          width={piece.width}
          height={piece.height}
        >
          {piece.node}
        </svg>
      ))}
    </div>
  );
};
