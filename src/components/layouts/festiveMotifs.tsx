import React from 'react';

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
