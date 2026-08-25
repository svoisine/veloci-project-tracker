// routes/projects.js — the project hub.
//
// These five routes only ever touch projects/*.json on this machine. None of
// them opens a Sheets client — in particular DELETE removes a config file and
// leaves the Google Sheet completely alone.

import express from 'express';

import { buildBrief } from '../brief/index.js';
import {
  createProject,
  deleteProject,
  generateWeekStarts,
  listProjects,
  loadProject,
  patchProject,
} from '../config/index.js';
import { bodyOf, configFail, fail } from '../http/respond.js';
import { keyFileExists } from '../paths.js';
import { readCacheSnapshot } from '../sheets/index.js';

export const projectRoutes = express.Router();

const idParam = (req) => String(req.params.id || '');

/**
 * A progress snapshot for one hub card, from that project's cache if one
 * happens to exist. Reuses the real compute so the hub can't disagree with the
 * dashboard. A snapshot is a nicety — never let it break the listing.
 */
function snapshotOf(p) {
  if (p.status === 'broken') return { progress: null, cachedAt: null };
  try {
    const snap = readCacheSnapshot(p.id);
    if (!snap) return { progress: null, cachedAt: null };

    const brief = buildBrief(loadProject(p.id), {
      tracker: snap.tracker,
      kn: snap.kn,
      source: 'cache',
      cachedAt: snap.cachedAt,
      message: null,
    });
    return { progress: brief.progress, cachedAt: snap.cachedAt };
  } catch {
    return { progress: null, cachedAt: null };
  }
}

/**
 * GET /api/projects
 *
 * Config files only, plus a cached progress snapshot per project. Deliberately
 * no live fetches: the hub must render instantly and must not be hostage to one
 * unreachable sheet.
 */
projectRoutes.get('/projects', (_req, res) => {
  try {
    const projects = listProjects().map((p) => ({ ...p, ...snapshotOf(p) }));
    res.json({ ok: true, projects, keyFile: keyFileExists() ? 'present' : 'missing' });
  } catch (err) {
    console.error('[vpt] could not list projects:', err);
    res.json({ ok: false, reason: 'list_failed', error: err.message, projects: [] });
  }
});

/** POST /api/projects — create projects/<id>.json. */
projectRoutes.post('/projects', (req, res) => {
  try {
    const project = createProject(bodyOf(req));
    console.log(`[vpt] created project "${project.id}" (${project.name})`);
    res.json({ ok: true, project });
  } catch (err) {
    res.json(configFail(err));
  }
});

/**
 * GET /api/projects/:id — one project's full config.
 *
 * The brief deliberately doesn't carry `weekStarts` / `milestones` (the
 * dashboard only needs the computed result), so the schedule editor asks for
 * the raw config here. Config file only; no Google call.
 */
projectRoutes.get('/projects/:id', (req, res) => {
  try {
    res.json({ ok: true, project: loadProject(idParam(req)) });
  } catch (err) {
    res.json(fail('not_found', err.message));
  }
});

/**
 * POST /api/projects/:id/schedule — generate weekStarts and save it.
 *
 * Body: { startDate: "YYYY-MM-DD", weeks: 14, includeW0?: true }
 *
 * The generator lives here rather than in the browser so the date arithmetic and
 * the validation that guards the file are the same code.
 */
projectRoutes.post('/projects/:id/schedule', (req, res) => {
  try {
    const weekStarts = generateWeekStarts(bodyOf(req));
    const project = patchProject(idParam(req), { weekStarts });
    res.json({ ok: true, project, weekStarts: project.weekStarts });
  } catch (err) {
    res.json(configFail(err));
  }
});

/** PATCH /api/projects/:id — rename, replace a sheet id, or edit the schedule. */
projectRoutes.patch('/projects/:id', (req, res) => {
  try {
    res.json({ ok: true, project: patchProject(idParam(req), bodyOf(req)) });
  } catch (err) {
    res.json(configFail(err));
  }
});

/**
 * DELETE /api/projects/:id — forget a project.
 *
 * Unlinks the project's config and its local cache, so removing a project
 * really does remove it from this machine. The Google Sheet is untouched; this
 * route has no way to reach it. The confirm step lives in the UI.
 */
projectRoutes.delete('/projects/:id', (req, res) => {
  try {
    const removed = deleteProject(idParam(req));
    const alsoGone = [removed.cacheRemoved && 'cache', removed.snapshotRemoved && 'notes snapshot']
      .filter(Boolean)
      .join(' + ');
    console.log(
      `[vpt] removed project "${removed.id}" (config${alsoGone ? ` + ${alsoGone}` : ''} — sheet untouched)`
    );
    if (removed.cacheError) {
      console.warn(`[vpt] could not remove the cache for "${removed.id}": ${removed.cacheError}`);
    }
    if (removed.snapshotError) {
      console.warn(`[vpt] could not remove the notes snapshot for "${removed.id}": ${removed.snapshotError}`);
    }
    res.json({
      ok: true,
      id: removed.id,
      sheetUntouched: true,
      cacheRemoved: removed.cacheRemoved,
      cacheError: removed.cacheError,
      snapshotRemoved: removed.snapshotRemoved,
      snapshotError: removed.snapshotError,
    });
  } catch (err) {
    res.json(configFail(err));
  }
});
