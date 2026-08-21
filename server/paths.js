// paths.js — where VPT keeps things on THIS machine, in one place.
//
// Every filesystem location outside the repo is resolved here so nothing else
// has to know about home directories, env overrides, or the fact that the
// service-account key is the one file VPT will never create for you.
//
// Defaults (nothing to configure):
//   ~/.vpt/                        base dir, created on startup if missing
//   ~/.vpt/service_account.json    the Google service-account key  (YOU supply)
//   ~/.vpt/vpt_cache_<id>.json     last-good-pull cache, one per project
//
// Overrides:
//   VPT_HOME=/some/dir                    move the base dir (caches follow it)
//   VPT_SERVICE_ACCOUNT=/path/key.json    point at a key anywhere on disk
//
// The key is a Google-issued secret. VPT reads it, reports where it looked,
// and never writes, generates or fabricates one.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const env = (name) => {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
};

// ------------------------------------------------------- inside the repo

// Directories that ship WITH VPT rather than belonging to the machine. They
// live here for the same reason as everything else in this file: so no other
// module has to work out where it is relative to the repo root.
export const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROJECTS_DIR = path.join(REPO_ROOT, 'projects');
export const TEMPLATES_DIR = path.join(REPO_ROOT, 'templates');

// ------------------------------------------------------------------ the paths

const HOME_OVERRIDE = env('VPT_HOME');
const KEY_OVERRIDE = env('VPT_SERVICE_ACCOUNT');

/** Base dir for everything VPT stores outside the repo. */
export const VPT_HOME = HOME_OVERRIDE || path.join(os.homedir(), '.vpt');
export const HOME_SOURCE = HOME_OVERRIDE ? 'env' : 'default';

/** The service-account key VPT will try to read. Never created by VPT. */
export const KEY_FILE = KEY_OVERRIDE || path.join(VPT_HOME, 'service_account.json');
export const KEY_SOURCE = KEY_OVERRIDE ? 'env' : 'default';

/** One cache file per project, always under VPT_HOME. */
export function cacheFile(projectId) {
  return path.join(VPT_HOME, `vpt_cache_${projectId}.json`);
}

// The two ports live here so server/index.js and vite.config.js agree without
// either one hardcoding a number. The FRONTEND never sees these: it calls /api
// relatively, on whatever origin it was served from.
/** The backend (Express) port. */
export const PORT = Number(env('VPT_PORT') || env('PORT') || 5177);
/** The Vite dev-server port — dev mode only; irrelevant to `npm start`. */
export const VITE_PORT = Number(env('VPT_UI_PORT') || 5173);

// --------------------------------------------------------------- the base dir

/**
 * Create VPT_HOME if it isn't there. The DIRECTORY only — never the key.
 * Returns { created, error } and never throws: a home dir we cannot make is a
 * reason to warn, not a reason for the server to refuse to boot.
 */
export function ensureHome() {
  try {
    // existsSync is not enough: if a FILE sits at this path, mkdir is impossible
    // and every later cache write fails silently. Check the type, not presence.
    if (fs.existsSync(VPT_HOME)) {
      return fs.statSync(VPT_HOME).isDirectory()
        ? { created: false, error: null }
        : { created: false, error: `${VPT_HOME} exists but is a file, not a directory` };
    }
    fs.mkdirSync(VPT_HOME, { recursive: true });
    return { created: true, error: null };
  } catch (err) {
    return { created: false, error: err.message };
  }
}

