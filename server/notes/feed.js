// notes/feed.js — the notes feed computation.
//
// Pure functions over already-loaded rows, same rule as brief/: no I/O, no
// network, no filesystem. Given the tracker rows and the snapshot of what this
// machine last saw, work out which notes are new, which changed, and which are
// exactly as they were.
//
// The sheet has no change history VPT can read — a pull gives the CURRENT
// notes and nothing about when they got there. "New since you last looked" is
// therefore not something we discover, it is something we REMEMBER: the diff is
// against snapshot.js's `previous` slot, which is local to this machine. That
// is also why the feed carries no authorship — VPT has no user identity, and
// inventing one from a local diff would be a lie.
//
// Nothing here throws. A malformed row, a snapshot written by a future VPT, a
// snapshot that is a JSON array — all degrade to "treat it as new", which is
// the same answer as the first-ever view and is never wrong in a damaging way.

import { norm, statusOf } from '../brief/rows.js';

/** new before changed before unchanged; ties broken by id. */
const STATE_RANK = { new: 0, changed: 1, unchanged: 2 };

const asArray = (v) => (Array.isArray(v) ? v : []);
const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * A map with NO prototype, for anything keyed by a step id.
 *
 * Step ids come from the sheet, so they are attacker-controlled in the only
 * sense that matters here: someone can type one. On an ordinary `{}` two of
 * them misbehave badly.
 *
 *   id "__proto__"  — `steps[id] = {...}` invokes the __proto__ SETTER instead
 *                     of creating a property. The step vanishes from the
 *                     snapshot (JSON.stringify sees no own key) while the map
 *                     it was assigned to silently gets a hijacked prototype,
 *                     so unrelated lookups start resolving to that note's text.
 *   id "toString",
 *      "constructor" — `steps[id]` resolves up the prototype chain to a builtin
 *                     rather than reporting "not in the snapshot".
 *
 * Neither pollutes the global Object.prototype (JSON.parse and plain assignment
 * cannot), so this is not a sandbox escape — it is a CONSISTENCY bug: the diff
 * would report `unchanged` for a note that was never actually recorded, and
 * flip to `new` again after the file round-trips through disk. A null-prototype
 * map has no setter to invoke and nothing to inherit, and an own "__proto__"
 * key on one serialises and parses back cleanly.
 */
const idMap = () => Object.create(null);

/**
 * The per-step record a snapshot stores: `{ "<id>": { notes, status } }`.
 *
 * Status is kept even though the diff never reads it — it is what makes the
 * file readable on its own, and it is the obvious thing a later "this note's
 * step moved to blocked" feature would need.
 */
export function snapshotSteps(rows) {
  const steps = idMap();
  for (const row of asArray(rows)) {
    const id = norm(row?.id);
    if (!id) continue;
    steps[id] = { notes: norm(row?.notes), status: statusOf(row) };
  }
  return steps;
}

/**
 * The `steps` map out of a snapshot slot, whatever shape the file turned out to
 * be — re-homed onto a null prototype, because JSON.parse hands back an
 * ordinary object and every lookup below is keyed by an untrusted step id.
 */
function stepsOf(snapshot) {
  const steps = isPlainObject(snapshot) ? snapshot.steps : null;
  if (!isPlainObject(steps)) return idMap();
  // Own enumerable keys only, onto a prototype-less target: an own "__proto__"
  // key (which is what JSON.parse produces) copies across as plain data.
  return Object.assign(idMap(), steps);
}

/**
 * What one step's note was the last time this machine took a snapshot.
 * A step that wasn't in the snapshot, or whose entry is junk, reads as "".
 */
function noteBefore(prevSteps, id) {
  const before = prevSteps[id];
  return isPlainObject(before) ? norm(before.notes) : '';
}

/**
 * @param {any[]} rows        tracker rows as dicts (rowsToDicts output)
 * @param {object|null} previous  the `previous` snapshot slot, or null/garbage
 * @returns {{ items: object[], counts: { new: number, changed: number, total: number } }}
 *
 * Only steps that have a note RIGHT NOW are feed items. A note that was deleted
 * since the snapshot simply drops out of the feed — v1 does not surface
 * removals, because a note nobody can read is not activity anyone can act on,
 * and doing it properly means keeping tombstones the snapshot has no room for.
 */
export function buildNotesFeed(rows, previous) {
  const prevSteps = stepsOf(previous);
  // A first view has no snapshot at all. Everything is then `new`, which is
  // exactly right: you have not looked at any of it on this machine.
  const items = [];

  // Collapse duplicate ids BEFORE looking at notes, last row winning — exactly
  // what snapshotSteps() and brief/rows.js buildIndex() do.
  //
  // A sheet can hold the same id twice. The snapshot is keyed by id, so only
  // one of those rows can ever be remembered; emitting both left the row that
  // wasn't remembered permanently `changed` — it could not be acknowledged by
  // "mark all seen", so the badge never cleared — and put two feed items on
  // screen under one React key. Deduplicating here is what makes the shown row
  // and the tracked row the same row.
  const latest = new Map();
  for (const row of asArray(rows)) {
    const id = norm(row?.id);
    if (id) latest.set(id, row);
  }

  for (const [id, row] of latest) {
    const notes = norm(row?.notes);
    if (!notes) continue; // no note = not a feed item

    const before = noteBefore(prevSteps, id);
    const state = !before ? 'new' : before === notes ? 'unchanged' : 'changed';

    items.push({
      id,
      title: norm(row?.title),
      status: statusOf(row),
      notes,
      state,
      hasNote: true,
    });
  }

  items.sort((a, b) => {
    const rank = STATE_RANK[a.state] - STATE_RANK[b.state];
    return rank !== 0 ? rank : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return { items, counts: countsOf(items) };
}

/** What the header badge counts. `total` is every note, not just the unseen ones. */
export function countsOf(items) {
  const list = asArray(items);
  return {
    new: list.filter((i) => i?.state === 'new').length,
    changed: list.filter((i) => i?.state === 'changed').length,
    total: list.length,
  };
}
