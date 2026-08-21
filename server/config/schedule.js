// config/schedule.js — the week-schedule generator.
//
// Its own file because it is the one piece of date ARITHMETIC in the config
// module (everything else there is validation or file I/O), and because it is
// the part most likely to be extended — fortnightly steps, skipped weeks, a
// term calendar. That work should not mean opening a file about JSON writes.
//
// It lives on the server rather than in the browser so the arithmetic and the
// validation that guards the file are the same code.

import { isRealDate, MAX_WEEKS } from '../../shared/contract.js';
import { ConfigError } from './validate.js';

const pad = (v) => String(v).padStart(2, '0');
const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

/**
 * Build `W1..Wn` (optionally a `W0` the week before) on 7-day steps from a start
 * date. The generator behind the UI's schedule builder — a 14-row form is
 * tedious, and every schedule VPT has seen is just weekly increments.
 */
export function generateWeekStarts({ startDate, weeks, includeW0 = false }) {
  const start = String(startDate ?? '').trim();
  if (!isRealDate(start)) {
    throw new ConfigError('bad_week_starts', `"${start || '(empty)'}" is not a valid YYYY-MM-DD date.`);
  }

  const n = Number(weeks);
  if (!Number.isInteger(n) || n < 1 || n > MAX_WEEKS) {
    throw new ConfigError('bad_week_starts', `weeks must be a whole number between 1 and ${MAX_WEEKS}.`);
  }

  const [y, m, d] = start.split('-').map(Number);
  // Local-date arithmetic; Date normalises month/year rollover for us.
  const at = (offsetWeeks) => iso(new Date(y, m - 1, d + offsetWeeks * 7));

  const out = {};
  if (includeW0) out.W0 = at(-1);
  for (let i = 1; i <= n; i++) out[`W${i}`] = at(i - 1);
  return out;
}
