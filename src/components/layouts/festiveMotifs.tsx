import React from 'react';

import type { Festival } from '@/utils/festival';

/** The festive drawings the session rail borrows from the header's scenes, as bare SVG
 *  groups: the same paths as in `FestiveDecoration`, so what hangs on the rail's line
 *  and stands on its floor is recognisably the same lantern, flag, snowman or rabbit —
 *  an echo, not a second set of decorations. The header keeps its own inline copies:
 *  its scenes place each piece by hand and were not worth rewriting for this.
 *
 *  Hung things are drawn from their hook at (0, 0) downward; standing things from their
 *  top-left corner, at the size named on each. Every group takes a `transform` so the
 *  caller can place and scale it. */

const INK = 'var(--erd-color-text, rgba(0, 0, 0, 0.88))';

type MotifProps = { transform?: string; className?: string; style?: React.CSSProperties };

/* ---------- hung from the string ---------- */

/** Mid-Autumn's paper lantern: 20 wide, 30 tall, hook at the top centre. */
export const StrungLanternMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <path d="M0 0v3" stroke="#c9a04a" strokeWidth="1" />
    <rect x="-3.5" y="3" width="7" height="2.2" rx="1" fill="#d9b25c" />
    <ellipse cx="0" cy="11.5" rx="6.5" ry="7.5" fill="#e0454f" />
    <ellipse cx="0" cy="11.5" rx="2.6" ry="7.5" fill="#ee6a72" opacity="0.7" />
    <rect x="-3.5" y="18" width="7" height="2.2" rx="1" fill="#d9b25c" />
    <path d="M-1 20.2v4M1 20.2v5" stroke="#d9b25c" strokeWidth="0.9" strokeLinecap="round" />
  </g>
);

/** Mid-Autumn's small red knot between the lanterns: 8 wide, 14 tall. */
export const KnotMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <path d="M0 0v2" stroke="#c9a04a" strokeWidth="0.8" />
    <path d="M0 2l3 3-3 3-3-3z" fill="#e0454f" />
    <path d="M0 4.5l1.5 1.5L0 7.5 -1.5 6z" fill="#f08a8e" />
    <path d="M-1.2 8v5M1.2 8v5" stroke="#e0454f" strokeWidth="0.9" strokeLinecap="round" />
  </g>
);

/** Halloween's bunting flag: 11 wide, 11 tall, in the colour given. */
export const FlagMotif: React.FC<MotifProps & { color: string }> = ({ color, ...props }) => (
  <g {...props}>
    <path d="M-5.5 0h11L0 11z" fill={color} opacity="0.9" />
  </g>
);

/** Halloween's little bat hanging upside down: 10 wide, 12 tall. */
export const HangingBatMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <path d="M0 0v3" stroke={INK} strokeWidth="0.6" opacity="0.5" />
    <path d="M-1.5 3h3l.5 5-2 3-2-3z" fill={INK} opacity="0.7" />
    <path d="M-1.5 4l-3 3 2 1zM1.5 4l3 3-2 1z" fill={INK} opacity="0.7" />
  </g>
);

/** Christmas's fairy-light bulb: 12 wide, 12 tall, in the colour given. */
export const BulbMotif: React.FC<MotifProps & { color: string }> = ({ color, ...props }) => (
  <g {...props}>
    <path d="M0 0v2" stroke="#8a8a96" strokeWidth="0.8" />
    <circle cx="0" cy="6" r="5" fill={color} opacity="0.3" />
    <circle cx="0" cy="6" r="2.4" fill={color} />
  </g>
);

/** Christmas's golden bell: 10 wide, 14 tall. */
export const BellMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <path d="M0 0v2" stroke="#8a8a96" strokeWidth="0.8" />
    <path d="M-1.5 3h3l1 2M-1.5 3v5" fill="none" stroke="#e5484d" strokeWidth="1" />
    <path d="M-4 11q0-6 4-7 4 1 4 7z" fill="#f2c14e" />
    <rect x="-4.5" y="11" width="9" height="1.4" rx="0.7" fill="#d9a83f" />
    <circle cx="0" cy="13" r="1" fill="#d9a83f" />
  </g>
);

