import { getTranslations } from '@/i18n/useTranslations';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** A moment, relative to now, in the words of the current language.
 *
 *  Reads the dictionary at call time rather than importing a constant — the language
 *  can change while the app is open, and the weekday / month names differ between them.
 *  A pure function called at the point of display (not a component), so it uses
 *  `getTranslations()` like the other display-time helpers.
 *
 *  Past seven days it falls back to an absolute date, and that date now carries the
 *  year when it is not the current one: without it a session from last September and
 *  one from this September read identically in the rail. */
export const formatRelativeTime = (isoString: string, now: Date = new Date()): string => {
  const t = getTranslations().time;
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();

  if (diffMs < MINUTE_MS) {
    return t.justNow;
  }
  if (diffMs < HOUR_MS) {
    return t.minutesAgo(Math.floor(diffMs / MINUTE_MS));
  }
  if (diffMs < DAY_MS && now.getDate() === then.getDate()) {
    return t.hoursAgo(Math.floor(diffMs / HOUR_MS));
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfThen.getTime()) / DAY_MS);

  if (dayDiff === 1) {
    return t.yesterday;
  }
  if (dayDiff > 1 && dayDiff < 7) {
    return t.weekday(then.getDay());
  }
  return then.getFullYear() === now.getFullYear()
    ? t.monthDay(then.getMonth(), then.getDate())
    : t.monthDayYear(then.getMonth(), then.getDate(), then.getFullYear());
};
