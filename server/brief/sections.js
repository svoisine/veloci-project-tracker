// brief/sections.js — one function per block the dashboard renders.
//
// Each is independent and takes exactly what it needs, so the editorial rules
// ("pull ahead only when this week is nearly clear", "cap implicit blockers")
// are readable on their own instead of buried in one long assembly function.

import { weekIsFuture } from './dates.js';
import {
  ACTIVE_STATES,
  BLOCKED_STATES,
  byId,
  CLOSED_KN_STATES,
  DEEP_LANES,
  DONE_STATES,
  GAP_LANES,
  isDone,
  isReady,
  laneOf,
  norm,
  splitIds,
  statusOf,
  toStep,
  unmetPrereqs,
} from './rows.js';

const IMPLICIT_BLOCK_CAP = 6;
const PULL_AHEAD_CAP = 5;
// Only reach into future weeks when the current week is nearly clear.
const PULL_AHEAD_THRESHOLD = 2;

export function progressOf(rows) {
  const total = rows.length;
  const done = rows.filter(isDone).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function inProgressOf(rows) {
  return rows.filter((r) => ACTIVE_STATES.has(statusOf(r))).map(toStep).sort(byId);
}

/**
 * Ready work, split by schedule and then by lane.
 *
 * In-progress steps are left out: they already surface under In Progress, and
 * these lanes are for work not yet started. This is display only — an
 * in-progress prereq still doesn't unblock its dependents (see isReady).
 *
 * Pull-ahead is opt-in: only when this week's ready work is nearly exhausted,
 * so the page doesn't quietly encourage running ahead of the plan.
 */
export function readyLanes(rows, index, curWeek) {
  const ready = rows.filter((r) => isReady(r, index) && !ACTIVE_STATES.has(statusOf(r)));
  const onSchedule = ready.filter((r) => !weekIsFuture(r.week, curWeek));
  const ahead = ready.filter((r) => weekIsFuture(r.week, curWeek));

  const inLane = (lanes) => onSchedule.filter((r) => lanes.has(laneOf(r))).map(toStep).sort(byId);

  const readyDeep = inLane(DEEP_LANES);
  const readyGap = inLane(GAP_LANES);
  const pullAhead =
    readyDeep.length + readyGap.length <= PULL_AHEAD_THRESHOLD
      ? ahead.map(toStep).sort(byId).slice(0, PULL_AHEAD_CAP)
      : [];

  return { readyDeep, readyGap, pullAhead };
}

/** Explicitly blocked rows first, then rows waiting on unmet prereqs (capped). */
export function blockedOf(rows, index) {
  const explicit = rows
    .filter((r) => BLOCKED_STATES.has(statusOf(r)))
    .map((r) => {
      const kns = splitIds(r.blocked_by);
      return { ...toStep(r), reason: kns.length ? `blocked by ${kns.join(', ')}` : 'blocked' };
    })
    .sort(byId);

  const implicit = rows
    .filter((r) => {
      const st = statusOf(r);
      if (DONE_STATES.has(st) || BLOCKED_STATES.has(st)) return false;
      if (isReady(r, index)) return false;
      return unmetPrereqs(r, index).length > 0;
    })
    .map((r) => ({ ...toStep(r), reason: `waiting on ${unmetPrereqs(r, index).join(', ')}` }))
    .sort(byId)
    .slice(0, IMPLICIT_BLOCK_CAP);

  return [...explicit, ...implicit];
}

/** KN rows with a status that isn't resolved/closed/done. */
export function openKNs(knRows) {
  return knRows
    .filter((r) => {
      const st = norm(r.status).toLowerCase();
      return st && !CLOSED_KN_STATES.has(st);
    })
    .map((r) => ({
      id: norm(r.id),
      severity: norm(r.severity),
      title: norm(r.title),
      blocks: norm(r.blocks),
    }))
    .sort(byId);
}