/** Lunar New Year's round red lantern: 20 wide, 30 tall. */
export const RedLanternMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <path d="M0 0v3" stroke="#d9a83f" strokeWidth="1" />
    <rect x="-3.5" y="3" width="7" height="2" rx="1" fill="#f2c14e" />
    <ellipse cx="0" cy="12" rx="7.5" ry="7" fill="#d8232a" />
    <ellipse cx="0" cy="12" rx="3" ry="7" fill="#f04a4f" opacity="0.7" />
    <path d="M-5.5 12h11" stroke="#b0161c" strokeWidth="0.6" opacity="0.6" />
    <rect x="-3.5" y="18" width="7" height="2" rx="1" fill="#f2c14e" />
    <path d="M-1.2 20v5M0 20v6M1.2 20v5" stroke="#f2c14e" strokeWidth="0.8" strokeLinecap="round" />
  </g>
);

/** Lunar New Year's gold tassel: 8 wide, 14 tall. */
export const TasselMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <path d="M0 0v3" stroke="#d9a83f" strokeWidth="0.8" />
    <path d="M-2 3h4l-1 3h-2z" fill="#d8232a" />
    <path d="M-1.5 6v7M0 6v8M1.5 6v7" stroke="#f2c14e" strokeWidth="0.8" strokeLinecap="round" />
  </g>
);

/* ---------- standing on the floor ---------- */

/** Mid-Autumn's rabbit out with its lantern: 26 × 22. The lantern's glow takes
 *  `glowClassName` so it can breathe; the ears `earsClassName` so they can perk. */
export const RabbitWithLanternMotif: React.FC<MotifProps & { glowClassName?: string; earsClassName?: string }> = ({
  glowClassName,
  earsClassName,
  ...props
}) => (
  <g {...props}>
    <g fill={INK} opacity="0.62">
      <path className={earsClassName} d="M9 10C7 6 7 2 9 0c1.5 0 2.5 4 2.5 9zM18 10c2-4 2-8 0-10-1.5 0-2.5 4-2.5 9z" />
      <ellipse cx="13.5" cy="15" rx="7.5" ry="6.5" />
      <path d="M20 12l4-4" stroke={INK} strokeWidth="1" strokeLinecap="round" />
    </g>
    <circle cx="11" cy="14" r="0.9" fill="#fff" />
    <circle cx="16" cy="14" r="0.9" fill="#fff" />
    <path d="M24 8v2" stroke="#c9a04a" strokeWidth="0.8" />
    <ellipse cx="24" cy="13" rx="2.6" ry="3" fill="#e0454f" />
    <ellipse cx="24" cy="13" rx="3.6" ry="4" fill="#f6b26b" opacity="0.3" className={glowClassName} />
  </g>
);

/** Mid-Autumn's two rabbits with the mooncake between them: 48 × 22. Both pairs of ears
 *  take `earsClassName`, the cake `cakeClassName`. */
