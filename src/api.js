// api.js — one way to call the backend.
//
// Eleven call sites had eleven slightly different spellings of fetch → res.json
// → hope. They disagreed on the details that matter: some checked res.ok, some
// didn't; some would throw on a non-JSON body, some would hand a component
// `undefined` and let it fail during render.
//
// The rules here, once:
//   · every /api response is expected to be a JSON OBJECT
//   · a transport failure and a non-JSON body both become { ok:false, reason }
//     rather than a throw, because every caller wants to render the message
//   · the server's own { ok:false, reason, error } envelope is passed through
//     untouched — it is more specific than anything this layer could invent
//
// So a caller only ever has to look at `ok`.

/** The shape everything here resolves to on a failure this layer detected. */
const failure = (reason, error) => ({ ok: false, reason, error });

/**
 * @param {string} path  e.g. `/api/projects`
 * @param {object} [options]  method, body (an object — it is serialised here)
 * @returns {Promise<object>} always an object, never a throw
 */
export async function request(path, { method = 'GET', body } = {}) {
  const init = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, init);
  } catch (err) {
    // Almost always "the backend isn't running" — the one failure the UI has a
    // specific, actionable message for.
    return failure('unreachable', err.message || String(err));
  }

  let json;
  try {
    json = await res.json();
  } catch {
    return failure('bad_response', `The backend returned a response VPT could not read (HTTP ${res.status}).`);
  }

  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return failure('bad_response', 'The backend sent a response VPT could not read.');
  }

  // A JSON body with an explicit ok:false is the server's own answer; trust it.
  // A non-2xx WITHOUT one still has to become a failure the caller can render.
  if (!res.ok && json.ok === undefined) {
    return failure('http_error', `The backend returned ${res.status}.`);
  }

  return json;
}

export const get = (path) => request(path);
export const post = (path, body) => request(path, { method: 'POST', body });
export const patch = (path, body) => request(path, { method: 'PATCH', body });
export const del = (path) => request(path, { method: 'DELETE' });

/** Project ids go into the path, so they are always encoded. */
export const projectPath = (id, suffix = '') => `/api/projects/${encodeURIComponent(id)}${suffix}`;
export const briefPath = (id) => `/api/brief?project=${encodeURIComponent(id)}`;
export const notesPath = (id) => `/api/notes?project=${encodeURIComponent(id)}`;
export const notesSeenPath = (id) => `/api/notes/seen?project=${encodeURIComponent(id)}`;
