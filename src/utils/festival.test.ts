import { describe, expect, it } from 'vitest';

import { FESTIVAL_PREVIEW_STORAGE_KEY } from '@/constants/storage';
import {
  activeFestival,
  currentFestival,
  festivalDate,
  LAST_LUNAR_NEW_YEAR_YEAR,
  LAST_MID_AUTUMN_YEAR,
  LUNAR_NEW_YEAR_DATES,
  MID_AUTUMN_DATES,
  readFestivalPreview,
} from './festival';

const at = (iso: string, hour = 12) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, hour);
};

describe('activeFestival', () => {
  /** Fourteen days of run-up, the day itself, and the day after — inclusive at both
   *  ends, and judged on the calendar day, not on hours elapsed. */
  it.each([
    ['the first day of the run-up', '2026-12-11', 'christmas'],
    ['the day itself', '2026-12-25', 'christmas'],
    ['the day after', '2026-12-26', 'christmas'],
    ['the run-up to Halloween', '2026-10-17', 'halloween'],
    ['Mid-Autumn from the table', '2026-09-25', 'midAutumn'],
    ['a Mid-Autumn run-up in a later year', '2028-09-19', 'midAutumn'],
    ['Lunar New Year from the table', '2026-02-17', 'lunarNewYear'],
    ['a Lunar New Year run-up that starts in the old year', '2028-01-13', 'lunarNewYear'],
  ])('is on for %s', (_when, day, festival) => {
    expect(activeFestival(at(day))).toBe(festival);
  });

  it.each([
    ['the day before the run-up', '2026-12-10'],
    ['two days after', '2026-12-27'],
    ['an ordinary day', '2026-03-03'],
    ['the day before the Halloween run-up', '2026-10-16'],
    ['the day before the Lunar New Year run-up', '2026-02-02'],
    ['two days after Lunar New Year', '2026-02-19'],
  ])('is off on %s', (_when, day) => {
    expect(activeFestival(at(day))).toBeNull();
  });

  /** Late in the evening of the first run-up day is still the first run-up day. */
  it('judges the window by calendar day, whatever the hour', () => {
    expect(activeFestival(at('2026-12-11', 23))).toBe('christmas');
    expect(activeFestival(at('2026-12-10', 23))).toBeNull();
  });
});

describe('festivalDate', () => {
  it('reads Mid-Autumn from the table and knows nothing outside it', () => {
    expect(festivalDate('midAutumn', 2027)?.getMonth()).toBe(8);
    expect(festivalDate('midAutumn', 2027)?.getDate()).toBe(15);
    expect(festivalDate('midAutumn', LAST_MID_AUTUMN_YEAR + 1)).toBeNull();
  });

  /** The table is the only source for Mid-Autumn. This fails in its last year so the
   *  next dates are added before the header quietly stops dressing up for it. */
  it('has Mid-Autumn dates for next year', () => {
    expect(Object.keys(MID_AUTUMN_DATES).length).toBeGreaterThan(0);
    expect(LAST_MID_AUTUMN_YEAR).toBeGreaterThan(new Date().getFullYear());
  });

  it('reads Lunar New Year from its table, and has dates for next year', () => {
    expect(festivalDate('lunarNewYear', 2028)?.getMonth()).toBe(0);
    expect(festivalDate('lunarNewYear', 2028)?.getDate()).toBe(26);
    expect(festivalDate('lunarNewYear', LAST_LUNAR_NEW_YEAR_YEAR + 1)).toBeNull();
    expect(Object.keys(LUNAR_NEW_YEAR_DATES).length).toBeGreaterThan(0);
    expect(LAST_LUNAR_NEW_YEAR_YEAR).toBeGreaterThan(new Date().getFullYear());
  });
});

describe('the preview override', () => {
  it('forces a festival on, and ignores a value that is not one', () => {
    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'halloween');
    expect(readFestivalPreview()).toBe('halloween');
    expect(currentFestival(at('2026-03-03'))).toBe('halloween');

    localStorage.setItem(FESTIVAL_PREVIEW_STORAGE_KEY, 'easter');
    expect(readFestivalPreview()).toBeNull();
    expect(currentFestival(at('2026-03-03'))).toBeNull();
  });
});