export const RabbitsAndMooncakeMotif: React.FC<MotifProps & { earsClassName?: string; cakeClassName?: string }> = ({
  earsClassName,
  cakeClassName,
  ...props
}) => (
  <g {...props}>
    <g fill={INK} opacity="0.62">
      <path className={earsClassName} d="M6 10C4 6 4 2 6 0c1.5 0 2.5 4 2.5 9zM15 10c2-4 2-8 0-10-1.5 0-2.5 4-2.5 9z" />
      <ellipse cx="10.5" cy="15" rx="8" ry="6.5" />
      <path
        className={earsClassName}
        d="M36 12c-1.6-3-1.6-6 0-8 1.2 0 2 3.2 2 7.2zM43 12c1.6-3 1.6-6 0-8-1.2 0-2 3.2-2 7.2z"
      />
      <ellipse cx="39.5" cy="16.5" rx="6.5" ry="5" />
    </g>
    <circle cx="8" cy="14" r="0.9" fill="#fff" />
    <circle cx="13" cy="14" r="0.9" fill="#fff" />
    <circle cx="37.5" cy="16" r="0.8" fill="#fff" />
    <circle cx="41.5" cy="16" r="0.8" fill="#fff" />
    <g className={cakeClassName}>
      <ellipse cx="25" cy="18" rx="6" ry="3.6" fill="#c98a3c" />
      <ellipse cx="25" cy="16.6" rx="6" ry="3.4" fill="#e0a752" />
      <ellipse cx="25" cy="16.6" rx="3.6" ry="2" fill="none" stroke="#b8752e" strokeWidth="0.7" />
      <path d="M25 14.8v3.6M23 16.6h4" stroke="#b8752e" strokeWidth="0.6" />
    </g>
  </g>
);

/** Halloween's jack-o'-lantern: 44 × 44. Its face takes `faceClassName` to breathe. */
export const PumpkinMotif: React.FC<MotifProps & { faceClassName?: string }> = ({ faceClassName, ...props }) => (
  <g {...props}>
    <path d="M20 6c1-2.5 3.5-3 5.5-1.5L25 13h-5z" fill="#5f8f3e" />
    <ellipse cx="22" cy="28" rx="20" ry="15" fill="#ef8a2c" />
    <g fill="none" stroke="#c9691c" strokeWidth="1.4" opacity="0.45">
      <ellipse cx="11" cy="28" rx="7" ry="14.5" />
      <ellipse cx="33" cy="28" rx="7" ry="14.5" />
    </g>
    <g className={faceClassName} fill="#fff0b8">
      <path d="M11 24l6 6H6z" />
      <path d="M33 24l6 6h-12z" />
      <path d="M9 33q13 10 26 0l-3 3.5h-3.5l-2 2.5-2-2.5h-5l-2 2.5-2-2.5H12z" />
    </g>
  </g>
);

/** Halloween's black cat, sitting: 20 × 20. The tail takes `tailClassName` so it can
 *  flick, the eyes `eyesClassName` so they can blink. */
export const CatMotif: React.FC<MotifProps & { tailClassName?: string; eyesClassName?: string }> = ({
  tailClassName,
  eyesClassName,
  ...props
}) => (
  <g {...props}>
    <path d="M4 20v-8a5 5 0 0 1 4-5V4l2 2 2-2v3a5 5 0 0 1 4 5v8z" fill="#1f1f26" />
    <path
      className={tailClassName}
      d="M16 18q4-2 2-8"
      fill="none"
      stroke="#1f1f26"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <g className={eyesClassName}>
      <circle cx="8.3" cy="9.5" r="0.9" fill="#8fe388" />
      <circle cx="11.7" cy="9.5" r="0.9" fill="#8fe388" />
    </g>
  </g>
);

/** Christmas's snowman: 22 × 28 (the hat pokes 2 above the top). The hat takes
 *  `hatClassName` so it can tip. */
export const SnowmanMotif: React.FC<MotifProps & { hatClassName?: string }> = ({ hatClassName, ...props }) => (
  <g {...props}>
    <circle cx="11" cy="20" r="7.5" fill="#fff" stroke="#d6dbe6" strokeWidth="0.8" />
    <circle cx="11" cy="9" r="5.5" fill="#fff" stroke="#d6dbe6" strokeWidth="0.8" />
    <g className={hatClassName}>
      <rect x="6" y="1" width="10" height="2" rx="0.6" fill="#2b2b33" />
      <rect x="7.5" y="-2" width="7" height="4" fill="#2b2b33" />
    </g>
    <circle cx="9" cy="8" r="0.8" fill="#2b2b33" />
    <circle cx="13" cy="8" r="0.8" fill="#2b2b33" />
    <path d="M11 9.5l4 1-4 1z" fill="#f28c28" />
    <path d="M6 13.5q5 2.5 10 0l1 2q-6 3-12 0z" fill="#e5484d" />
    <circle cx="11" cy="18" r="0.8" fill="#2b2b33" />
    <circle cx="11" cy="21.5" r="0.8" fill="#2b2b33" />
    <path d="M4 17l-4-3M18 17l4-3" stroke="#7a4e2a" strokeWidth="1" strokeLinecap="round" />
  </g>
);

