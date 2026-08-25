// index.js — the tiny local backend behind VPT.
//
// Runs on this machine only (no hosting, no login). It exists because a browser
// tab can't safely hold a Google service-account key: the key stays here, the
// frontend just asks for /api/brief and posts to /api/step.
//
// This file is now only the PROCESS: start listening, survive stray errors, say
// what happened. Everything else has a home of its own —
//
//   app.js          the routing table
//   routes/         one file per endpoint group
//   http/           JSON envelopes, error handlers, serving the built UI
//   brief/          the briefing computation (pure)
//   notes/          the notes feed diff (pure) + its local snapshot file
//   config/         projects/<id>.json — the registry
//   sheets/         the only code that talks to Google
//   google/         auth and failure classification
//   paths.js        every filesystem location, resolved once
//   startup/        the boot banner
//   mode.js         dev vs serve
//
// Both ports come from server/paths.js (PORT / VITE_PORT), never a literal here.

import { createApp } from './app.js';
import { PORT } from './paths.js';
import { warmUp } from './sheets/index.js';
import { banner, reportListenError } from './startup/banner.js';

// Since Node 15 an unhandled promise rejection TERMINATES the process by
// default. For a dashboard someone leaves open all day, one stray rejection
// anywhere would mean the app silently vanishes mid-use. Log loudly and keep
// serving — every request path already degrades on its own.
process.on('unhandledRejection', (reason) => {
  console.error('[vpt] unhandled promise rejection (this is a bug, but VPT keeps running):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[vpt] uncaught exception (this is a bug, but VPT keeps running):', err);
});

const server = createApp().listen(PORT, () => {
  banner();
  // Build the Google client now rather than on the first request, so the
  // request path only ever spends its short timeout on the network itself.
  warmUp();
});

server.on('error', (err) => {
  reportListenError(err);
  process.exit(1);
});
