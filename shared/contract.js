// contract.js — the rules both tiers have to agree on.
//
// The server is always the authority: every value here is enforced again in
// server/config/validate.js or the /api/step route before anything is written.
// What this module removes is DRIFT — the browser used to carry its own copy of
// the id pattern, the field caps and the default ranges, so raising a limit on
// the server left the form quietly rejecting (or quietly over-sending) at the
// old one.
//
// Plain ESM with no imports, so Node loads it directly and Vite bundles it into
// the browser build. Nothing environment-specific may go in here — no fs, no
// DOM, no process.

// ------------------------------------------------------------------ projects

/**
 * Project ids become filenames, so keep them boring — this also stops
 * `?project=../../etc/passwd` style path traversal at the door.
 */
export const SAFE_ID = /^[A-Za-z0-9_-]+$/;

export const ID_MAX = 64;
export const NAME_MAX = 80;

export function isSafeId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= ID_MAX && SAFE_ID.test(id);
}

/** What a project's spreadsheetId says before anyone has pasted a real one. */
export const PLACEHOLDER_SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';

/**
 * Earlier builds used a different placeholder string. Recognising both keeps a
 * config written by an older VPT from being mistaken for a real sheet id.
 */
export const KNOWN_PLACEHOLDERS = new Set([PLACEHOLDER_SHEET_ID, 'PLACEHOLDER_USER_PASTES_THEIR_SHEET_ID']);

export const DEFAULT_TRACKER_RANGE = 'Tracker!A1:K1000';
export const DEFAULT_KN_RANGE = 'KN!A1:G1000';

/**
 * A sheet id is accepted as either the bare id or a full sheet URL — pasting
 * the URL is the far more natural thing to do, and the bare id is buried in it.
 */
export function normalizeSheetId(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const fromUrl = /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/.exec(s);
  return fromUrl ? fromUrl[1] : s;
}

// --------------------------------------------------------------------- steps

/**
 * Closed whitelist. A write can only ever land in one of these three columns,
 * which is what stops a crafted request from scribbling into id/prereq/week.
 */
export const EDITABLE_FIELDS = ['status', 'notes', 'blocked_by'];

export const STATUS_VALUES = ['todo', 'in_progress', 'blocked', 'done', 'skipped'];

export const NOTES_MAX = 2000;
export const BLOCKED_BY_MAX = 200;

// ----------------------------------------------------- schedule & milestones

export const LABEL_MAX = 200;
export const MAX_MILESTONES = 50;
export const MAX_WEEKS = 104;

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const WEEK_KEY = /^W\d+$/;

/** A real calendar date, not just the right shape ("2026-02-31" is not a date). */
export function isRealDate(s) {
  if (!ISO_DATE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
