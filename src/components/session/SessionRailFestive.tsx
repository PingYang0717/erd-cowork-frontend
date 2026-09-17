import React from 'react';

import {
  BellMotif,
  BulbMotif,
  FlagMotif,
  HangingBatMotif,
  KnotMotif,
  RedLanternMotif,
  StrungLanternMotif,
  TasselMotif,
} from '@/components/layouts/festiveMotifs';
import type { Festival } from '@/utils/festival';

import styles from './SessionRailFestive.module.css';
import fd from '@/components/layouts/FestiveDecoration.module.css';

/** The session rail's own echo of the header's festive scene (CONTEXT.md, 節慶裝飾): the
 *  rule under the Artifacts/Skills rows becomes the header's hung line — the same
 *  lanterns, flags, bulbs or red lanterns, smaller, swinging in step. The weather over
 *  the rail's top and the floor at its foot are not the rail's own: they are the scene
 *  every empty surface shares (`FestiveSurfaces`), and the rail draws its stretch of
 *  them the way the empty panes draw theirs. */

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
