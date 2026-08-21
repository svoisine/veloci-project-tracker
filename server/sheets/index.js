// sheets/ — the only place that talks to Google.
//
// Reads the tracker + KN ranges from a private Google Sheet using a
// service-account key held on this machine, and (since M2) writes single cells
// back. Short timeouts, and a last-good-pull cache so the dashboard still
// renders offline.
//
//   ../google/client.js    auth, the client cache, the time budgets
//   ../google/failures.js  what went wrong, and what to tell the user
//   a1.js                  ranges and cell addresses (pure)
//   cache.js               the offline fallback
//
// Contract: loadProjectData() NEVER throws. It always resolves to a result
// object with a `source` of 'live' | 'cache' | 'none'. The write helpers DO
// throw — the route layer turns those into { ok:false, reason } JSON.

import { hasPlaceholderSheetId } from '../config/index.js';
import { authorize, dropClient, FETCH_TIMEOUT_MS, withTimeout } from '../google/client.js';
import { classifyFailure, failureHint } from '../google/failures.js';
import { cacheFile, KEY_FILE, keyExistsAt, keyFileExists, resolveKeyFor } from '../paths.js';
import { readCache, writeCache } from './cache.js';

// Re-exported so callers keep importing "where the key is" and "what went
// wrong" from the module that talks to Google, while paths.js and
// google/failures.js stay the single places each is decided.
export { KEY_FILE, cacheFile, keyFileExists };
export { classifyFailure, failureHint } from '../google/failures.js';
export { SCOPES, warmUp } from '../google/client.js';
export { parseRange, resolveCell } from './a1.js';
export { patchCache } from './cache.js';

/** The last good pull for a project, straight off disk, or null. */
export { readCache as readCacheSnapshot } from './cache.js';

const norm = (s) => (s === undefined || s === null ? '' : String(s).trim());

/**
 * Throws if the project can't be talked to at all.
 * Returns the key path this project should authenticate with.
 */
function assertUsable(project) {
  if (hasPlaceholderSheetId(project)) {
    const e = new Error(
      `spreadsheetId in projects/${project.id}.json is still the placeholder — paste your real sheet ID.`
    );
    e.vptKind = 'placeholder';
    throw e;
  }

  const keyFile = resolveKeyFor(project);
  if (!keyExistsAt(keyFile)) {
    // Name the key THIS project wanted. When a project overrides the default,
    // "no key found" pointing at the default path would send the user hunting
    // in the wrong place.
    const e = new Error(
      project.keyFile
        ? `Service-account key not found at ${keyFile} (projects/${project.id}.json sets keyFile: "${project.keyFile}")`
        : `Service-account key not found at ${keyFile}`
    );
    e.vptKind = 'no_key';
    e.keyFile = keyFile;
    throw e;
  }

  return keyFile;
}

/** An authenticated client for a project, or a throw explaining why not. */
async function connect(project) {
  return authorize(assertUsable(project));
}

/**
 * One batchGet for both ranges — a single round trip instead of two.
 * Returns { tracker, kn } as raw list-of-lists. Throws on any failure.
 */
async function fetchRanges(sheets, project) {
  const ranges = [project.trackerRange];
  if (project.knRange) ranges.push(project.knRange);

  const res = await sheets.spreadsheets.values.batchGet(
    { spreadsheetId: project.spreadsheetId, ranges },
    { timeout: FETCH_TIMEOUT_MS }
  );

  const ranged = res.data.valueRanges || [];
  return {
    tracker: ranged[0]?.values || [],
    kn: project.knRange ? ranged[1]?.values || [] : [],
  };
}

/** Read one cell, live. Throws on failure. Used as the pre-write stale check. */
export async function readCell(project, a1) {
  const sheets = await connect(project);
  const res = await withTimeout(
    sheets.spreadsheets.values.get(
      { spreadsheetId: project.spreadsheetId, range: a1 },
      { timeout: FETCH_TIMEOUT_MS }
    ),
    FETCH_TIMEOUT_MS,
    'Google Sheets cell read'
  );
  return norm(res.data.values?.[0]?.[0]);
}

/**
 * Write exactly one cell. RAW so the sheet stores the literal string rather
 * than trying to interpret it as a formula or a date.
 */
export async function writeCell(project, a1, value) {
  const sheets = await connect(project);
  await withTimeout(
    sheets.spreadsheets.values.update(
      {
        spreadsheetId: project.spreadsheetId,
        range: a1,
        valueInputOption: 'RAW',
        requestBody: { values: [[value]] },
      },
      { timeout: FETCH_TIMEOUT_MS }
    ),
    FETCH_TIMEOUT_MS,
    'Google Sheets cell write'
  );
}

/**
 * Live sheet wins; on ANY failure fall back to the cached copy; if there is no
 * cache either, return empty with source 'none' and a message explaining why.
 *
 * @returns {Promise<{tracker: any[][], kn: any[][], source: 'live'|'cache'|'none',
 *                    cachedAt: string|null, message: string|null}>}
 */
export async function loadProjectData(project) {
  const started = Date.now();
  // Resolved up front so the failure paths can name the right key even when
  // assertUsable is what threw.
  const keyFile = resolveKeyFor(project);
  let failure = null;
  let kind = null;

  try {
    const sheets = await connect(project);
    const values = await withTimeout(fetchRanges(sheets, project), FETCH_TIMEOUT_MS, 'Google Sheets fetch');

    writeCache(project.id, values);
    return { ...values, source: 'live', cachedAt: null, message: null, failureKind: null, hint: null };
  } catch (err) {
    failure = err.message || String(err);
    kind = classifyFailure(err);
    // A failed client is not reusable — force a rebuild on the next attempt.
    // Only THIS key's client is dropped; other projects keep theirs.
    dropClient(keyFile);
    console.warn(
      `[vpt] live fetch failed for "${project.id}" after ${Date.now() - started}ms (${kind}): ${failure}`
    );
  }

  const hint = failureHint(kind, keyFile);
  const cached = readCache(project.id);

  if (cached) {
    return {
      tracker: cached.tracker,
      kn: cached.kn,
      source: 'cache',
      cachedAt: cached.cachedAt,
      message: `Showing the last good pull. Live fetch failed: ${failure}`,
      failureKind: kind,
      hint,
    };
  }

  return {
    tracker: [],
    kn: [],
    source: 'none',
    cachedAt: null,
    message: `${failure} (and no cache at ${cacheFile(project.id)})`,
    failureKind: kind,
    hint,
  };
}
