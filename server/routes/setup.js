// routes/setup.js — onboarding help.
//
// Nothing here touches Google, and nothing here is a gate: VPT has no login.
// These routes exist so the UI can tell a new user exactly where to put their
// key and hand them a sheet that will parse on the first connect.

import fs from 'node:fs';
import path from 'node:path';

import express from 'express';

import { revealHome, setupInfo, TEMPLATES_DIR, VPT_HOME } from '../paths.js';

export const setupRoutes = express.Router();

// Download name -> the file shipped in templates/. A closed map, so the route
// below can never be talked into serving an arbitrary path.
const TEMPLATES = {
  tracker: 'VPT_Tracker_Template.csv',
  kn: 'VPT_KN_Template.csv',
};

const templateExists = (name) => {
  try {
    return Boolean(TEMPLATES[name]) && fs.existsSync(path.join(TEMPLATES_DIR, TEMPLATES[name]));
  } catch {
    return false;
  }
};

/**
 * GET /api/setup — where VPT looked for the key, and whether it found one.
 *
 * The UI needs the RESOLVED path (which depends on this machine's home dir and
 * on VPT_SERVICE_ACCOUNT / VPT_HOME), so it cannot be hardcoded in the bundle.
 */
setupRoutes.get('/setup', (_req, res) => {
  res.json({
    ok: true,
    ...setupInfo(),
    templates: Object.keys(TEMPLATES).filter(templateExists),
  });
});

/**
 * POST /api/setup/reveal — open VPT's folder in the system file manager.
 *
 * The "drop your key here" step is the one place a path on screen isn't much
 * help: people need the folder open. Takes no parameters — the path is computed
 * server-side, so this can only ever open VPT_HOME.
 */
setupRoutes.post('/setup/reveal', async (_req, res) => {
  const result = await revealHome();
  if (!result.ok) {
    console.warn(`[vpt] could not open ${VPT_HOME}: ${result.error}`);
  }
  res.json({ ...result, path: VPT_HOME });
});

/**
 * GET /api/template/tracker.csv · /api/template/kn.csv
 *
 * Serves the CSVs from templates/ as downloads, identically in dev (Vite
 * proxies /api) and serve mode. A missing file is a clear JSON message rather
 * than a crash or an empty download — a copy of the repo may legitimately not
 * have them, and the headers are documented in the setup guide either way.
 */
function sendTemplate(name) {
  return (_req, res) => {
    const file = TEMPLATES[name];
    const full = path.join(TEMPLATES_DIR, file);

    if (!templateExists(name)) {
      return res.status(404).json({
        ok: false,
        reason: 'template_missing',
        error:
          `templates/${file} is not in this copy of the repo, so there is nothing to download. ` +
          'You can still build the sheet by hand — the setup guide lists the exact headers.',
      });
    }

    res.type('text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    res.sendFile(full, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ ok: false, reason: 'template_unreadable', error: err.message });
      }
    });
  };
}

setupRoutes.get('/template/tracker.csv', sendTemplate('tracker'));
setupRoutes.get('/template/kn.csv', sendTemplate('kn'));
