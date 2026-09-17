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

/** Christmas's Santa, facing right, 34 × 30: hat with its tip over, beard, red coat with
 *  the belt, boots, the sack on his back, and a mitten up in a wave. */
const Santa: React.FC = () => (
  <g className={styles.bob}>
    <circle cx="8" cy="13" r="6" fill="#8a5a2b" />
    <path d="M9 27V17q0-6 7-6h4q7 0 7 6v10z" fill="#d8232a" />
    <rect x="9" y="24.5" width="18" height="2.5" fill="#fff" />
    <rect x="9" y="20" width="18" height="2.4" fill="#2b2b33" />
    <rect x="16" y="19.6" width="3.4" height="3.2" rx="0.5" fill="#f2c14e" />
    <path d="M11 27h5v3h-6zM20 27h5v3h-5z" fill="#2b2b33" />
    <path className={styles.wave} d="M26 18l4-6" stroke="#d8232a" strokeWidth="3" strokeLinecap="round" />
    <circle className={styles.wave} cx="30.5" cy="11.5" r="1.9" fill="#2b2b33" />
    <circle cx="18" cy="9.5" r="5" fill="#f5c9a3" />
    <path d="M13 10q5 9 10 0 1 6-5 8-6-2-5-8z" fill="#fff" />
    <path d="M12 6.5q6-8 13-.5z" fill="#d8232a" />
    <rect x="11.5" y="5.5" width="13.5" height="2.6" rx="1.3" fill="#fff" />
    <circle cx="25.5" cy="3.5" r="1.7" fill="#fff" />
    <circle cx="16.8" cy="9" r="0.7" fill="#2b2b33" />
    <circle cx="19.8" cy="9" r="0.7" fill="#2b2b33" />
    <circle cx="18.6" cy="10.8" r="1" fill="#e59a8a" />
  </g>
);

/** New Year's sheep — the coming year's animal — facing right, 38 × 26: a cloud of wool,
 *  small curled horn, a red bow at the neck with a gold bell on it. */
const Sheep: React.FC = () => (
  <g className={styles.bob}>
    <path d="M10 20v5M15 20v5M24 20v5M29 20v5" stroke="#5a4a3a" strokeWidth="2" strokeLinecap="round" />
    <circle cx="6" cy="13" r="2.2" fill="#fbf6ec" stroke="#d9cfc0" strokeWidth="0.8" />
    <path
      d="M6 16a5 5 0 0 1 6-6 5 5 0 0 1 9-2 5 5 0 0 1 9 2 5 5 0 0 1 4 8 5 5 0 0 1-4 4H10a5 5 0 0 1-4-6z"
      fill="#fbf6ec"
      stroke="#d9cfc0"
      strokeWidth="0.8"
    />
    <ellipse cx="26.5" cy="10.5" rx="2.6" ry="1.3" fill="#e8d8c8" />
    <ellipse cx="31" cy="12" rx="5.2" ry="4.4" fill="#e8d8c8" />
    <path d="M29.5 8.5q-3.5-3.5.5-5.5" stroke="#c9a04a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <circle cx="30" cy="8" r="3" fill="#fbf6ec" stroke="#d9cfc0" strokeWidth="0.8" />
    <circle cx="32.8" cy="11.6" r="0.8" fill="#2b2b33" />
    <circle cx="35.6" cy="13.2" r="0.9" fill="#c48a8a" />
    <path d="M25 16.5l-3.2-2.2v4.4zM25 16.5l3.2-2.2v4.4z" fill="#d8232a" />
    <circle cx="25" cy="16.5" r="1" fill="#f2c14e" />
    <circle cx="27.5" cy="19.5" r="1.5" fill="#f2c14e" stroke="#d9a83f" strokeWidth="0.5" />
  </g>
);

/** Mid-Autumn's Chang'e, flying to the right, 44 × 20: the gown streaming behind her,
 *  two ribbons trailing, an arm reaching for the moon, hair up with its pin. */
const ChangE: React.FC = () => (
  <g className={styles.bob}>
    <g className={styles.flutter} fill="none" strokeLinecap="round">
      <path d="M14 9q-8-6-14-2" stroke="#e8a0b0" strokeWidth="1.6" />
      <path d="M14 13q-8 6-14 3" stroke="#f2c14e" strokeWidth="1.4" />
    </g>
    <path d="M6 13q8-9 24-6l2 6q-14 6-26 2z" fill="#f9eef2" stroke="#e8a0b0" strokeWidth="0.6" />
    <path d="M9 12q6 4 14 2" stroke="#e8a0b0" strokeWidth="0.7" fill="none" />
    <path d="M28 8q3-4 6-1l-2 4z" fill="#f9eef2" />
    <path d="M31 8l7-4" stroke="#f5c9a3" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="36" cy="10.5" r="4" fill="#f5c9a3" />
    <path d="M32 10a4 4 0 0 1 8-1.5q-2-1.5-4-.5-2-1-4 2z" fill="#2b2b33" />
    <circle cx="34" cy="6.5" r="2.1" fill="#2b2b33" />
    <circle cx="34.6" cy="5.2" r="0.9" fill="#f2c14e" />
    <circle cx="37.6" cy="10.8" r="0.6" fill="#2b2b33" />
    <circle cx="38.6" cy="12.4" r="0.55" fill="#e0454f" />
  </g>
);

/** Halloween's ghost, 24 × 26: the sheet with its wavy hem, two eyes and an O of a mouth,
 *  and two little arms out. */
const Ghost: React.FC = () => (
  <g className={styles.bob}>
    <path d="M3 15q-3 2-2 5M21 15q3 2 2 5" stroke="#f2f2f7" strokeWidth="2.4" strokeLinecap="round" />
    <path
      d="M3 24V11a9 9 0 0 1 18 0v13c-1.5-1.8-3-1.8-4.5 0-1.5-1.8-3-1.8-4.5 0-1.5-1.8-3-1.8-4.5 0-1.5-1.8-3-1.8-4.5 0z"
      fill="#f2f2f7"
      stroke="#d6d6de"
      strokeWidth="0.6"
    />
    <circle cx="9" cy="11" r="1.4" fill="#3b3b46" />
    <circle cx="15" cy="11" r="1.4" fill="#3b3b46" />
    <ellipse cx="12" cy="15.5" rx="1.4" ry="2" fill="#3b3b46" />
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
    creature: { node: <Sheep />, width: 38, height: 26 },
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
    creature: { node: <Santa />, width: 34, height: 30 },
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
    creature: { node: <Ghost />, width: 24, height: 26 },
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
    creature: { node: <ChangE />, width: 44, height: 20 },
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
