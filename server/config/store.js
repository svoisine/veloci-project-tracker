// config/store.js — reading projects/<id>.json, and the one safe way to write it.
//
// Reads stay deliberately dumb (read the file, sanity-check it, hand it back)
// and nothing here is cached, so editing a config by hand only needs a server
// restart.
//
// Local filesystem only. Nothing in this file — or anywhere under config/ —
// holds a Sheets client, which is what makes "delete a project" structurally
// incapable of touching the user's Google Sheet.

import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_TRACKER_RANGE, isSafeId, KNOWN_PLACEHOLDERS } from '../../shared/contract.js';
import { PROJECTS_DIR } from '../paths.js';
import { ConfigError } from './validate.js';

export { PROJECTS_DIR };

export const configPath = (id) => path.join(PROJECTS_DIR, `${id}.json`);

/**
 * Load projects/<id>.json. Throws a plain Error with a readable message if the
 * id is unusable, the file is missing, or the JSON is malformed.
 */
export function loadProject(id) {
  if (!isSafeId(id)) {
    throw new Error(`Invalid project id: "${id}"`);
  }

  const file = configPath(id);
  if (!fs.existsSync(file)) {
    throw new Error(`No project config at ${file}`);
  }

  let project;
  try {
    // Strip a UTF-8 BOM before parsing. These files are meant to be hand-edited,
    // and several Windows editors (and PowerShell's Set-Content -Encoding utf8)
    // write one — JSON.parse rejects it with a message that looks like the file
    // is corrupt when the content is perfectly fine.
    project = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch (err) {
    throw new Error(`projects/${id}.json is not valid JSON: ${err.message}`);
  }

  // Valid JSON is not necessarily a config. `null`, `[1,2,3]` and `"text"` all
  // parse — and an ARRAY is the dangerous one: it takes the assignments in
  // normalizeProject without complaint, so the project loads and renders, and
  // then the next PATCH serialises it straight back to disk as `[1,2,3]` with
  // every field the user had set silently dropped. `null` was almost as bad,
  // failing later with a raw "Cannot set properties of null" that named nothing.
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    throw new Error(
      `projects/${id}.json is not a project config — it holds ${describe(project)}, not a JSON object.`
    );
  }

  return normalizeProject(id, project);
}

/** For the message above: what the file actually turned out to contain. */
function describe(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'an array';
  return `a ${typeof v}`;
}

/**
 * Fill in the shapes the rest of the server assumes, so a hand-edited config
 * missing a key degrades instead of throwing deep inside brief.js.
 *
 * A hand-edited file can hold anything, so coerce by SHAPE, not truthiness:
 * `"weekStarts": "none"` is truthy and would otherwise sail through and be
 * iterated as a string further down.
 *
 * The FILENAME is the id, always — the `id` field inside the file is advisory.
 * The filename is what every route addresses a project by, so letting the field
 * win produced a hub card that could not be opened (its listed id pointed at no
 * file), and let an unsafe string like "../../etc/x" surface as a project id.
 * The next write puts the field back in sync.
 */
function normalizeProject(id, project) {
  project.id = id;
  project.name = String(project.name || id);
  // Values are coerced rather than dropped: a week whose date is a number still
  // shows up in the editor for the user to correct, instead of vanishing.
  project.weekStarts =
    project.weekStarts && typeof project.weekStarts === 'object' && !Array.isArray(project.weekStarts)
      ? Object.fromEntries(
          Object.entries(project.weekStarts).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)])
        )
      : {};
  // Contents, not just the container. A hand-edited `"milestones": [null, 42]`
  // used to survive this function (it IS an array), travel through
  // GET /api/projects/:id, and crash the schedule editor on `m.date`. brief.js
  // already skipped non-objects when computing the countdown; the registry has
  // to make the same judgement so every consumer gets a clean array.
  project.milestones = Array.isArray(project.milestones)
    ? project.milestones.filter((m) => m && typeof m === 'object' && !Array.isArray(m))
    : [];
  project.spreadsheetId =
    typeof project.spreadsheetId === 'string' ? project.spreadsheetId : String(project.spreadsheetId ?? '');
  project.trackerRange = project.trackerRange || DEFAULT_TRACKER_RANGE;
  project.knRange = project.knRange || '';
  // Optional, and almost always empty: one service account can be shared onto
  // any number of sheets, so a second key is only needed when the default
  // genuinely cannot reach a sheet. Resolved by resolveKeyFor() in paths.js.
  project.keyFile = typeof project.keyFile === 'string' ? project.keyFile.trim() : '';

  return project;
}

export function hasPlaceholderSheetId(project) {
  return !project.spreadsheetId || KNOWN_PLACEHOLDERS.has(project.spreadsheetId);
}

export function projectExists(id) {
  return isSafeId(id) && fs.existsSync(configPath(id));
}

/**
 * Every project on disk, cheapest possible: config files only.
 *
 * Deliberately does NOT touch Google. The hub renders from this, so one
 * unreachable or misconfigured sheet must never be able to stall the list —
 * that was the failure mode A2 calls out.
 *
 * A config that won't parse is reported rather than thrown: the hub should be
 * able to show a broken project (so you can delete it) instead of dying.
 */
export function listProjects() {
  let files;
  try {
    files = fs.readdirSync(PROJECTS_DIR).filter((f) => f.toLowerCase().endsWith('.json'));
  } catch {
    return []; // no projects dir yet — an empty hub, not an error
  }

  const out = [];
  for (const file of files.sort()) {
    const id = file.replace(/\.json$/i, '');
    if (!isSafeId(id)) continue; // ignore anything we could not address anyway

    try {
      out.push(summarize(loadProject(id)));
    } catch (err) {
      out.push({
        id,
        name: id,
        spreadsheetId: '',
        needsSheetId: true,
        status: 'broken',
        error: err.message,
      });
    }
  }
  return out;
}

/** The hub card's worth of a project — never the whole config. */
function summarize(project) {
  const needsSheetId = hasPlaceholderSheetId(project);
  return {
    id: project.id,
    name: project.name,
    spreadsheetId: project.spreadsheetId || '',
    trackerRange: project.trackerRange,
    knRange: project.knRange,
    needsSheetId,
    weekCount: Object.keys(project.weekStarts || {}).length,
    milestoneCount: (project.milestones || []).length,
    status: needsSheetId ? 'needs-sheet-id' : 'ok',
  };
}

/**
 * Write JSON without leaving a half-written file behind if the process dies
 * mid-write: serialise first, write a temp beside the target, then rename
 * (atomic on the same volume).
 */
export function writeConfigAtomic(id, data) {
  const target = configPath(id);
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  const body = JSON.stringify(data, null, 2) + '\n';

  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  try {
    fs.writeFileSync(tmp, body, 'utf8');
    fs.renameSync(tmp, target);
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* temp already gone */
    }
    throw new ConfigError('write_failed', `Could not write projects/${id}.json: ${err.message}`);
  }
}
