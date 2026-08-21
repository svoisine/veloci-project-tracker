// mode.js — which of VPT's two run modes this process is in.
//
// Read from argv exactly once, here, so the banner, the health route and the
// app assembly cannot disagree about it (they each used to re-derive it).

import { PORT, VITE_PORT } from './paths.js';

/**
 * `node server/index.js --serve` (npm run serve / npm start). Without it the
 * server is API-only and Vite serves the UI.
 */
export const SERVE_MODE = process.argv.includes('--serve');

/**
 * Where a human should point their browser. In serve mode that's this process;
 * in dev it's Vite, which proxies /api back here.
 */
export const UI_URL = SERVE_MODE ? `http://localhost:${PORT}` : `http://localhost:${VITE_PORT}`;
