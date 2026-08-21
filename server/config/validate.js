// config/validate.js — everything that says "no" before a config is written.
//
// Separated from the store so the rules can be read (and changed) without
// scrolling past file I/O, and so the create and patch paths cannot drift apart
// on what they accept. Every function here either returns a CLEAN COPY of its
// input or throws a ConfigError — nothing validates in place.
//
// The limits themselves live in shared/contract.js, because the browser form
// has to know the same numbers to say no at the field.

import {
  isRealDate,
  LABEL_MAX,
  MAX_MILESTONES,
  MAX_WEEKS,
  NAME_MAX,
  isSafeId,
  WEEK_KEY,
} from '../../shared/contract.js';

/**
 * A ConfigError carries a machine-readable `reason` so the route layer can
 * hand the UI something to branch on instead of parsing message text.
 */
export class ConfigError extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}

/** Shared field validation for create and patch. Throws ConfigError. */
export function validateName(name) {
  // Without this an object stringifies to the literal "[object Object]", which
  // is non-empty and under the cap, so it would sail through as a project name.
  if (name !== undefined && name !== null && typeof name !== 'string' && typeof name !== 'number') {
    throw new ConfigError('bad_name', 'Project name must be text.');
  }
  const clean = String(name ?? '').trim();
  if (!clean) throw new ConfigError('bad_name', 'Project name is required.');
  if (clean.length > NAME_MAX) {
    throw new ConfigError('bad_name', `Project name is capped at ${NAME_MAX} characters.`);
  }
  return clean;
}

/**
 * An unsafe id is never merely "missing" — say so, rather than letting a
 * traversal attempt masquerade as a typo. (It was already refused either way;
 * this only makes the reason honest.)
 */
export function assertAddressable(id) {
  if (!isSafeId(id)) {
    throw new ConfigError('bad_id', `Invalid project id: "${id}".`);
  }
}

/**
 * M4: validate a milestones array. Returns a clean copy — anything the caller
 * sent beyond {date,label} is dropped rather than persisted.
 */
export function validateMilestones(input) {
  if (!Array.isArray(input)) {
    throw new ConfigError('bad_milestones', 'milestones must be an array.');
  }
  if (input.length > MAX_MILESTONES) {
    throw new ConfigError('bad_milestones', `Too many milestones (max ${MAX_MILESTONES}).`);
  }

  return input.map((m, i) => {
    const where = `milestone ${i + 1}`;
    if (!m || typeof m !== 'object' || Array.isArray(m)) {
      throw new ConfigError('bad_milestones', `${where}: expected an object with date and label.`);
    }
    const date = String(m.date ?? '').trim();
    const label = String(m.label ?? '').trim();

    if (!isRealDate(date)) {
      throw new ConfigError('bad_milestones', `${where}: "${date || '(empty)'}" is not a valid YYYY-MM-DD date.`);
    }
    if (!label) throw new ConfigError('bad_milestones', `${where}: label cannot be empty.`);
    if (label.length > LABEL_MAX) {
      throw new ConfigError('bad_milestones', `${where}: label is capped at ${LABEL_MAX} characters.`);
    }
    return { date, label };
  });
}

/** M4: validate a weekStarts map of `W<n>` -> `YYYY-MM-DD`. Returns a clean copy. */
export function validateWeekStarts(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ConfigError('bad_week_starts', 'weekStarts must be an object of "W1": "YYYY-MM-DD" pairs.');
  }

  const keys = Object.keys(input);
  if (keys.length > MAX_WEEKS) {
    throw new ConfigError('bad_week_starts', `Too many weeks (max ${MAX_WEEKS}).`);
  }

  const out = {};
  for (const key of keys) {
    if (!WEEK_KEY.test(key)) {
      throw new ConfigError('bad_week_starts', `"${key}" is not a valid week key — expected W0, W1, W2 …`);
    }
    const date = String(input[key] ?? '').trim();
    if (!isRealDate(date)) {
      throw new ConfigError('bad_week_starts', `${key}: "${date || '(empty)'}" is not a valid YYYY-MM-DD date.`);
    }
    out[key] = date;
  }

  // Store in week order so a hand-read of the file makes sense.
  return Object.fromEntries(Object.entries(out).sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1))));
}