export function keyExistsAt(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

/** Is the DEFAULT key in place? The onboarding question, not a per-project one. */
export function keyFileExists() {
  return keyExistsAt(KEY_FILE);
}

/**
 * Which key does this project authenticate with?
 *
 * Almost always the default: ONE service account can be shared onto any number
 * of sheets, so a second key is not needed for a second project. The optional
 * per-project `keyFile` exists for the case the default genuinely cannot cover
 * — most often a sheet in a Google Workspace whose admin blocks sharing to an
 * outside service account, so the key has to come from inside that org.
 *
 * Deliberately a hand-edited config field rather than a form field: surfacing
 * it during Add Project would make every new user read a question that does not
 * apply to them.
 *
 * A bare filename resolves inside VPT_HOME; an absolute path is used as given.
 */
export function resolveKeyFor(project) {
  const custom = String(project?.keyFile ?? '').trim();
  if (!custom) return KEY_FILE;
  return path.isAbsolute(custom) ? custom : path.join(VPT_HOME, custom);
}

// ------------------------------------------------------------ legacy leftovers
//
// Earlier VPT builds kept the key and the caches in a differently-named dot
// directory under $HOME. Rather than hardcode one previous name — which would
// only ever help whoever used that exact name — look for the SHAPE: any
// dot-directory in $HOME (other than ours) holding a service_account.json or
// vpt_cache_*.json.
//
// Read-only, startup-only, one level deep. VPT reports what it finds and moves
// nothing: files outside VPT_HOME are not ours to touch.

const CACHE_FILE_RE = /^vpt_cache_.+\.json$/i;
const MAX_DIRS_SCANNED = 300;

/**
 * @returns {{ keyDirs: string[], cacheDirs: {dir: string, count: number}[] }}
 */
export function findLegacyLocations() {
  const found = { keyDirs: [], cacheDirs: [] };

  let entries;
  try {
    entries = fs.readdirSync(os.homedir(), { withFileTypes: true });
  } catch {
    return found; // unreadable home dir — nothing to report, nothing broken
  }

  let scanned = 0;
  for (const entry of entries) {
    if (scanned >= MAX_DIRS_SCANNED) break;
    if (!entry.isDirectory() || !entry.name.startsWith('.')) continue;

    const dir = path.join(os.homedir(), entry.name);
    if (path.resolve(dir) === path.resolve(VPT_HOME)) continue;

    let names;
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue; // permissions, junctions, whatever — skip it silently
    }
    scanned += 1;

    if (names.includes('service_account.json')) found.keyDirs.push(dir);

    const caches = names.filter((n) => CACHE_FILE_RE.test(n)).length;
    if (caches > 0) found.cacheDirs.push({ dir, count: caches });
  }

  return found;
}

// ----------------------------------------------------------- reveal in the OS
//
// A browser tab cannot open a file manager: `file://` links are blocked from an
// http:// page, and nothing in the web platform reveals a folder. VPT's backend
// runs on this machine, though, so it can — which is the whole reason the
// backend exists in the first place.
//
// The path is NEVER taken from the request. It is computed here, so there is no
// argument a caller could supply that would make this open something else.

const REVEAL_COMMANDS = {
  win32: 'explorer.exe',
  darwin: 'open',
};

/**
 * Open VPT_HOME in the system file manager. Returns { ok, reason?, error? }
 * and never throws — a file manager that will not launch is a nuisance, not a
 * failure of the app.
 */
export async function revealHome() {
  const home = ensureHome();
  if (home.error) return { ok: false, reason: 'no_home', error: home.error };

  const command = REVEAL_COMMANDS[process.platform] || 'xdg-open';

  try {
    const { spawn } = await import('node:child_process');
    // detached + unref so VPT never waits on, or is held open by, the file
    // manager. shell:false, and the only argument is our own computed path.
    const child = spawn(command, [VPT_HOME], { detached: true, stdio: 'ignore', shell: false });
    child.on('error', () => {
      /* handled by the caller's fallback — do not crash the server */
    });
    child.unref();
    // Note: explorer.exe exits non-zero even when it succeeds, so the exit code
    // is deliberately not consulted.
    return { ok: true, path: VPT_HOME };
  } catch (err) {
    return { ok: false, reason: 'spawn_failed', error: err.message };
  }
}

/** Everything the UI needs to explain where the key should go. */
export function setupInfo() {
  return {
    vptHome: VPT_HOME,
    homeSource: HOME_SOURCE,
    keyFile: KEY_FILE,
    keySource: KEY_SOURCE,
    keyPresent: keyFileExists(),
    platform: process.platform,
  };
}
