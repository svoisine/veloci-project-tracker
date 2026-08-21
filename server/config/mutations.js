// config/mutations.js — create, patch and delete a project.
//
// Every function here validates BEFORE it writes, and writes through the
// temp-file+rename in store.js, so a rejected change leaves the existing config
// exactly as it was.
//
// Purely local, like the rest of config/: these rewrite (or unlink)
// projects/<id>.json and the project's local cache. None of them can reach
// Google — the spreadsheet id is simply forgotten.

import fs from 'node:fs';

import {
  DEFAULT_KN_RANGE,
  DEFAULT_TRACKER_RANGE,
  isSafeId,
  normalizeSheetId,
  PLACEHOLDER_SHEET_ID,
} from '../../shared/contract.js';
import { cacheFile } from '../paths.js';
import { configPath, loadProject, projectExists, writeConfigAtomic } from './store.js';
import { assertAddressable, ConfigError, validateMilestones, validateName, validateWeekStarts } from './validate.js';

/** `{...}` and not an array — the only shape weekStarts may take. */
const asPlainObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/**
 * Create projects/<id>.json. Optional fields fall back to the same defaults
 * M1/M2 assume. weekStarts/milestones may legitimately be empty — brief.js
 * already tolerates that (no current week, no next milestone).
 */
export function createProject(input) {
  const id = String(input?.id ?? '').trim();
  if (!isSafeId(id)) {
    throw new ConfigError(
      'bad_id',
      `Invalid project id: "${id}". Use letters, numbers, hyphen and underscore only (no spaces, dots or slashes).`
    );
  }
  if (projectExists(id)) {
    throw new ConfigError('exists', `A project with id "${id}" already exists.`);
  }

  const project = {
    id,
    name: validateName(input?.name),
    spreadsheetId: normalizeSheetId(input?.spreadsheetId) || PLACEHOLDER_SHEET_ID,
    trackerRange: String(input?.trackerRange ?? '').trim() || DEFAULT_TRACKER_RANGE,
    knRange: input?.knRange === undefined ? DEFAULT_KN_RANGE : String(input.knRange).trim(),
    // Not offered by the Add-Project form on purpose — see resolveKeyFor().
    // Accepted here so the API can set it without a later PATCH.
    keyFile: String(input?.keyFile ?? '').trim(),
    weekStarts: asPlainObject(input?.weekStarts),
    milestones: Array.isArray(input?.milestones) ? input.milestones : [],
  };

  writeConfigAtomic(id, project);
  return loadProject(id);
}

/**
 * Edit name, spreadsheetId, milestones and/or weekStarts.
 *
 * Purely local: this rewrites projects/<id>.json and nothing else. Like delete,
 * it cannot reach Google — this module holds no Sheets client.
 */
export function patchProject(id, input) {
  assertAddressable(id);
  if (!projectExists(id)) {
    throw new ConfigError('not_found', `No project with id "${id}".`);
  }

  const project = loadProject(id);

  if (input?.name !== undefined) project.name = validateName(input.name);
  if (input?.spreadsheetId !== undefined) {
    project.spreadsheetId = normalizeSheetId(input.spreadsheetId) || PLACEHOLDER_SHEET_ID;
  }
  if (input?.milestones !== undefined) project.milestones = validateMilestones(input.milestones);
  if (input?.weekStarts !== undefined) project.weekStarts = validateWeekStarts(input.weekStarts);
  if (input?.keyFile !== undefined) project.keyFile = String(input.keyFile ?? '').trim();

  writeConfigAtomic(id, project);
  return loadProject(id);
}

/**
 * Remove a project from VPT.
 *
 * Unlinks the two local files a project owns: its config (projects/<id>.json)
 * and its cached last-good-pull (VPT_HOME/vpt_cache_<id>.json). "Remove" should
 * mean gone from this machine — a cache left behind is invisible clutter that
 * outlives the project it belonged to.
 *
 * It does not, and cannot, touch the Google Sheet. The user's data stays where
 * it is.
 *
 * The config is removed FIRST. If the cache can't be deleted (locked, gone,
 * read-only), that is reported but not fatal — a stale cache is a smaller
 * problem than a project that refuses to be deleted.
 */
export function deleteProject(id) {
  assertAddressable(id);
  if (!projectExists(id)) {
    throw new ConfigError('not_found', `No project with id "${id}".`);
  }
  try {
    fs.unlinkSync(configPath(id));
  } catch (err) {
    throw new ConfigError('delete_failed', `Could not remove projects/${id}.json: ${err.message}`);
  }

  let cacheRemoved = false;
  let cacheError = null;
  try {
    const cache = cacheFile(id);
    if (fs.existsSync(cache)) {
      fs.unlinkSync(cache);
      cacheRemoved = true;
    }
  } catch (err) {
    cacheError = err.message;
  }

  return { id, cacheRemoved, cacheError };
}
