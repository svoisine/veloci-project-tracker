// brief/ — the briefing computation.
//
// Pure functions over already-loaded rows: no I/O, no network. Given the raw
// sheet values and a project config, produce the JSON the dashboard renders.
// Keeping it side-effect free is what lets the hub reuse it over a cached pull
// without any risk of touching the network.
//
//   rows.js      what a tracker row is: status, lanes, prereqs, readiness
//   dates.js     current week, week ordering, next milestone
//   sections.js  one function per block the dashboard renders
//
// buildBrief itself is now only assembly: the envelope, then each section.

import { currentWeek, isPlainObject, nextMilestone, today } from './dates.js';
import { buildIndex, norm, rowsToDicts } from './rows.js';
import { blockedOf, inProgressOf, openKNs, progressOf, readyLanes } from './sections.js';

export { rowsToDicts } from './rows.js';

/**
 * The shape every brief has, whether or not there is a single row of data.
 * A field that only appears on the happy path is a field the UI will one day
 * read as `undefined`, so all of them are declared here.
 */
function envelope(project, data, cur, now) {
  return {
    project: project.name,
    projectId: project.id,
    source: data.source,
    generatedAt: new Date().toISOString(),
    currentWeek: cur,
    progress: { done: 0, total: 0, pct: 0 },
    nextMilestone: nextMilestone(project.milestones, now),
    inProgress: [],
    readyDeep: [],
    readyGap: [],
    pullAhead: [],
    blocked: [],
    openKNs: [],
    // additive, for the UI's source badge / error state
    cachedAt: data.cachedAt || null,
    message: data.message || null,
    // M3: what KIND of failure, plus a sentence the user can act on — mostly so
    // an unshared sheet says "share it with the service account" and not "no data".
    failureKind: data.failureKind || null,
    hint: data.hint || null,
    // M4: lets the UI tell "before the first tracked week" apart from "this
    // project has no schedule at all yet", and offer the editor for the latter.
    hasSchedule: Object.keys(isPlainObject(project.weekStarts) ? project.weekStarts : {}).length > 0,
    hasMilestones: (Array.isArray(project.milestones) ? project.milestones : []).length > 0,
  };
}

/**
 * @param {object} project  parsed projects/<id>.json
 * @param {object} data     { tracker, kn, source, cachedAt, message } from sheets/
 */
export function buildBrief(project, data) {
  const now = today();

  // Drop rows with no id — blank spacer rows inside the range shouldn't inflate
  // the denominator or show up as nameless work.
  const rows = rowsToDicts(data.tracker).filter((r) => norm(r.id));
  const knRows = rowsToDicts(data.kn).filter((r) => norm(r.id));

  const cur = currentWeek(project.weekStarts, now);
  const base = envelope(project, data, cur, now);

  if (rows.length === 0) {
    return { ...base, openKNs: openKNs(knRows) };
  }

  const index = buildIndex(rows);

  return {
    ...base,
    progress: progressOf(rows),
    inProgress: inProgressOf(rows),
    ...readyLanes(rows, index, cur),
    blocked: blockedOf(rows, index),
    openKNs: openKNs(knRows),
  };
}