/** Christmas's small tree with three baubles: 20 × 24. The baubles take the two
 *  twinkle phases. */
export const SmallTreeMotif: React.FC<MotifProps & { twinkle?: string; twinkleLate?: string }> = ({
  twinkle,
  twinkleLate,
  ...props
}) => (
  <g {...props}>
    <path d="M10 1l5 7H5z" fill="#3f9a63" />
    <path d="M10 6l6 8H4z" fill="#358a57" />
    <path d="M10 12l8 9H2z" fill="#2c7a4b" />
    <rect x="8.5" y="21" width="3" height="3" fill="#7a4e2a" />
    <circle className={twinkleLate} cx="8" cy="10" r="1" fill="#ff6b6b" />
    <circle className={twinkle} cx="12" cy="15" r="1" fill="#f5d777" />
    <circle className={twinkleLate} cx="7" cy="18" r="1" fill="#6fb3ff" />
  </g>
);

/** Lunar New Year's gold ingots: 30 × 12. */
export const IngotsMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <path d="M1 8q1-5 6-6 4 4 8 0 5 1 6 6-2 3-10 3T1 8z" fill="#f2c14e" />
    <path d="M3 7q2-3 5-3 3 3 6 0 3 0 5 3" fill="none" stroke="#d9a83f" strokeWidth="0.8" />
    <path d="M15 9q1-4 5-5 3 3 6 0 4 1 5 5-2 2-8 2t-8-2z" fill="#f5d777" />
  </g>
);

/** Lunar New Year's pair of mandarins: 24 × 12. */
export const MandarinsMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <circle cx="6" cy="7" r="5" fill="#f28c28" />
    <circle cx="17" cy="7.5" r="4.5" fill="#f5a03c" />
    <path d="M6 2l-1-1M17 3l-1-1" stroke="#7a4e2a" strokeWidth="0.8" strokeLinecap="round" />
    <path d="M6 2q3-2 5 0-2 2-5 0zM17 3q3-2 5 0-2 2-5 0z" fill="#5f8f3e" />
  </g>
);

/** Lunar New Year's red envelopes leaning on each other: 20 × 16. */
export const RedEnvelopesMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <rect x="2" y="3" width="9" height="13" rx="1" fill="#c81e25" transform="rotate(-8 6.5 9.5)" />
    <rect x="9" y="1" width="9" height="15" rx="1" fill="#d8232a" />
    <rect x="9" y="1" width="9" height="4" rx="1" fill="#f04a4f" />
    <circle cx="13.5" cy="9.5" r="2" fill="none" stroke="#f2c14e" strokeWidth="0.8" />
    <circle cx="13.5" cy="9.5" r="0.7" fill="#f2c14e" />
  </g>
);

/** Christmas's lamppost with its warm light: 14 × 34. The light takes `lightClassName`
 *  so it can breathe, brighten and flicker. */
export const LampPostMotif: React.FC<MotifProps & { lightClassName?: string }> = ({ lightClassName, ...props }) => (
  <g {...props}>
    <path d="M7 34V9" stroke="#2b2b33" strokeWidth="1.6" />
    <path d="M3 34h8" stroke="#2b2b33" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 9h8l-1-6H4z" fill="#2b2b33" />
    <g className={lightClassName}>
      <rect x="4.5" y="4" width="5" height="4.5" fill="#ffcf5c" />
      <circle cx="7" cy="7" r="6" fill="#ffcf5c" opacity="0.18" />
    </g>
    <path d="M2 3h10" stroke="#2b2b33" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M2 3q5-2 10 0" fill="#fff" />
  </g>
);

