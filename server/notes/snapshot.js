// notes/snapshot.js — what this machine last saw in the notes column.
//
// One JSON file per project, beside the cache and just as dumb: whole-file
// read, whole-file write, no locking, no expiry. A snapshot we cannot read or
// write is never fatal — every function here degrades to "no snapshot", which
// the feed reads as "everything is new". That is the first-view answer, and it
// is the safe direction to fail in: the worst case is the user is shown notes
// they had already read, never that a new note is hidden from them.
//
// ---------------------------------------------------------------- two slots
//
// The file holds TWO snapshots of the same shape:
//
//   previous   what the feed diffs against — "the last state you acknowledged"
//   current    the most recent state VPT actually put on screen
//
// The promotion rule, which is the whole design:
//
//   `previous` is ONLY ever replaced by current when the user presses
//   "Mark all seen" (POST /api/notes/seen). Nothing else moves it.
//
// One trigger, not two. The obvious alternative — also promoting on a fresh
// open after a server restart — was rejected because it breaks the one property
// the feature exists for: a note must stay marked `new` until the user has
// ACTUALLY looked at it. Restarting VPT is not looking. With a restart boundary,
// closing the terminal overnight silently marks every unread note as read.
//
// `current` is rewritten on every feed load that had rows to show (live OR
// cache), so it is always "what was last on screen" and "Mark all seen" marks
// exactly what the user was looking at — including when they were offline.
//
// This file writes ONLY under VPT_HOME, only for a validated project id, and
// holds no Sheets client. It cannot reach the user's Google Sheet.

import fs from 'node:fs';

import { isSafeId } from '../../shared/contract.js';
import { projectExists } from '../config/index.js';
import { notesSnapshotFile, VPT_HOME } from '../paths.js';

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/** A slot is `{ takenAt, steps }` or it is nothing. Never half of one. */
function asSlot(v) {
  if (!isPlainObject(v)) return null;
  const steps = isPlainObject(v.steps) ? v.steps : null;
  if (!steps) return null;
  return { takenAt: typeof v.takenAt === 'string' ? v.takenAt : null, steps };
}

/**
 * Both slots off disk. Always an object — a missing, unreadable, malformed or
 * hand-mangled file reads as `{ previous: null, current: null }`.
 */
export function readSnapshot(projectId) {
  const empty = { previous: null, current: null };
  if (!isSafeId(projectId)) return empty;

  try {
    const parsed = JSON.parse(fs.readFileSync(notesSnapshotFile(projectId), 'utf8'));
    if (!isPlainObject(parsed)) return empty;
    return { previous: asSlot(parsed.previous), current: asSlot(parsed.current) };
  } catch {
    return empty; // no file yet, bad JSON, no permission — all "treat as new"
  }
}

/**
 * Whole-file write, through a temp file and a rename. Returns whether it
 * landed; never throws into a request.
 *
 * The rename is what makes this safe, and it is not theoretical. Within one VPT
 * process writeFileSync cannot interleave — the event loop is single-threaded —
 * but two processes on one VPT_HOME (a `npm run dev` and a `npm start`, or two
 * copies of the app) genuinely do tear the file: a reader mid-write sees
 * truncated JSON, and one writer's `previous` slot can be clobbered by the
 * other's, which silently discards a "mark all seen" the user had performed.
 * fs.renameSync is atomic on the same volume, so a reader sees either the whole
 * old file or the whole new one. Same temp-then-rename shape as
 * config/store.js's writeConfigAtomic, for the same reason.
 */
function writeSnapshot(projectId, snapshot) {
  if (!isSafeId(projectId)) return false;

  const target = notesSnapshotFile(projectId);
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;

  try {
    fs.mkdirSync(VPT_HOME, { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(snapshot, null, 2), 'utf8');
    fs.renameSync(tmp, target);
    return true;
  } catch (err) {
    // Don't leave the half-written temp behind when the rename is what failed.
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* never written, or already gone */
    }
    // A snapshot we cannot write means the feed keeps calling these notes new.
    // Noisy, but strictly better than losing the dashboard over it.
    console.warn(`[vpt] could not write the notes snapshot for "${projectId}": ${err.message}`);
    return false;
  }
}

/**
 * Record what is on screen right now into `current`, leaving `previous` exactly
 * where it is. Called on every feed load that had data — live or cached.
 *
 * `previous` is passed in by the caller, which has already read it to compute
 * the diff: re-reading here parsed a multi-megabyte file a second time on every
 * single load. It is written back verbatim rather than merged, so a corrupt
 * `previous` is dropped here instead of being carried forward forever.
 *
 * Nothing is written for a project that no longer has a config. A feed load
 * that was already in flight when the project was deleted would otherwise
 * recreate the snapshot immediately after deleteProject() removed it, leaving
 * exactly the orphan file that cleanup exists to prevent — and one that a
 * project later recreated under the same id would then diff against.
 */
export function recordCurrent(projectId, steps, previous = undefined) {
  if (!projectExists(projectId)) return;

  const keep = previous === undefined ? readSnapshot(projectId).previous : previous;
  writeSnapshot(projectId, {
    previous: keep,
    current: { takenAt: new Date().toISOString(), steps: isPlainObject(steps) ? steps : {} },
  });
}

/**
 * "Mark all seen": promote current → previous. The ONLY thing that moves
 * `previous`, which is what makes `new` survive until the user has looked.
 *
 * With no `current` there is nothing to promote — the feed has never been
 * loaded on this machine, so there is no "what you just saw" to acknowledge.
 * Reported rather than faked, so the caller does not claim a badge was cleared
 * when it wasn't.
 *
 * @returns {{ promoted: boolean, snapshotAt: string|null }}
 */
export function promoteSeen(projectId) {
  const { current } = readSnapshot(projectId);
  if (!current) return { promoted: false, snapshotAt: null };

  // Both slots stay populated: `current` is left in place so an immediately
  // following load has something to acknowledge again.
  const ok = writeSnapshot(projectId, { previous: current, current });
  return { promoted: ok, snapshotAt: ok ? current.takenAt : null };
}

/**
 * Forget a project's snapshot. Part of deleting a project — "remove" should
 * mean gone from this machine, and a snapshot left behind is invisible clutter
 * that outlives the project it belonged to.
 *
 * @returns {{ removed: boolean, error: string|null }}
 */
export function removeSnapshot(projectId) {
  if (!isSafeId(projectId)) return { removed: false, error: null };
  try {
    const file = notesSnapshotFile(projectId);
    if (!fs.existsSync(file)) return { removed: false, error: null };
    fs.unlinkSync(file);
    return { removed: true, error: null };
  } catch (err) {
    return { removed: false, error: err.message };
  }
}
