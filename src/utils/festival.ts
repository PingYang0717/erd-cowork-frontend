import { FESTIVAL_PREVIEW_STORAGE_KEY } from '@/constants/storage';

/** The festivals the header dresses up for. Listed in the order they are checked: the
 *  windows do not overlap today, but if two ever did, the first one here wins rather
 *  than leaving the answer to chance. */
export const FESTIVALS = ['lunarNewYear', 'midAutumn', 'halloween', 'christmas'] as const;

export type Festival = (typeof FESTIVALS)[number];

/** How long the decoration stays up around the day itself: two weeks of run-up, and the
 *  day after so a stop at midnight does not look like something broke. */
export const FESTIVAL_WINDOW = { daysBefore: 14, daysAfter: 1 } as const;

/** Mid-Autumn falls on the 15th of the 8th lunar month, which the Gregorian calendar
 *  cannot compute without a lunar table. A short table instead of a dependency: five
 *  dates, and a test that fails in the table's last year so it is extended in time. */
export const MID_AUTUMN_DATES: Readonly<Record<number, string>> = {
  2026: '2026-09-25',
  2027: '2027-09-15',
  2028: '2028-10-03',
  2029: '2029-09-22',
  2030: '2030-09-12',
};

export const LAST_MID_AUTUMN_YEAR = Math.max(...Object.keys(MID_AUTUMN_DATES).map(Number));

/** Lunar New Year — the first day of the first lunar month — the same way: a table,
 *  keyed by the Gregorian year it falls in, and a test that fails in its last year. */
export const LUNAR_NEW_YEAR_DATES: Readonly<Record<number, string>> = {
  2026: '2026-02-17',
  2027: '2027-02-06',
  2028: '2028-01-26',
  2029: '2029-02-13',
  2030: '2030-02-03',
};

export const LAST_LUNAR_NEW_YEAR_YEAR = Math.max(...Object.keys(LUNAR_NEW_YEAR_DATES).map(Number));

const localDate = (year: number, month: number, day: number): Date => new Date(year, month - 1, day);

/** A tabled festival's day in `year`, or null when the table does not reach it. */
const fromTable = (table: Readonly<Record<number, string>>, year: number): Date | null => {
  const iso = table[year];
  if (iso === undefined) {
    return null;
  }
  const [y, m, d] = iso.split('-').map(Number);
  return localDate(y, m, d);
};

/** The festival's day in a given year, in local time, or null when it is not known. */
export const festivalDate = (festival: Festival, year: number): Date | null => {
  switch (festival) {
    case 'lunarNewYear':
      return fromTable(LUNAR_NEW_YEAR_DATES, year);
    case 'midAutumn':
      return fromTable(MID_AUTUMN_DATES, year);
    case 'halloween':
      return localDate(year, 10, 31);
    case 'christmas':
      return localDate(year, 12, 25);
  }
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole local days from `from` to `to`; negative when `to` is earlier. Compared on
 *  calendar days, not elapsed hours, so the window opens at midnight like a date does. */
const daysBetween = (from: Date, to: Date): number => {
  const a = localDate(from.getFullYear(), from.getMonth() + 1, from.getDate()).getTime();
  const b = localDate(to.getFullYear(), to.getMonth() + 1, to.getDate()).getTime();
  return Math.round((b - a) / DAY_MS);
};

/** Whether `now` falls inside the festival's window in any nearby year. The years on
 *  either side are checked too, so a window that straddled New Year would still hold. */
const isInWindow = (festival: Festival, now: Date): boolean => {
  const year = now.getFullYear();
  for (const candidate of [year - 1, year, year + 1]) {
    const day = festivalDate(festival, candidate);
    if (day === null) {
      continue;
    }
    const untilDay = daysBetween(now, day);
    if (untilDay <= FESTIVAL_WINDOW.daysBefore && untilDay >= -FESTIVAL_WINDOW.daysAfter) {
      return true;
    }
  }
  return false;
};

/** The festival whose window `now` is in, if any. */
export const activeFestival = (now: Date): Festival | null => {
  return FESTIVALS.find((festival) => isInWindow(festival, now)) ?? null;
};

const isFestival = (value: string | null): value is Festival => (FESTIVALS as readonly string[]).includes(value ?? '');

/** The preview override, when this browser has one set and it names a real festival. */
export const readFestivalPreview = (): Festival | null => {
  try {
    const value = localStorage.getItem(FESTIVAL_PREVIEW_STORAGE_KEY);
    return isFestival(value) ? value : null;
  } catch {
    return null;
  }
};

/** What the header should dress up as right now: the preview if one is set, else what
 *  the calendar says. Whether to dress up at all is the reader's switch
 *  (`useFestiveStore`), which the header consults before asking this. */
export const currentFestival = (now: Date = new Date()): Festival | null => {
  return readFestivalPreview() ?? activeFestival(now);
};

/** The colour every festive silhouette is drawn in: the text colour, so it follows the
 *  theme, at whatever opacity the drawing sets. One definition for the header, the rail,
 *  the floor and the portholes. */
export const FESTIVE_INK = 'var(--erd-color-text, rgba(0, 0, 0, 0.88))';

/** The fairy lights' colours, cycling along the string: the header's and the rail's
 *  echo of it are the same string of lights. */
export const LIGHT_COLORS = ['#ff5c5c', '#f5d777', '#5cc282', '#6fb3ff'] as const;
