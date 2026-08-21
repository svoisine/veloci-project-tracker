// http/ui.js — serving the built frontend (serve mode only).
//
// Two run modes:
//   dev    `npm run dev`   — Vite owns the UI and proxies /api here.
//   serve  `npm start`     — this process ALSO serves the built dist/, so daily
//                            use is one process on one port.
// The API is identical in both; only who serves the HTML differs. Everything in
// this file is inert in dev mode.

import fs from 'node:fs';
import path from 'node:path';

import express from 'express';

import { REPO_ROOT } from '../paths.js';

export const DIST_DIR = path.join(REPO_ROOT, 'dist');

export function distExists() {
  try {
    return fs.existsSync(path.join(DIST_DIR, 'index.html'));
  } catch {
    return false;
  }
}

/**
 * Register static + SPA handling. Must be called AFTER every /api route so
 * nothing here can shadow the API.
 */
export function serveUI(app) {
  // Hashed asset filenames can be cached hard; index.html must not be, or a
  // rebuild leaves the browser on the old bundle.
  app.use(
    express.static(DIST_DIR, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    })
  );

  // Single-page app: any non-/api GET returns index.html. VPT has no routes
  // today, but this keeps a bookmarked deep link from 404ing if it ever gains any.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    if (!distExists()) {
      return res
        .status(503)
        .type('html')
        .send(
          '<h1>VPT is not built yet</h1><p>Run <code>npm run build</code> (or <code>npm start</code>, which builds first).</p>'
        );
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}