/** Christmas's gingerbread man: 14 × 18. */
export const GingerbreadMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <circle cx="7" cy="4" r="3.5" fill="#b9702f" />
    <path d="M5 7h4l3 3-1 2-2-1v7H5v-7l-2 1-1-2z" fill="#b9702f" />
    <circle cx="5.8" cy="3.5" r="0.6" fill="#2b2b33" />
    <circle cx="8.2" cy="3.5" r="0.6" fill="#2b2b33" />
    <path d="M5.5 5.5q1.5 1.2 3 0" fill="none" stroke="#2b2b33" strokeWidth="0.6" />
    <circle cx="7" cy="9.5" r="0.7" fill="#fff" />
    <circle cx="7" cy="12" r="0.7" fill="#fff" />
    <path d="M4 7.5q-1 .8-1.6 1.6M10 7.5q1 .8 1.6 1.6" stroke="#fff" strokeWidth="0.6" />
  </g>
);

/** Christmas's sled with a gift on it: 26 × 14. */
export const SledMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <path d="M2 12q1 2 3 2h18q2 0 3-2" fill="none" stroke="#7a4e2a" strokeWidth="1.4" strokeLinecap="round" />
    <rect x="5" y="8" width="17" height="3" rx="1" fill="#a86b3a" />
    <path d="M6 8V6M21 8V6" stroke="#a86b3a" strokeWidth="1.2" />
    <rect x="9" y="1" width="8" height="7" rx="1" fill="#3f9a63" />
    <rect x="12.5" y="1" width="1.6" height="7" fill="#f5d777" />
    <rect x="9" y="3.8" width="8" height="1.6" fill="#f5d777" />
  </g>
);

/** Christmas's two candy canes stuck in the snow: 20 × 20. */
export const CandyCanesMotif: React.FC<MotifProps> = (props) => (
  <g {...props} fill="none" strokeLinecap="round">
    <path d="M4 20V8a3.5 3.5 0 0 1 7 0" stroke="#e5e5ec" strokeWidth="3.4" />
    <path d="M4 20V8a3.5 3.5 0 0 1 7 0" stroke="#fff" strokeWidth="2.8" />
    <path d="M4 20V8a3.5 3.5 0 0 1 7 0" stroke="#e5484d" strokeWidth="2.8" strokeDasharray="2.2 2.2" />
    <path d="M12 20v-8a3 3 0 0 1 6 0" stroke="#e5e5ec" strokeWidth="3" />
    <path d="M12 20v-8a3 3 0 0 1 6 0" stroke="#fff" strokeWidth="2.4" />
    <path d="M12 20v-8a3 3 0 0 1 6 0" stroke="#e5484d" strokeWidth="2.4" strokeDasharray="2 2" />
  </g>
);

/** Christmas's cabin, window lit and chimney going: 36 × 26 (the smoke rises 4 above).
 *  The window takes `windowClassName` to breathe; each puff of smoke takes
 *  `smokeClassName` with its own delay. */
