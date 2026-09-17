import React, { useState } from 'react';

import type { Festival } from '@/utils/festival';
import { phaseNow } from '@/utils/festiveClock';
import {
  CabinMotif,
  CandyCanesMotif,
  CatMotif,
  CatWalker,
  CauldronMotif,
  DrumMotif,
  GingerbreadMotif,
  GROUND_BACKDROPS,
  IngotsMotif,
  LampPostMotif,
  LionWalker,
  MandarinsMotif,
  PomeloMotif,
  PumpkinMotif,
  RabbitsAndMooncakeMotif,
  RabbitWalker,
  RabbitWithLanternMotif,
  RedEnvelopesMotif,
  ReindeerWalker,
  ScarecrowMotif,
  SledMotif,
  SmallTreeMotif,
  SnowmanMotif,
  TeaSetMotif,
  TombstonesMotif,
  WEATHER_TILES,
} from './festiveMotifs';

import fd from './FestiveDecoration.module.css';
import styles from './FestiveSurfaces.module.css';

/** The festive scene below the header, on the surfaces that are empty anyway
 *  (CONTEXT.md, 節慶裝飾): the session rail, the thread pane with no conversation open,
 *  the Artifact pane with nothing to show. The header is the sky and the far view; these
 *  are the same picture continued downward, and the rule for all of them is that they
 *  are one place, not three dressed boxes:
 *
 *    weather  what falls in the header's sky (snow, plum petals; Mid-Autumn's sky
 *             lanterns rise) comes over the top of each surface and thins out by 112px
 *    floor    one strip of the festival's ground along the window's foot — snow, grass,
 *             a bank of cloud, swept red-and-gold — running through the rail, behind the
 *             thread pane's composer and across the empty Artifact pane at one height,
 *             with the header's standing pieces on it
 *    walker   one figure a festival crosses the whole floor, rail to Artifact pane,
 *             and waits out of sight before coming round again
 *
 *  The surfaces never talk to each other. Each draws its own copy of the walker, fixed
 *  to the window rather than to itself, and clips it to its own box; the copies agree
 *  on where they are in the loop because every loop reads its phase off the wall
 *  clock (`phaseNow`). Three copies, one walker — the same trick as three windows onto
 *  one street.
 *
 *  The floor is the one part that answers the pointer. The header's rule is that what
 *  stands on the ground does not move; here it is "does not move until touched": the
 *  pointer over the strip makes each piece stir once (a hat tips, a tail flicks, a
 *  ghost looks up), and a click plays a piece its bigger one-shot turn (a jump, a run
 *  off and back, a burst of coins, a beat on the drum), after which it stands still
 *  again. Decoration still: `aria-hidden`, out of the tab order, nothing the app does
 *  depends on it. The drawings are `festiveMotifs`, the same paths as the header's. */

/** Where the scene is being drawn. `compact` is the collapsed rail: one piece, no side
 *  room, and the walker passing through like everywhere else. */
export type FestiveSurface = 'rail' | 'compact' | 'chat' | 'artifact';

interface SurfaceProps {
  festival: Festival;
  surface: FestiveSurface;
}

/* ---------- weather ---------- */

/** How far the weather reaches down a surface before it has thinned to nothing. Two of
 *  the header's 56px tiles, so the sheet still loops without a seam. */
const WEATHER_REACH = 112;

/** The header slides one 56px tile in 14s; two tiles take 28s. Sky lanterns are slower. */
const FALL_S = 28;
const RISE_S = 52;

/** The header's falling (or rising) sheet, continued over a surface's top. Same tile,
 *  same speed, same point in the loop wherever it is drawn. */
