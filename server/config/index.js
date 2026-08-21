// config/ — the project registry: projects/<id>.json on disk.
//
// One file per project, no database. This module is the public face of that
// registry; the rest of the server imports from here and never reaches into a
// sibling file directly, so the split below can be rearranged without touching
// a route.
//
//   store.js      read one / list all, and the atomic write
//   mutations.js  create, patch, delete
//   validate.js   ConfigError and every rule that says no
//   schedule.js   the W1..Wn generator
//
// Everything under config/ is local-filesystem only. Nothing here holds a
// Sheets client, so no function in this module can reach the user's Google
// Sheet — deleting a project removes files on THIS machine and nothing else.

export { ConfigError, validateMilestones, validateWeekStarts } from './validate.js';
export {
  hasPlaceholderSheetId,
  listProjects,
  loadProject,
  projectExists,
  PROJECTS_DIR,
} from './store.js';
export { createProject, deleteProject, patchProject } from './mutations.js';
export { generateWeekStarts } from './schedule.js';

// Re-exported from the shared contract so callers keep importing "the rules
// about projects" from the project module, while shared/contract.js stays the
// single place the browser and the server agree on them.
export {
  DEFAULT_KN_RANGE,
  DEFAULT_TRACKER_RANGE,
  isSafeId,
  normalizeSheetId,
  PLACEHOLDER_SHEET_ID,
} from '../../shared/contract.js';