export const CabinMotif: React.FC<MotifProps & { windowClassName?: string; smokeClassName?: string }> = ({
  windowClassName,
  smokeClassName,
  ...props
}) => (
  <g {...props}>
    <rect x="5" y="10" width="26" height="16" fill="#7a4e2a" />
    <path d="M2 11l16-9 16 9z" fill="#fff" stroke="#d6dbe6" strokeWidth="0.8" />
    <rect x="24" y="1" width="4" height="7" fill="#5a3a20" />
    {[0, 1.2, 2.4].map((delay) => (
      <circle
        key={delay}
        className={smokeClassName}
        style={{ animationDelay: `${delay}s` }}
        cx="26"
        cy="0"
        r="2"
        fill="#c9c9d2"
      />
    ))}
    <rect x="8" y="14" width="7" height="12" fill="#5a3a20" />
    <g className={windowClassName}>
      <rect x="19" y="14" width="8" height="7" fill="#ffcf5c" />
      <rect x="19" y="14" width="8" height="7" fill="none" stroke="#5a3a20" strokeWidth="0.8" />
      <path d="M23 14v7M19 17.5h8" stroke="#5a3a20" strokeWidth="0.8" />
    </g>
    <rect x="4" y="9" width="28" height="2" fill="#fff" />
    <circle cx="11.5" cy="17" r="2.6" fill="none" stroke="#3f9a63" strokeWidth="1.6" />
    <circle cx="11.5" cy="14.6" r="0.7" fill="#e5484d" />
    <circle cx="9.3" cy="18.5" r="0.6" fill="#e5484d" />
    <circle cx="13.7" cy="18.5" r="0.6" fill="#e5484d" />
  </g>
);

/** Halloween's scarecrow: 24 × 30. */
export const ScarecrowMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <path d="M12 30V8M4 12h16" stroke="#7a4e2a" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M6 12l-1 9h14l-1-9z" fill="#8a6b3f" />
    <path d="M5 14h14" stroke="#e5484d" strokeWidth="1.2" />
    <circle cx="12" cy="7" r="4.5" fill="#e8c27a" />
    <path d="M6 4l6-3 6 3-1 1H7z" fill="#5a3a20" />
    <circle cx="10.5" cy="7" r="0.7" fill="#2b2b33" />
    <circle cx="13.5" cy="7" r="0.7" fill="#2b2b33" />
    <path d="M3 19l-2 4M21 19l2 4" stroke="#c9a04a" strokeWidth="1" strokeLinecap="round" />
  </g>
);

/** Halloween's two tombstones with a leaning cross: 28 × 16, with a small ghost behind
 *  the taller stone that takes `ghostClassName` — it sits hidden below the stone's top
 *  until something makes it look up. */
export const TombstonesMotif: React.FC<MotifProps & { ghostClassName?: string }> = ({ ghostClassName, ...props }) => (
  <g {...props}>
    <g className={ghostClassName}>
      <path
        d="M3.5 9V4.5a3.5 3.5 0 0 1 7 0V9c-.6-.7-1.2-.7-1.75 0-.6-.7-1.2-.7-1.75 0-.6-.7-1.2-.7-1.75 0-.6-.7-1.2-.7-1.75 0z"
        fill="#f2f2f7"
        opacity="0.9"
      />
      <circle cx="5.7" cy="4.5" r="0.6" fill="#3b3b46" />
      <circle cx="8.3" cy="4.5" r="0.6" fill="#3b3b46" />
    </g>
    <path d="M2 16v-8a5 5 0 0 1 10 0v8z" fill={INK} opacity="0.55" />
    <path d="M5 9h4M7 7v6" stroke="#f2f2f7" strokeWidth="0.8" opacity="0.7" />
    <path d="M16 16v-6a4 4 0 0 1 8 0v6z" fill={INK} opacity="0.5" />
    <path d="M26 16l-1.5-11M22 8l6-1" stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
  </g>
);

/** Halloween's cauldron: 24 × 24. The bubbles over it take `bubblesClassName`. */
export const CauldronMotif: React.FC<MotifProps & { bubblesClassName?: string }> = ({ bubblesClassName, ...props }) => (
  <g {...props}>
    <g className={bubblesClassName} fill="#7ed957">
      <circle cx="8" cy="6" r="1.6" opacity="0.8" />
      <circle cx="14" cy="3" r="1.1" opacity="0.6" />
      <circle cx="17" cy="7" r="1.3" opacity="0.7" />
    </g>
    <ellipse cx="12" cy="10" rx="9" ry="2.4" fill="#5fb84a" />
    <path d="M3 10q9 4 18 0v4a9 8 0 0 1-18 0z" fill="#2b2b33" />
    <path d="M3 10q9 4 18 0" fill="none" stroke="#3d3d48" strokeWidth="1" />
    <path d="M6 22h3M15 22h3" stroke="#2b2b33" strokeWidth="2" strokeLinecap="round" />
  </g>
);

