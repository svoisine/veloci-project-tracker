// app.js — how the Express app is put together.
//
// Read top to bottom this file IS the routing table, which is the point of
// keeping it separate from index.js (process concerns) and from routes/ (what
// each endpoint does).
//
// Order matters and is the only thing this file really encodes:
//   1. every /api route
//   2. the /api 404 and the /api error handler — after the routes, so they can
//      never shadow one, and before the SPA, so an unknown /api path is JSON
//      rather than index.html
//   3. the built UI (serve mode only)

import express from 'express';

import { apiError, apiNotFound } from './http/errors.js';
import { serveUI } from './http/ui.js';
import { SERVE_MODE } from './mode.js';
import { briefRoutes } from './routes/brief.js';
import { healthRoutes } from './routes/health.js';
import { notesRoutes } from './routes/notes.js';
import { projectRoutes } from './routes/projects.js';
import { setupRoutes } from './routes/setup.js';
import { stepRoutes } from './routes/steps.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  app.use('/api', briefRoutes);
  app.use('/api', stepRoutes);
  app.use('/api', notesRoutes);
  app.use('/api', projectRoutes);
  app.use('/api', setupRoutes);
  app.use('/api', healthRoutes);

  app.use('/api', apiNotFound);
  app.use('/api', apiError);

  if (SERVE_MODE) serveUI(app);

  return app;
}
