import React from 'react';

import {
  CatMotif,
  GROUND_BACKDROPS,
  IngotsMotif,
  MandarinsMotif,
  PumpkinMotif,
  RabbitsAndMooncakeMotif,
  RabbitWithLanternMotif,
  RedEnvelopesMotif,
  SmallTreeMotif,
  SnowmanMotif,
} from '@/components/layouts/festiveMotifs';
import { useFestival } from '@/hooks/useFestival';
import type { Festival } from '@/utils/festival';

import styles from './ThreadEmptyFestive.module.css';
import fd from '@/components/layouts/FestiveDecoration.module.css';

/** A slip of the festival's ground under the empty thread's heading (CONTEXT.md, 節慶裝飾).
 *
 *  The fourth place the app dresses up, and chosen for what it is not: an empty screen is
 *  already blank by design, it carries no data to compete with, and it is seen for a few
 *  seconds at the start of a conversation rather than all day. The header's band and the
 *  rail's floor are always there; this one comes and goes.
 *
 *  Quieter than the rail's floor on purpose: no walker crossing it, nothing falling on it,
 *  and it does not answer the pointer. Only the lights the pieces carry inside themselves
 *  move — a lantern's glow, a tree's baubles — which they do wherever they stand. */

interface Standing {
  /** Left edge as a fraction of the scene's width. */
  at: number;
  viewBox: string;
  width: number;
  height: number;
  node: React.ReactNode;
}

/** Two or three of the header's near pieces, spread across the strip rather than lined up
 *  in the middle: a row of evenly spaced ornaments reads as a border, a scattered few as
 *  a place. */
const SCENES: Record<Festival, Standing[]> = {
  christmas: [
    {
      at: 0.16,
      viewBox: '0 -2 22 30',
      width: 26,
      height: 34,
      node: <SnowmanMotif />,
    },
    {
      at: 0.68,
      viewBox: '0 0 20 24',
      width: 23,
      height: 28,
      node: <SmallTreeMotif twinkle={fd.twinkle} twinkleLate={fd.twinkleLate} />,
    },
  ],
  halloween: [
    {
      at: 0.14,
      viewBox: '0 0 44 44',
      width: 30,
      height: 30,
      node: <PumpkinMotif faceClassName={fd.breathe} />,
    },
    {
      at: 0.7,
      viewBox: '0 0 20 20',
      width: 20,
      height: 20,
      node: <CatMotif />,
    },
  ],
  midAutumn: [
    {
      at: 0.1,
      viewBox: '0 0 26 22',
      width: 30,
      height: 25,
      node: <RabbitWithLanternMotif glowClassName={fd.breathe} />,
    },
    {
      at: 0.6,
      viewBox: '0 0 48 22',
      width: 50,
      height: 23,
      node: <RabbitsAndMooncakeMotif />,
    },
  ],
  lunarNewYear: [
    { at: 0.12, viewBox: '0 0 20 16', width: 24, height: 19, node: <RedEnvelopesMotif /> },
    { at: 0.44, viewBox: '0 0 30 12', width: 34, height: 14, node: <IngotsMotif /> },
    { at: 0.74, viewBox: '0 0 24 12', width: 27, height: 14, node: <MandarinsMotif /> },
  ],
};

/** The scene, or nothing at all when the calendar or the switch says so. Decoration only:
 *  `aria-hidden`, out of the tab order, nothing depends on it. */
const ThreadEmptyFestive: React.FC = () => {
  const festival = useFestival();

  if (festival === null) {
    return null;
  }

  const backdrop = GROUND_BACKDROPS[festival];

  return (
    <div className={styles.scene} aria-hidden data-festive-empty={festival}>
      <div className={styles.backdrop}>
        <div className={styles.wash} style={{ background: backdrop.wash }} />
        <svg className={styles.floor} viewBox="0 0 240 40" preserveAspectRatio="none" aria-hidden>
          {backdrop.band}
        </svg>
      </div>
      {SCENES[festival].map((piece) => (
        <svg
          key={piece.at}
          className={styles.piece}
          style={{ left: `${piece.at * 100}%` }}
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

export default ThreadEmptyFestive;