/** Mid-Autumn's tea for the moon-watching, a pot and two cups: 30 × 14. The steam over
 *  the pot takes `steamClassName`; it is invisible until something warms it. */
export const TeaSetMotif: React.FC<MotifProps & { steamClassName?: string }> = ({ steamClassName, ...props }) => (
  <g {...props}>
    <g className={steamClassName} fill="none" stroke="#c9c9d2" strokeWidth="0.8" strokeLinecap="round" opacity="0">
      <path d="M8 2q1-1.5 0-3M11 2.5q1-1.5 0-3" />
    </g>
    <path d="M4 13a6 6 0 0 1 12 0z" fill="#8c6b4a" />
    <ellipse cx="10" cy="7.5" rx="6" ry="1.6" fill="#a58462" />
    <rect x="9" y="4" width="2" height="3" fill="#8c6b4a" />
    <path d="M16 8q4-2 3 3" fill="none" stroke="#8c6b4a" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M4 9q-3-1-1 3" fill="none" stroke="#8c6b4a" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M21 13a2.5 2.5 0 0 1 5 0zM19.5 10h8" fill="#c9c9d2" stroke="#c9c9d2" strokeWidth="0.8" />
    <path d="M21 10.5a2.5 2.5 0 0 1 5 0z" fill="#d6d6dc" />
  </g>
);

/** Mid-Autumn's pomelo: 16 × 14. */
export const PomeloMotif: React.FC<MotifProps> = (props) => (
  <g {...props}>
    <ellipse cx="8" cy="8.5" rx="6.5" ry="5.5" fill="#cddc6a" />
    <ellipse cx="6" cy="6.5" rx="2" ry="1.4" fill="#e3ec9a" opacity="0.7" />
    <path d="M8 3q3-3 6-1-3 1-6 1z" fill="#3f9a63" />
  </g>
);

/** Lunar New Year's drum, red with gold studs, and its sticks: 24 × 18. The sticks take
 *  `sticksClassName` so they can beat. */
export const DrumMotif: React.FC<MotifProps & { sticksClassName?: string }> = ({ sticksClassName, ...props }) => (
  <g {...props}>
    <path d="M3 6h18v8q-9 3-18 0z" fill="#d8232a" />
    <ellipse cx="12" cy="6" rx="9" ry="3" fill="#f5e6c8" stroke="#d9a83f" strokeWidth="0.8" />
    <g fill="#f2c14e">
      <circle cx="5" cy="9" r="0.7" />
      <circle cx="8" cy="10" r="0.7" />
      <circle cx="12" cy="10.5" r="0.7" />
      <circle cx="16" cy="10" r="0.7" />
      <circle cx="19" cy="9" r="0.7" />
    </g>
    <path className={sticksClassName} d="M6 5l-4-4M18 5l4-4" stroke="#7a4e2a" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M4 18v-3M20 18v-3" stroke="#7a4e2a" strokeWidth="1.4" />
  </g>
);

/* ---------- what walks the floor ---------- */

/** The floor's walkers, one a festival, drawn side-on and facing right: the legs are in
 *  two groups (`legA`, `legB`) that the caller swings against each other, and what nods
 *  or bobs takes `bob`. Sizes: reindeer 30 × 24, cat 26 × 16, rabbit 22 × 16, lion 36 × 26. */
interface WalkerProps {
  legA?: string;
  legB?: string;
  bob?: string;
}

/** Christmas's reindeer, the header's on the ridge but walking: the same antlers and
 *  red nose. */
