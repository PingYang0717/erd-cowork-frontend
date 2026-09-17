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
 *  header's rule for its near piece. One creature a festival, none of them used on the
 *  header or the floor: the koi in the New Year pond, a robin on the Christmas snow, a
 *  crow on the Halloween ground, the toad in the Mid-Autumn moon. */

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

/** Lunar New Year's koi, nose to the right, 40 × 20. The tail and the fins carry their own
 *  beats over the body's roll: a fish that moves in one piece is a fish-shaped card. */
const Koi: React.FC = () => (
  <g className={styles.koiBody}>
    <path className={styles.koiFinTop} d="M20 6.4q3-5 7.4-4.6-1.4 3.8-4.2 5.8z" fill="#f5a03c" opacity="0.85" />
    <path className={styles.koiTail} d="M12 10q-6-6-11.4-6.8 3.2 6.8 0 13.6Q6 16 12 10z" fill="#f5a03c" />
    <path d="M10 10q9-7.6 19-2.6 5 2.4 9 1-3 6.6-9 5.4Q19 18.6 10 10z" fill="#f28c28" />
    <path d="M17 5.6q6-1.6 10 1.4-5 2.8-10-1.4z" fill="#fff" opacity="0.8" />
    <path d="M19 14.6q6 2 10-.6-5-2.8-10 .6z" fill="#fff" opacity="0.55" />
    <path className={styles.koiFinLow} d="M21 13.4q1.6 4 5.2 4.6-.8-3.4-2.8-5.2z" fill="#f5a03c" opacity="0.8" />
    <circle cx="33.4" cy="8.6" r="1" fill="#2b2b33" />
    <path d="M35.6 10.6q2.8.6 3.8 2.6" fill="none" stroke="#f5a03c" strokeWidth="0.8" strokeLinecap="round" />
  </g>
);

/** Christmas's robin, facing right, 26 × 20: a round grey-brown body with the red breast,
 *  a wing that beats, a stub of tail. */
const Robin: React.FC = () => (
  <g className={styles.bob}>
    <path d="M2 9l6-1-4 5z" fill="#6b5a4e" />
    <ellipse cx="14" cy="12" rx="9" ry="7" fill="#7d6b5d" />
    <path d="M9 12q5 8 12 4-1-8-12-4z" fill="#e8583c" />
    <circle cx="19" cy="7.5" r="4.5" fill="#7d6b5d" />
    <path d="M16.5 6.5q3-2.5 6 0-3 2.5-6 0z" fill="#e8583c" />
    <path className={styles.wing} d="M8 10q6-4 11 0-4 5-11 0z" fill="#5f4f43" />
    <circle cx="21" cy="6.5" r="0.9" fill="#2b2b33" />
    <path d="M23.4 7.6l3 .6-3 1z" fill="#2b2b33" />
    <path d="M12 19v1.5M15 19v1.5" stroke="#2b2b33" strokeWidth="0.9" strokeLinecap="round" />
  </g>
);

/** Halloween's crow, facing right, 30 × 20: the one silhouette that flies. */
const Crow: React.FC = () => (
  <g className={styles.bob}>
    <path d="M2 8l7 1-5 5z" fill="#1f1f26" />
    <ellipse cx="15" cy="12" rx="9.5" ry="6" fill="#1f1f26" />
    <circle cx="22" cy="7" r="4" fill="#1f1f26" />
    <path d="M25.5 6.5l4.5 1.2-4.5 1.6z" fill="#3b3b46" />
    <path className={styles.wing} d="M9 10q7-6 14-1-6 6-14 1z" fill="#2b2b33" />
    <circle cx="23.2" cy="6.2" r="0.8" fill="#f2f2f7" />
    <path d="M13 18v2M17 18v2" stroke="#1f1f26" strokeWidth="1" strokeLinecap="round" />
  </g>
);

