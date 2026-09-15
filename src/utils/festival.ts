import { FESTIVAL_PREVIEW_STORAGE_KEY } from '@/constants/storage';

/** The festivals the header dresses up for. Listed in the order they are checked: the
 *  windows do not overlap today, but if two ever did, the first one here wins rather
 *  than leaving the answer to chance. */
export const FESTIVALS = ['midAutumn', 'halloween', 'christmas'] as const;

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

const localDate = (year: number, month: number, day: number): Date => new Date(year, month - 1, day);

/** The festival's day in a given year, in local time, or null when it is not known. */
export const festivalDate = (festival: Festival, year: number): Date | null => {
  switch (festival) {
    case 'midAutumn': {
      const iso = MID_AUTUMN_DATES[year];
      if (iso === undefined) {
        return null;
      }
      const [y, m, d] = iso.split('-').map(Number);
      return localDate(y, m, d);
    }
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

/** Where the decoration is switched on: the deployments that dress up, named by host
 *  (with the port when there is one — it is `location.host`, not `hostname`). A mock
 *  list for now: the dev server this was built against. The real list belongs with
 *  deployment config once there is such a place; until then, adding a host is adding a
 *  line here. */
export const FESTIVE_HOSTS: readonly string[] = ['localhost:5199'];

export const isFestiveHost = (host: string = window.location.host): boolean => FESTIVE_HOSTS.includes(host);

/** What the header should dress up as right now: the preview if one is set (it is for
 *  looking at a festival wherever you are, so it ignores the host), else what the
 *  calendar says — and only on a host that dresses up at all. */
export const currentFestival = (now: Date = new Date(), host?: string): Festival | null => {
  return readFestivalPreview() ?? (isFestiveHost(host) ? activeFestival(now) : null);
};
