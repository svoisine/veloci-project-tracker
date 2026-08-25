// routes/notes.js — the notes activity feed.
//
//   GET  /api/notes?project=<id>       what the notes say, and what's new
//   POST /api/notes/seen?project=<id>  "I have looked at all of that"
//
// Both are READ-ONLY as far as the user's data is concerned. This file imports
// loadProjectData (the same live/cache/none load the dashboard uses) and
// nothing that writes: there is no path from either route to a sheet write, no
// column is added, and no authorship is recorded — VPT has no user identity and
// the feed does not invent one. Editing a note is still the per-step editor's
// job, via /api/step.
//
// The only thing either route writes is a local snapshot file under VPT_HOME,
// which is what makes "new since you last looked" answerable at all: the sheet
// carries no history for VPT to read, so this machine remembers instead.
//
// Always 200, always valid JSON — same contract as /api/brief.

import express from 'express';

import { rowsToDicts } from '../brief/index.js';
import { norm } from '../brief/rows.js';
import { loadProject } from '../config/index.js';
import { emptyFeed, fail, resolveProjectId } from '../http/respond.js';
import { buildNotesFeed, promoteSeen, readSnapshot, recordCurrent, snapshotSteps } from '../notes/index.js';
import { loadProjectData } from '../sheets/index.js';
import { isSafeId } from '../../shared/contract.js';

export const notesRoutes = express.Router();

/**
 * The project id, or an explanation. Both routes turn an id into a FILENAME
 * (vpt_notes_snapshot_<id>.json), so the guard runs before anything touches the
 * filesystem — `?project=../../something` must never get that far. snapshot.js
 * checks again for the same reason; neither check is the only one.
 */
function askedFor(raw) {
  const projectId = resolveProjectId(raw);
  return isSafeId(projectId) ? { projectId } : { projectId, error: `Invalid project id: "${projectId}".` };
}

/**
 * GET /api/notes?project=<id>
 *
 * The same live → cache → none ladder as /api/brief, because the feed is just
 * as useful offline: the diff is against a LOCAL snapshot, so a cached pull
 * still answers "what changed since I last looked" correctly. It is badged as
 * cached so the user knows the sheet may have moved on.
 */
notesRoutes.get('/notes', async (req, res) => {
  const { projectId, error } = askedFor(req.query.project);
  if (error) return res.json(emptyFeed(projectId, error, 'bad_request', { ok: false }));

  let project;
  try {
    project = loadProject(projectId);
  } catch (err) {
    return res.json(
      emptyFeed(projectId, `Could not load project config: ${err.message}`, 'no_config', { ok: false })
    );
  }

  try {
    const data = await loadProjectData(project);
    const rows = rowsToDicts(data.tracker).filter((r) => norm(r.id));

    // Diff against `previous` — the last state the user acknowledged. Read
    // BEFORE recording, or a load would diff against itself and nothing would
    // ever be new.
    const { previous } = readSnapshot(projectId);
    const { items, counts } = buildNotesFeed(rows, previous);

    // Record what we are about to show as `current`, so "Mark all seen"
    // acknowledges exactly this. Skipped when there is no data at all: writing
    // an empty `current` over a real one would let a failed load quietly erase
    // the user's unread notes on the next acknowledgement.
    //
    // `previous` is handed over rather than re-read — on a large project the
    // snapshot is megabytes, and parsing it twice per load was pure waste.
    if (data.source !== 'none') recordCurrent(projectId, snapshotSteps(rows), previous);

    return res.json({
      ok: true,
      project: project.name,
      projectId,
      source: data.source,
      generatedAt: new Date().toISOString(),
      items,
      counts,
      snapshotAt: previous?.takenAt || null,
      cachedAt: data.cachedAt || null,
      message: data.message || null,
      failureKind: data.failureKind || null,
      hint: data.hint || null,
    });
  } catch (err) {
    // loadProjectData swallows its own failures and the compute is pure, so
    // reaching here means a bug. Still never a 500.
    console.error(`[vpt] unexpected error building the notes feed for "${projectId}":`, err);
    return res.json(emptyFeed(projectId, `Unexpected error: ${err.message}`, 'other', { ok: false }));
  }
});

/**
 * POST /api/notes/seen?project=<id>
 *
 * Promotes `current` → `previous`, so everything the user just looked at reads
 * as `unchanged` from now on. Local snapshot file only — this route holds no
 * Sheets client and cannot touch Google. It changes what VPT REMEMBERS, never
 * what the sheet says.
 *
 * The id may also arrive in the body; the query string is the documented form.
 */
notesRoutes.post('/notes/seen', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { projectId, error } = askedFor(req.query.project ?? body.project);
  if (error) return res.json(fail('bad_request', error));

  try {
    const { promoted, snapshotAt } = promoteSeen(projectId);
    return res.json({
      ok: true,
      projectId,
      promoted,
      snapshotAt,
      sheetUntouched: true,
      // Nothing to promote means the feed has never been loaded on this
      // machine; say so rather than reporting a badge we did not clear.
      message: promoted ? null : 'Nothing to mark seen yet — open the notes feed first.',
    });
  } catch (err) {
    console.error(`[vpt] could not mark notes seen for "${projectId}":`, err);
    return res.json(fail('seen_failed', err.message || String(err)));
  }
});