export const ReindeerWalker: React.FC<WalkerProps> = ({ legA, legB, bob }) => (
  <g>
    <g fill="#6b4a2e">
      <path className={legA} d="M8 14l-1 10h2l1-10zM19 14l-1 10h2l1-10z" />
      <path className={legB} d="M12 14l-1 10h2l1-10zM23 14l-1 10h2l1-10z" />
    </g>
    <g className={bob}>
      <path d="M6 15q0-6 6-6h10q4 0 5-3l2 1-1 4q0 5-4 5H10q-4 0-4-1z" fill="#8a6240" />
      <path d="M25 6l-2-5 1.5-.5 2 4.5zM27.5 6l1.5-5 1.5.5-1.5 4.5z" fill="#6b4a2e" />
      <circle cx="29.5" cy="8.5" r="1.3" fill="#ff5c5c" />
      <circle cx="25.5" cy="7.5" r="0.6" fill="#2b2b33" />
    </g>
  </g>
);

/** Halloween's black cat walking, tail up. */
export const CatWalker: React.FC<WalkerProps> = ({ legA, legB, bob }) => (
  <g>
    <g fill="#1f1f26">
      <path className={legA} d="M7 10l-1 6h2l1-6zM17 10l-1 6h2l1-6z" />
      <path className={legB} d="M11 10l-1 6h2l1-6zM21 10l-1 6h2l1-6z" />
    </g>
    <g className={bob}>
      <ellipse cx="14" cy="9" rx="9" ry="4" fill="#1f1f26" />
      <path d="M5 8q-5-2-3-8" fill="none" stroke="#1f1f26" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 9a4 4 0 0 1 4-4V2l2 2 2-2v3a3 3 0 0 1 0 4z" fill="#1f1f26" />
      <circle cx="23" cy="6" r="0.8" fill="#8fe388" />
      <circle cx="25.5" cy="6" r="0.8" fill="#8fe388" />
    </g>
  </g>
);

/** Mid-Autumn's rabbit, hopping along in silhouette like the ones on the floor. */
export const RabbitWalker: React.FC<WalkerProps> = ({ bob }) => (
  <g className={bob}>
    <g fill={INK} opacity="0.62">
      <ellipse cx="10" cy="11" rx="8" ry="5" />
      <circle cx="17" cy="8" r="4" />
      <path d="M15 5c-1-4 0-6 1.5-6 1 0 1.5 3 .5 6zM18.5 5c0-4 1.5-6 3-5.5 1 .5.5 3-1.5 6z" />
      <circle cx="2.5" cy="10" r="1.6" />
    </g>
    <circle cx="18.5" cy="7.5" r="0.7" fill="#fff" />
  </g>
);

/** Lunar New Year's lion dance: the head with its mane and the cloth body, two dancers'
 *  legs under it. */
export const LionWalker: React.FC<WalkerProps> = ({ legA, legB, bob }) => (
  <g>
    <g fill="#2b2b33">
      <path className={legA} d="M8 18l-1 8h2.5l1-8zM24 18l-1 8h2.5l1-8z" />
      <path className={legB} d="M13 18l-1 8h2.5l1-8zM29 18l-1 8h2.5l1-8z" />
    </g>
    <path d="M4 20q8-8 16-6 6 2 10 0v6z" fill="#d8232a" />
    <path d="M6 18q7-6 14-4" fill="none" stroke="#f2c14e" strokeWidth="1" strokeDasharray="2 2" />
    <g className={bob}>
      <path d="M22 16q-2-10 7-11 8 0 7 9l-2 3H24z" fill="#d8232a" />
      <path d="M23 8l-3-4 5 1zM28 4l1-4 2 4zM33 5l3-3-1 5z" fill="#f2c14e" />
      <path d="M24 16h12l-1 3H25z" fill="#f2c14e" />
      <circle cx="31" cy="10" r="1.8" fill="#fff" />
      <circle cx="31.4" cy="10" r="0.9" fill="#2b2b33" />
      <circle cx="36" cy="12" r="1.2" fill="#f2c14e" />
    </g>
  </g>
);

/* ---------- the ground they stand on ---------- */

export interface GroundBackdrop {
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