export const FestiveWeather: React.FC<SurfaceProps> = ({ festival, surface }) => {
  const [phase] = useState(() => ({ fall: phaseNow(FALL_S), rise: phaseNow(RISE_S) }));
  const tile = WEATHER_TILES[festival];
  if (tile === null) {
    return null;
  }
  const down = tile.direction === 'down';
  const id = `fs-weather-${surface}-${festival}`;
  return (
    <div className={styles.weather} aria-hidden data-festive-weather={surface}>
      <svg
        className={down ? fd.snow : fd.rise}
        style={{
          ['--fd-tile' as string]: `${WEATHER_REACH}px`,
          top: down ? -WEATHER_REACH : 0,
          animationDuration: `${down ? FALL_S : RISE_S}s`,
          animationDelay: down ? phase.fall : phase.rise,
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

/* ---------- the floor ---------- */

/** The ground under the strip: the tint and the band, behind the pieces and out of the
 *  pointer's way. Not faded at the sides — the strip runs on into the next surface. */
const FloorBackdrop: React.FC<SurfaceProps> = ({ festival, surface }) => {
  const backdrop = GROUND_BACKDROPS[festival];
  const compact = surface === 'compact';
  return (
    <div className={compact ? styles.backdropCompact : styles.backdrop} aria-hidden data-festive-ground="backdrop">
      <div className={styles.wash} style={{ background: backdrop.wash }} />
      <svg
        className={styles.band}
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
  | 'snowman'
  | 'tree'
  | 'candyCanes'
  | 'lampPost'
  | 'cabin'
  | 'sled'
  | 'gingerbread'
  | 'pumpkin'
  | 'cat'
  | 'tombstones'
  | 'scarecrow'
  | 'cauldron'
  | 'rabbitLantern'
  | 'rabbitsCake'
  | 'teaSet'
  | 'pomelo'
  | 'envelopes'
  | 'ingots'
  | 'mandarins'
  | 'drum';

interface Drawing {
  viewBox: string;
  width: number;
  height: number;
  node: React.ReactNode;
}

/** Every piece that can stand on the floor, at its natural size. The parts that stir on
 *  hover carry a class from this stylesheet; the lights that never stop carry the
 *  header's breathe or twinkle as well. */
const PIECES: Record<PieceKind, Drawing> = {
  snowman: { viewBox: '0 -2 22 30', width: 22, height: 30, node: <SnowmanMotif hatClassName={styles.hat} /> },
  tree: {
    viewBox: '0 0 20 24',
    width: 20,
    height: 24,
    node: (
      <SmallTreeMotif twinkle={`${fd.twinkle} ${styles.light}`} twinkleLate={`${fd.twinkleLate} ${styles.light}`} />
    ),
  },
  candyCanes: { viewBox: '0 0 20 20', width: 16, height: 16, node: <CandyCanesMotif /> },
  lampPost: {
    viewBox: '0 0 14 34',
    width: 12,
    height: 30,
    node: <LampPostMotif lightClassName={`${fd.breathe} ${styles.light}`} />,
  },
  cabin: {
    viewBox: '0 -4 36 30',
    width: 36,
    height: 30,
    node: (
      <CabinMotif windowClassName={`${fd.breathe} ${styles.light}`} smokeClassName={`${fd.smoke} ${styles.smoke}`} />
    ),
  },
  sled: { viewBox: '0 0 26 14', width: 24, height: 13, node: <SledMotif /> },
  gingerbread: { viewBox: '0 0 14 18', width: 13, height: 17, node: <GingerbreadMotif /> },
  pumpkin: {
    viewBox: '0 0 44 44',
    width: 28,
    height: 28,
    node: <PumpkinMotif faceClassName={`${fd.breathe} ${styles.face}`} />,
  },
  cat: {
    viewBox: '0 0 20 20',
    width: 17,
    height: 17,
    node: <CatMotif tailClassName={styles.tail} eyesClassName={styles.eyes} />,
  },
  tombstones: {
    viewBox: '0 -8 28 24',
    width: 24,
    height: 21,
    node: <TombstonesMotif ghostClassName={styles.ghost} />,
  },
  scarecrow: { viewBox: '0 0 24 30', width: 22, height: 28, node: <ScarecrowMotif /> },
  cauldron: {
    viewBox: '0 0 24 24',
    width: 18,
    height: 18,
    node: <CauldronMotif bubblesClassName={`${fd.breathe} ${styles.bubbles}`} />,
  },
  rabbitLantern: {
    viewBox: '0 0 26 22',
    width: 26,
    height: 22,
    node: <RabbitWithLanternMotif glowClassName={`${fd.breathe} ${styles.glow}`} earsClassName={styles.ears} />,
  },
  rabbitsCake: {
    viewBox: '0 0 48 22',
    width: 44,
    height: 20,
    node: <RabbitsAndMooncakeMotif earsClassName={styles.ears} cakeClassName={styles.cake} />,
  },
  teaSet: { viewBox: '0 -4 30 18', width: 28, height: 17, node: <TeaSetMotif steamClassName={styles.steam} /> },
  pomelo: { viewBox: '0 0 16 14', width: 15, height: 13, node: <PomeloMotif /> },
  envelopes: { viewBox: '0 0 20 16', width: 20, height: 16, node: <RedEnvelopesMotif /> },
  ingots: { viewBox: '0 0 30 12', width: 30, height: 12, node: <IngotsMotif /> },
  mandarins: { viewBox: '0 0 24 12', width: 24, height: 12, node: <MandarinsMotif /> },
  drum: { viewBox: '0 0 24 18', width: 22, height: 17, node: <DrumMotif sticksClassName={styles.sticks} /> },
};

interface Placement {
  kind: PieceKind;
  /** Left edge as a fraction of the strip's width. */
  at: number;
  /** Drawn smaller than its natural size, for a piece further off. */
  scale?: number;
}

/** What stands where. Deliberately uneven spacing, and nothing repeated across two
 *  surfaces that sit side by side, so the floor reads as one street with things left
 *  along it rather than a pattern. The collapsed rail keeps the first rail piece. The
 *  thread pane's floor runs behind its composer card, so nothing stands on it: the card
 *  does. */
const LAYOUTS: Record<Festival, Record<'rail' | 'chat' | 'artifact', Placement[]>> = {
  christmas: {
    rail: [
      { kind: 'snowman', at: 0.1 },
      { kind: 'tree', at: 0.48 },
      { kind: 'tree', at: 0.8, scale: 0.75 },
    ],
    chat: [],
    artifact: [
      { kind: 'cabin', at: 0.06 },
      { kind: 'gingerbread', at: 0.36 },
      { kind: 'sled', at: 0.6 },
      { kind: 'tree', at: 0.9 },
    ],
  },
  halloween: {
    rail: [
      { kind: 'pumpkin', at: 0.1 },
      { kind: 'cat', at: 0.46 },
      { kind: 'pumpkin', at: 0.74, scale: 0.7 },
    ],
    chat: [],
    artifact: [
      { kind: 'scarecrow', at: 0.06 },
      { kind: 'cauldron', at: 0.38 },
      { kind: 'tombstones', at: 0.64 },
      { kind: 'pumpkin', at: 0.9, scale: 0.85 },
    ],
  },
  midAutumn: {
    rail: [
      { kind: 'rabbitLantern', at: 0.1 },
      { kind: 'rabbitsCake', at: 0.5 },
    ],
    chat: [],
    artifact: [
      { kind: 'rabbitLantern', at: 0.06 },
      { kind: 'teaSet', at: 0.4 },
      { kind: 'pomelo', at: 0.62 },
      { kind: 'rabbitsCake', at: 0.86 },
    ],
  },
  lunarNewYear: {
    rail: [
      { kind: 'envelopes', at: 0.08 },
      { kind: 'ingots', at: 0.4 },
      { kind: 'mandarins', at: 0.72 },
    ],
    chat: [],
    artifact: [
      { kind: 'envelopes', at: 0.06 },
      { kind: 'drum', at: 0.34 },
      { kind: 'ingots', at: 0.6 },
      { kind: 'mandarins', at: 0.88 },
    ],
  },
};

/** What a click throws off a piece, drawn over it while its turn plays: snow off the
 *  snowman and the trees, coins off the ingots, the character for luck off the red
 *  envelopes, a puff off the chimney, bubbles off the cauldron, steam off the pot, the
 *  beat off the drum. Positioned in the piece's own viewBox; the strip clips whatever
 *  flies past its edge. */
const burstFor = (kind: PieceKind): React.ReactNode => {
  switch (kind) {
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
        <g className={styles.flyUp} fill="#f2c14e" stroke="#d9a83f" strokeWidth="0.5">
          <circle cx="8" cy="4" r="1.8" style={{ ['--fly-x' as string]: '-8px' }} />
          <circle cx="15" cy="3" r="2" style={{ ['--fly-x' as string]: '0px' }} />
          <circle cx="22" cy="4" r="1.8" style={{ ['--fly-x' as string]: '8px' }} />
        </g>
      );
    case 'envelopes':
      return (
        <text className={styles.luck} x="13.5" y="-2" textAnchor="middle" fontSize="8" fontWeight="700" fill="#d8232a">
          福
        </text>
      );
    case 'cabin':
      return (
        <g className={styles.flyUp} fill="#c9c9d2">
          <circle cx="26" cy="-2" r="2.4" style={{ ['--fly-x' as string]: '-3px' }} />
          <circle cx="27" cy="-4" r="1.8" style={{ ['--fly-x' as string]: '4px' }} />
        </g>
      );
    case 'cauldron':
      return (
        <g className={styles.flyUp} fill="#7ed957">
          <circle cx="7" cy="5" r="1.6" style={{ ['--fly-x' as string]: '-5px' }} />
          <circle cx="12" cy="3" r="2" style={{ ['--fly-x' as string]: '0px' }} />
          <circle cx="17" cy="5" r="1.4" style={{ ['--fly-x' as string]: '5px' }} />
        </g>
      );
    case 'teaSet':
      return (
        <g className={styles.flyUp} fill="none" stroke="#c9c9d2" strokeWidth="0.9" strokeLinecap="round">
          <path d="M7 1q1-2 0-4" style={{ ['--fly-x' as string]: '-2px' }} />
          <path d="M10 2q1-2 0-4" style={{ ['--fly-x' as string]: '0px' }} />
          <path d="M13 1q1-2 0-4" style={{ ['--fly-x' as string]: '2px' }} />
        </g>
      );
    case 'drum':
      return (
        <g className={styles.rings} fill="none" stroke="#d9a83f" strokeWidth="0.8">
          <path d="M-1 3q-2-4 0-8" />
          <path d="M25 3q2-4 0-8" />
        </g>
      );
    default:
      return null;
  }
};

/* ---------- the walker ---------- */

interface Walker {
  width: number;
  height: number;
  viewBox: string;
  node: React.ReactNode;
}

/** One loop of the crossing: 70% walking the window's width, the rest waiting out of
 *  sight. The same number on every surface, or the copies drift apart. */
const WALK_LOOP_S = 80;

/** The legs and the bob run on their own short loops; their phase is read off the
 *  clock too, so a leg mid-swing on the rail is mid-swing on the pane it steps into.
 *  7.2s is a whole number of every one of them (0.5, 0.8, 0.9). */
const BEAT_LOOP_S = 7.2;

const WALKERS: Record<Festival, Walker> = {
  christmas: {
    width: 30,
    height: 24,
    viewBox: '0 0 34 24',
    node: <ReindeerWalker legA={styles.legA} legB={styles.legB} bob={styles.walkBob} />,
  },
  halloween: {
    width: 28,
    height: 16,
    viewBox: '0 0 28 16',
    node: <CatWalker legA={styles.legA} legB={styles.legB} bob={styles.walkBob} />,
  },
  midAutumn: {
    width: 22,
    height: 16,
    viewBox: '0 0 22 16',
    node: <RabbitWalker bob={styles.hopBob} />,
  },
  lunarNewYear: {
    width: 40,
    height: 26,
    viewBox: '0 0 40 26',
    node: <LionWalker legA={styles.legA} legB={styles.legB} bob={styles.nod} />,
  },
};

const FLOOR_CLASS: Record<FestiveSurface, string> = {
  rail: styles.floorRail,
  compact: styles.floorCompact,
  chat: styles.floorChat,
  artifact: styles.floorArtifact,
};

/** The strip of ground at a surface's foot. Still until touched: the pointer over the
 *  strip stirs the pieces once (their parts' hover rules), a click on one plays its
 *  turn — set by `data-poked`, cleared when the piece's own animation ends. Only the
 *  piece's own `animationend` counts: the lights and glows inside it never end, and the
 *  burst overlay ends on its own schedule. */
export const FestiveFloor: React.FC<SurfaceProps> = ({ festival, surface }) => {
  const [poked, setPoked] = useState<number | null>(null);
  // Read once: a delay that moved with every render would move the walker with it.
  const [phase] = useState(() => ({ walk: phaseNow(WALK_LOOP_S), beat: phaseNow(BEAT_LOOP_S) }));

  const compact = surface === 'compact';
  const placements = compact ? LAYOUTS[festival].rail.slice(0, 1) : LAYOUTS[festival][surface];
  const walker = WALKERS[festival];

  return (
    <div className={`${styles.floor} ${FLOOR_CLASS[surface]}`} aria-hidden data-festive-floor={surface}>
      <FloorBackdrop festival={festival} surface={surface} />
      {/* Fixed to the window, not to this strip, and clipped to the strip: every surface
          draws the same walker at the same place, and shows only its own stretch. */}
      <div
        className={styles.walkTrack}
        data-festive-walker={festival}
        style={{
          ['--fd-cross-w' as string]: `${walker.width}px`,
          ['--fd-beat' as string]: phase.beat,
          animationDuration: `${WALK_LOOP_S}s`,
          animationDelay: phase.walk,
        }}
      >
        <svg className={styles.walker} viewBox={walker.viewBox} width={walker.width} height={walker.height}>
          {walker.node}
        </svg>
      </div>
      {placements.map(({ kind, at, scale = 1 }, i) => {
        const piece = PIECES[kind];
        const width = Math.round(piece.width * scale);
        const height = Math.round(piece.height * scale);
        return (
          <svg
            key={`${kind}-${at}`}
            className={`${styles.piece} ${styles[kind]}`}
            data-piece={kind}
            data-poked={poked === i ? 'true' : undefined}
            style={compact ? { left: `calc(50% - ${width / 2}px)` } : { left: `${at * 100}%` }}
            viewBox={piece.viewBox}
            width={width}
            height={height}
            onClick={() => setPoked(i)}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) {
                setPoked(null);
              }
            }}
          >
            {piece.node}
            {poked === i && burstFor(kind)}
          </svg>
        );
      })}
    </div>
  );
};
