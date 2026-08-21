// brief/rows.js — what a tracker row IS.
//
// Header mapping, status vocabulary, prereq parsing, readiness. Pure functions
// over already-loaded rows: no I/O, no dates, no sections. Everything the rest
// of the brief module asks about a single row is answered here, so the sheet's
// column conventions live in exactly one file.

export const DONE_STATES = new Set(['done', 'skipped']);
export const BLOCKED_STATES = new Set(['blocked']);
export const ACTIVE_STATES = new Set(['in_progress']);

export const DEEP_LANES = new Set(['deep']);
export const GAP_LANES = new Set(['gap', 'test', 'biz', 'design']);
// lanes 'milestone' and 'mobile' are informational — never surfaced as "work now"

export const CLOSED_KN_STATES = new Set(['resolved', 'closed', 'done']);

export const norm = (s) => (s === undefined || s === null ? '' : String(s).trim());

/** Sheets returns list-of-lists with row 0 as the header. Pad short rows. */
export function rowsToDicts(values) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const header = (values[0] || []).map((h) => norm(h));
  const out = [];
  for (const row of values.slice(1)) {
    const cells = Array.isArray(row) ? row : [];
    const obj = {};
    header.forEach((key, i) => {
      if (key) obj[key] = cells[i] === undefined ? '' : cells[i];
    });
    out.push(obj);
  }
  return out;
}

/** "EX-1.01;EX-1.02" / "EX-1.01, EX-1.02" / "none" -> array of ids */
export function splitIds(field) {
  const f = norm(field).toLowerCase();
  if (!f || f === 'none') return [];
  return norm(field)
    .replace(/,/g, ';')
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);
}

export const statusOf = (row) => norm(row && row.status).toLowerCase() || 'todo';
export const isDone = (row) => DONE_STATES.has(statusOf(row));
export const laneOf = (row) => norm(row && row.lane).toLowerCase();

export function buildIndex(rows) {
  const index = new Map();
  for (const r of rows) {
    const id = norm(r.id);
    if (id) index.set(id, r);
  }
  return index;
}

/** Ready = not done/skipped/blocked, and every KNOWN prereq is done/skipped. */
export function isReady(row, index) {
  const st = statusOf(row);
  if (DONE_STATES.has(st) || BLOCKED_STATES.has(st)) return false;
  for (const pid of splitIds(row.prereq)) {
    const pre = index.get(pid);
    if (!pre) continue; // unknown prereq -> don't block on it
    if (!isDone(pre)) return false;
  }
  return true;
}

/** Prereqs that exist in the sheet but aren't finished yet. */
export function unmetPrereqs(row, index) {
  return splitIds(row.prereq).filter((p) => index.has(p) && !isDone(index.get(p)));
}

// M2: steps carry their editable state (status/notes/blocked_by) so the UI can
// render controls and send the pre-write "this is what I think is there" value.
export const toStep = (r) => ({
  id: norm(r.id),
  title: norm(r.title),
  week: norm(r.week),
  lane: laneOf(r),
  status: statusOf(r),
  notes: norm(r.notes),
  blockedBy: norm(r.blocked_by),
});

export const byId = (a, b) => (norm(a.id) < norm(b.id) ? -1 : norm(a.id) > norm(b.id) ? 1 : 0);
