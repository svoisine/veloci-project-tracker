// setup.js — "where does my key go?", answered by the machine VPT runs on.
//
// The path depends on the user's home directory and on VPT_HOME /
// VPT_SERVICE_ACCOUNT, so it can't be baked into the bundle — the backend
// resolves it and GET /api/setup reports it.
//
// This is help text, not an auth check. Nothing here gates the app: VPT has no
// login, and every view renders whether or not a key exists.

import { useEffect, useState } from 'react';

import { get } from './api.js';

// One fetch per page load, shared by every component that asks. The answer
// only changes when the server restarts.
let cached = null;
let inflight = null;

function fetchSetup() {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = get('/api/setup')
      .then((json) => {
        cached = json.ok ? json : { ok: false };
        return cached;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Forget the cached answer — used after the user says "I've added the key". */
export function refreshSetup() {
  cached = null;
  return fetchSetup();
}

/**
 * @returns {{ok?: boolean, keyFile?: string, keySource?: string, vptHome?: string,
 *             keyPresent?: boolean, platform?: string, templates?: string[]} | null}
 * null while the first fetch is in flight.
 */
export function useSetup() {
  const [setup, setSetup] = useState(cached);

  useEffect(() => {
    let alive = true;
    fetchSetup().then((s) => {
      if (alive) setSetup(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return setup;
}

/** The path to show when the backend hasn't answered (yet, or at all). */
export function keyPathFor(setup) {
  if (setup?.keyFile) return setup.keyFile;
  return setup?.platform === 'win32'
    ? '%USERPROFILE%\\.vpt\\service_account.json'
    : '~/.vpt/service_account.json';
}