/** Mid-Autumn's toad, facing right, 28 × 18: the one that lives in the moon. */
const Toad: React.FC = () => (
  <g className={styles.hop}>
    <ellipse cx="14" cy="12" rx="11" ry="6" fill="#6f8f3e" />
    <path d="M6 9q4-6 10-4 5-2 8 2-1 4-5 4h-8q-4 0-5-2z" fill="#7fa04a" />
    <circle cx="10" cy="7" r="2.4" fill="#7fa04a" />
    <circle cx="19" cy="6.5" r="2.4" fill="#7fa04a" />
    <circle cx="10.4" cy="6.8" r="1.1" fill="#2b2b33" />
    <circle cx="19.4" cy="6.3" r="1.1" fill="#2b2b33" />
    <path d="M12 11.5q4 2.5 8 0" fill="none" stroke="#3f5a26" strokeWidth="0.8" strokeLinecap="round" />
    <g fill="#5f8f3e">
      <path d="M3 15q-2 3 2 3h4z" />
      <path d="M23 15q3 3-1 3h-4z" />
    </g>
    <g fill="#9db85a" opacity="0.8">
      <circle cx="9" cy="12" r="0.9" />
      <circle cx="15" cy="14" r="0.9" />
      <circle cx="21" cy="12.5" r="0.8" />
    </g>
  </g>
);

interface Scene {
  /** The sky's tint at the top of the glass, and the ground's at the bottom. */
  sky: string;
  ground: string;
  /** What stands far off behind the creature, in silhouette. */
  far: React.ReactNode;
  creature: { node: React.ReactNode; width: number; height: number };
}

const SCENES: Record<Festival, Scene> = {
  lunarNewYear: {
    sky: 'rgba(200, 40, 50, 0.05)',
    ground: 'rgba(200, 40, 50, 0.14)',
    far: (
      <>
        {/* the pond floor and what grows out of it */}
        <path d="M0 74q30-10 60 0t60 0v50H0z" fill={INK} opacity="0.08" />
        <g fill={INK} opacity="0.12">
          <ellipse cx="26" cy="92" rx="15" ry="4.4" />
          <path d="M26 92l-4-7" stroke={INK} strokeWidth="1.2" fill="none" />
          <ellipse cx="92" cy="84" rx="11" ry="3.4" />
          <ellipse cx="74" cy="100" rx="13" ry="4" />
        </g>
        <g className={styles.ripples} fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" opacity="0.14">
          <path d="M16 84h16M46 90h20M80 78h14M34 104h18" />
        </g>
      </>
    ),
    creature: { node: <Koi />, width: 40, height: 20 },
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
    creature: { node: <Robin />, width: 26, height: 20 },
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
    creature: { node: <Crow />, width: 30, height: 20 },
  },
  midAutumn: {
    sky: 'rgba(44, 52, 128, 0.05)',
    ground: 'rgba(44, 52, 128, 0.12)',
    far: (
      <>
        {/* the moon fills the glass: a pale disc with its seas, the cloud bank low across it */}
        <circle cx="60" cy="58" r="40" fill="#f6dc8a" opacity="0.35" />
        <g fill={INK} opacity="0.06">
          <ellipse cx="48" cy="46" rx="9" ry="6" />
          <ellipse cx="70" cy="56" rx="6" ry="4" />
          <ellipse cx="56" cy="68" rx="5" ry="3" />
        </g>
        <g transform="translate(0 80) scale(0.5 1)">{GROUND_BACKDROPS.midAutumn.band}</g>
      </>
    ),
    creature: { node: <Toad />, width: 28, height: 18 },
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
          <g transform={`translate(${60 - scene.creature.width * 0.41} 46) scale(0.82)`}>{scene.creature.node}</g>
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
          width={scene.creature.width * 1.4}
          height={scene.creature.height * 1.4}
          overflow="visible"
        >
          {scene.creature.node}
        </svg>
      </span>
    </span>
  );
};
