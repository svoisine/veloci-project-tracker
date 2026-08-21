// sheets/cache.js — the last-good-pull cache, one JSON file per project.
//
// This is what makes the dashboard render with no network. It is deliberately
// dumb: whole-file read, whole-file write, no locking, no expiry. A cache we
// cannot read or write is never fatal — every function here degrades to
// "no cache" rather than throwing into a request.

import fs from 'node:fs';

import { cacheFile, VPT_HOME } from '../paths.js';

export function writeCache(projectId, payload) {
  try {
    fs.mkdirSync(VPT_HOME, { recursive: true });
    fs.writeFileSync(
      cacheFile(projectId),
      JSON.stringify({ ...payload, cachedAt: new Date().toISOString() }, null, 2),
      'utf8'
    );
  } catch (err) {
    // A cache we cannot write is a smaller problem than a dashboard that dies.
    console.warn(`[vpt] could not write cache for "${projectId}": ${err.message}`);
  }
}

/**
 * The last good pull for a project, straight off disk, or null. Also used by
 * the hub to show a progress snapshot per card without doing any network I/O.
 */
export function readCache(projectId) {
  try {
    const parsed = JSON.parse(fs.readFileSync(cacheFile(projectId), 'utf8'));
    return {
      tracker: Array.isArray(parsed.tracker) ? parsed.tracker : [],
      kn: Array.isArray(parsed.kn) ? parsed.kn : [],
      cachedAt: parsed.cachedAt || null,
    };
  } catch {
    return null;
  }
}

/**
 * Cache coherence after a write: patch the one cell in the cached copy so an
 * immediately-following offline load reflects the change. Keeps the original
 * cachedAt — we confirmed one cell, we did not re-pull the sheet.
 */
export function patchCache(projectId, rowIdx, colIdx, value) {
  try {
    const cached = readCache(projectId);
    if (!cached) return;

    const rows = cached.tracker;
    if (!Array.isArray(rows[rowIdx])) return;

    while (rows[rowIdx].length <= colIdx) rows[rowIdx].push('');
    rows[rowIdx][colIdx] = value;

    fs.writeFileSync(
      cacheFile(projectId),
      JSON.stringify({ tracker: rows, kn: cached.kn, cachedAt: cached.cachedAt }, null, 2),
      'utf8'
    );
  } catch (err) {
    console.warn(`[vpt] could not patch cache for "${projectId}": ${err.message}`);
  }
}
