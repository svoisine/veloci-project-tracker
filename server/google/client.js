// google/client.js — building (and reusing) an authenticated Sheets client.
//
// Split out from the sheets module because this is the part that owns CREDENTIALS
// and time budgets, not spreadsheets. Nothing here knows what a tracker row is.

import fs from 'node:fs';
import { google } from 'googleapis';

import { KEY_FILE, keyFileExists } from '../paths.js';

// M2: read/write. M1 used `spreadsheets.readonly`; writing a cell requires the
// full spreadsheets scope, so the service account can now MODIFY this sheet.
export const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Budget for the actual network round trip. Kept short: the dashboard must
// never sit spinning on a dead network.
export const FETCH_TIMEOUT_MS = 6000;

// Separate, more generous budget for building the client. `googleapis` is a
// very large package and its first load off disk can take seconds — that cost
// is paid once, at startup (see warmUp), not on the request path.
export const CLIENT_TIMEOUT_MS = 20000;

/** Reject after `ms` no matter what the wrapped promise is doing. */
export function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// One client per KEY, not one client overall. Almost every install has exactly
// one entry here (the default key); a project with its own `keyFile` gets its
// own entry rather than fighting over a single global client.
//
// Memoised as a promise so concurrent callers share one construction, and the
// entry is dropped on failure so a later request can retry — e.g. the key file
// appeared after the server started. Dropping is per key: one project's bad key
// must never evict a working client belonging to another project.
const clients = new Map();

/** Forget one key's client so the next attempt rebuilds it. */
export function dropClient(keyFile) {
  clients.delete(keyFile);
}

/**
 * A key file that exists but isn't a usable key produces terrible errors —
 * OpenSSL's "DECODER routines::unsupported", or (worse) a truncated key makes
 * GoogleAuth fall back to unregistered-caller mode, which surfaces as a
 * PERMISSION error and sends the user off to re-share their sheet when the
 * real problem is the file they downloaded.
 *
 * Checking the shape ourselves, once per key, turns all of that into one
 * accurate sentence. Cheap: it runs inside the memoised client build.
 */
function assertKeyUsable(keyFile) {
  const bad = (message) => {
    const e = new Error(message);
    e.vptKind = 'bad_key';
    return e;
  };

  let raw;
  try {
    raw = fs.readFileSync(keyFile, 'utf8');
  } catch (err) {
    throw bad(`Could not read the service-account key at ${keyFile}: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/^﻿/, ''));
  } catch {
    throw bad(`The service-account key at ${keyFile} is not valid JSON — it looks truncated or corrupted.`);
  }

  const missing = ['client_email', 'private_key'].filter((f) => !parsed?.[f]);
  if (missing.length) {
    throw bad(
      `The file at ${keyFile} is JSON but not a service-account key (missing ${missing.join(' and ')}). ` +
        'Make sure you downloaded the JSON key for a SERVICE ACCOUNT, not an OAuth client.'
    );
  }

  // Without this the PEM is decoded deep inside OpenSSL, which reports
  // "error:1E08010C:DECODER routines::unsupported" — true, and useless.
  if (!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(String(parsed.private_key))) {
    throw bad(`The private_key in ${keyFile} is not a PEM block — the file looks edited or corrupted.`);
  }
}

export function getSheetsClient(keyFile) {
  let pending = clients.get(keyFile);
  if (!pending) {
    pending = (async () => {
      assertKeyUsable(keyFile);
      const auth = new google.auth.GoogleAuth({ keyFile, scopes: SCOPES });
      const authClient = await auth.getClient();
      return google.sheets({ version: 'v4', auth: authClient });
    })().catch((err) => {
      clients.delete(keyFile);
      throw err;
    });
    clients.set(keyFile, pending);
  }
  return pending;
}

/** The client for `keyFile`, subject to the auth time budget. */
export function authorize(keyFile) {
  return withTimeout(getSheetsClient(keyFile), CLIENT_TIMEOUT_MS, 'Google auth');
}

/**
 * Pay the cold-load + auth cost at boot so the first dashboard request only
 * spends its 6s budget on the network. Never throws.
 */
export async function warmUp() {
  // The default key only. A project with its own key is rare enough that
  // building its client lazily, on first use, is the right trade.
  if (!keyFileExists()) return;
  const started = Date.now();
  try {
    await authorize(KEY_FILE);
    console.log(`  ✓  Google client ready (${Date.now() - started}ms)`);
  } catch (err) {
    console.warn(`  ⚠  Google client not ready: ${err.message}`);
  }
}
