// startup/banner.js — what VPT says when it starts.
//
// All of it is console output, which is exactly why it does not belong in the
// entry point: it is the longest part of startup and the part most often
// edited, and none of it affects whether the server works.
//
// The rule it follows: print RESOLVED paths, never the code that computes them.
// "put your key in ~/.vpt" is not actionable on a machine where VPT_HOME is set.

import path from 'node:path';

import { listProjects, PLACEHOLDER_SHEET_ID } from '../config/index.js';
import { distExists } from '../http/ui.js';
import { SERVE_MODE, UI_URL } from '../mode.js';
import {
  ensureHome,
  findLegacyLocations,
  HOME_SOURCE,
  KEY_FILE,
  KEY_SOURCE,
  keyFileExists,
  PORT,
  VPT_HOME,
} from '../paths.js';

/**
 * Say — out loud, with the RESOLVED path — where the key is expected and what
 * VPT found. Also flags leftovers from an earlier VPT layout.
 *
 * VPT creates its home DIRECTORY here. It never creates the key: that file is
 * issued by Google and only you can supply it.
 */
function reportKeyAndHome() {
  const home = ensureHome();
  if (home.error) {
    console.warn('');
    console.warn(`  ⚠  Could not create VPT's home directory ${VPT_HOME}: ${home.error}`);
    console.warn('     Caches will not be written. Set VPT_HOME to a writable directory.');
  } else if (home.created) {
    console.log(`      created ${VPT_HOME}  (VPT's home — put your key here)`);
  }

  const via = KEY_SOURCE === 'env' ? '  (via VPT_SERVICE_ACCOUNT)' : '';
  if (keyFileExists()) {
    console.log(`      key: ${KEY_FILE}${via}`);
  } else {
    console.warn('');
    console.warn(`  ⚠  Service-account key NOT found at: ${KEY_FILE}${via}`);
    console.warn('     VPT still runs — the app will show a setup guide, and the dashboard');
    console.warn('     falls back to cache or "no data" until a key is in place.');
  }

  if (HOME_SOURCE === 'env') console.log(`      home: ${VPT_HOME}  (via VPT_HOME)`);

  reportLegacy();
}

/**
 * Leftovers from an earlier VPT layout. Reported, never touched: files outside
 * VPT_HOME are not ours to move or delete.
 */
function reportLegacy() {
  const legacy = findLegacyLocations();

  if (!keyFileExists() && legacy.keyDirs.length) {
    console.warn('');
    console.warn('  ⚠  A service_account.json exists at an older location:');
    for (const dir of legacy.keyDirs) console.warn(`     · ${path.join(dir, 'service_account.json')}`);
    console.warn(`     VPT now reads ${KEY_FILE} — move (or copy) the key there.`);
    console.warn('     VPT will not move it for you and does not read the old path.');
  }

  const staleCaches = legacy.cacheDirs.filter((c) => c.count > 0);
  if (staleCaches.length) {
    const where = staleCaches.map((c) => `${c.dir} (${c.count})`).join(', ');
    console.log(`      note: stale vpt_cache_*.json left in ${where} — safe to delete; VPT now caches to ${VPT_HOME}`);
  }
}

/** M3: report every project, not just the original one. */
function reportProjects() {
  let projects = [];
  try {
    projects = listProjects();
  } catch (err) {
    console.warn(`  ⚠  Could not read the projects directory: ${err.message}`);
  }

  if (projects.length === 0) {
    console.warn('');
    console.warn(`  ⚠  No projects found in projects/. Add one from the hub (${UI_URL}).`);
    return;
  }

  console.log(`      ${projects.length} project${projects.length === 1 ? '' : 's'}:`);
  for (const p of projects) {
    const flag =
      p.status === 'broken' ? '✗ config unreadable' : p.status === 'needs-sheet-id' ? '⚠ needs sheet id' : '✓';
    console.log(`        ${flag}  ${p.id}${p.name && p.name !== p.id ? `  (${p.name})` : ''}`);
  }

  const needsId = projects.filter((p) => p.status === 'needs-sheet-id');
  if (needsId.length) {
    console.warn('');
    console.warn(`  ⚠  Still on the placeholder spreadsheetId ("${PLACEHOLDER_SHEET_ID}"):`);
    for (const p of needsId) console.warn(`     · projects/${p.id}.json`);
    console.warn('     Paste the real sheet ID (the part of the sheet URL between /d/ and /edit).');
  }
}

export function banner() {
  console.log('');
  console.log(`  🦖  Veloci Project Tracker — ${SERVE_MODE ? 'app (serve mode)' : 'backend (dev mode)'}`);
  if (SERVE_MODE) {
    console.log(`      open ${UI_URL}   ← UI + API, one process`);
  } else {
    console.log(`      API on http://localhost:${PORT}   ·   UI on ${UI_URL} (vite)`);
  }
  console.log('      scope: spreadsheets (READ/WRITE) — edits are saved to the sheet');

  if (SERVE_MODE && !distExists()) {
    console.warn('');
    console.warn('  ⚠  No build found in dist/ — the UI will not load.');
    console.warn('     Run `npm run build` (or use `npm start`, which builds first).');
  }

  reportKeyAndHome();
  reportProjects();

  console.log('');
}

/**
 * A port collision is the single most likely startup failure — usually VPT
 * itself, already running. Say that, and say what to do about it, instead of
 * printing a Node stack trace at someone who just double-clicked the launcher.
 */
export function reportListenError(err) {
  console.error('');
  if (err.code === 'EADDRINUSE') {
    console.error(`  ✗  Port ${PORT} is already in use.`);
    console.error('     VPT is probably already running — open http://localhost:' + PORT + ' first.');
    console.error('     To stop it:  stop-vpt.bat   (or kill whatever is listening on that port)');
    console.error(`     To use a different port:  set VPT_PORT=<other>  then start again.`);
  } else if (err.code === 'EACCES') {
    console.error(`  ✗  Not allowed to listen on port ${PORT}.`);
    console.error('     Ports below 1024 need elevated privileges — set VPT_PORT to something above 1024.');
  } else {
    console.error(`  ✗  Could not start the server on port ${PORT}: ${err.message}`);
  }
  console.error('');
}
