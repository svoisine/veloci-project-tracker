// http/respond.js — the JSON envelopes every route answers in.
//
// The frontend's contract is that everything under /api is JSON it can read,
// and that /api/brief in particular can neither hang nor 500. Keeping the
// shapes in one file is what stops one route from inventing a fourth spelling
// of "something went wrong".

import { ConfigError, listProjects } from '../config/index.js';

// Nothing but a last resort for a hand-rolled `curl /api/brief` with no
// ?project=: the UI always names the project it has open. Prefer whatever is
// actually on disk over a name that may not exist.
const FALLBACK_PROJECT = 'example-project';

export function resolveProjectId(raw) {
  const asked = String(raw ?? '').trim();
  if (asked) return asked;
  try {
    return listProjects()[0]?.id || FALLBACK_PROJECT;
  } catch {
    return FALLBACK_PROJECT;
  }
}

/** A body that isn't a JSON object is treated as an empty one, never a throw. */
export const bodyOf = (req) => (req.body && typeof req.body === 'object' ? req.body : {});

export function fail(reason, error, extra = {}) {
  return { ok: false, reason, error, ...extra };
}

/** ConfigError carries its own reason; anything else is an unexpected failure. */
export function configFail(err) {
  if (err instanceof ConfigError) return fail(err.reason, err.message);
  console.error('[vpt] project registry error:', err);
  return fail('unexpected', err.message || String(err));
}

/**
 * A complete, renderable brief with nothing in it. Used when the project config
 * itself could not be read, so buildBrief never even runs — the dashboard still
 * gets every field it destructures.
 */
export function emptyBrief(projectName, message, projectId = null, failureKind = 'config') {
  return {
    project: projectName,
    projectId,
    source: 'none',
    generatedAt: new Date().toISOString(),
    currentWeek: null,
    progress: { done: 0, total: 0, pct: 0 },
    nextMilestone: null,
    inProgress: [],
    readyDeep: [],
    readyGap: [],
    pullAhead: [],
    blocked: [],
    openKNs: [],
    cachedAt: null,
    message,
    failureKind,
    hint: null,
  };
}
