// brief/dates.js — the calendar half of the brief.
//
// Which week is it, is this row's week still ahead, and which milestone comes
// next. All local-date arithmetic: VPT's schedule is a wall calendar, not a
// timeline of instants, so UTC would be wrong by a day for most of the world.

import { norm } from './rows.js';

/**
 * Parse "YYYY-MM-DD" as a LOCAL date — avoids the UTC off-by-one on Date().
 *
 * Returns null for a date that is the right SHAPE but not a real day. Date()
 * silently rolls those over: `new Date(2020, 12, 45)` is 14 Feb 2021, so a
 * hand-edited `"W2": "2026-13-45"` used to become a real week start in another
 * year and quietly move which week the dashboard said you were in.
 *
 * The API already refuses such a date on write (isRealDate in
 * shared/contract.js); a config edited straight on disk never passes through
 * that check, so the read path has to make the same judgement.
 */
export function parseISODate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(norm(s));
  if (!m) return null;

  const [y, mo, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(y, mo - 1, day);
  if (Number.isNaN(d.getTime())) return null;

  // Round-trip: if Date moved any component, the input was not a real day.
  const rolled = d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day;
  return rolled ? null : d;
}

/** Midnight today, local. */
export function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export const daysBetween = (from, to) => Math.round((to - from) / 86400000);

/** `{...}` and not an array — the only shape weekStarts / a milestone may take. */
export const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** The weekStarts entry whose date is the latest one <= today. */
export function currentWeek(weekStarts, now) {
  let best = null;
  let bestDate = null;
  for (const [label, ds] of Object.entries(isPlainObject(weekStarts) ? weekStarts : {})) {
    const d = parseISODate(ds);
    if (!d) continue;
    if (d <= now && (bestDate === null || d > bestDate)) {
      bestDate = d;
      best = label;
    }
  }
  return best; // null before W0 starts
}

const weekNumber = (w) => {
  const n = parseInt(norm(w).replace(/^[Ww]/, ''), 10);
  return Number.isNaN(n) ? 999 : n;
};

export function weekIsFuture(rowWeek, curWeek) {
  if (!curWeek || !norm(rowWeek)) return false;
  return weekNumber(rowWeek) > weekNumber(curWeek);
}

/** First milestone still ahead of (or on) today. */
export function nextMilestone(milestones, now) {
  const upcoming = (Array.isArray(milestones) ? milestones : [])
    // A hand-edited config can legitimately contain `[null]` or a stray string
    // in this array. Those are not milestones; skipping them beats throwing
    // three layers below the file the user actually mistyped.
    .filter((m) => m && typeof m === 'object' && !Array.isArray(m))
    .map((m) => ({ ...m, _d: parseISODate(m.date) }))
    .filter((m) => m._d && m._d >= now)
    .sort((a, b) => a._d - b._d);

  if (upcoming.length === 0) return null;

  const m = upcoming[0];
  const days = daysBetween(now, m._d);
  return {
    label: m.label || '',
    date: m.date,
    daysLeft: days,
    // Kept in the payload for compatibility with anything reading the API
    // directly; the dashboard countdown renders daysLeft + the date only.
    weeksLeft: Number((days / 7).toFixed(1)),
  };
}
