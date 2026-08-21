// routes/health.js — GET /api/health
//
// The launcher polls this before opening a browser, so it must stay cheap and
// must never depend on Google being reachable.

import express from 'express';

import { listProjects } from '../config/index.js';
import { distExists } from '../http/ui.js';
import { SERVE_MODE } from '../mode.js';
import { keyFileExists } from '../paths.js';

export const healthRoutes = express.Router();

healthRoutes.get('/health', (_req, res) => {
  res.json({
    ok: true,
    mode: SERVE_MODE ? 'serve' : 'dev',
    ui: SERVE_MODE ? (distExists() ? 'built' : 'missing-dist') : 'vite',
    keyFile: keyFileExists() ? 'present' : 'missing',
    projects: listProjects().length,
  });
});
