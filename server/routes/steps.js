// routes/steps.js — POST /api/step: write one cell back to the sheet.
//
// This is the only route in VPT that MODIFIES the user's Google Sheet, which is
// why it gets a file to itself: the validation gate and the stale check are the
// two things standing between a stray request and someone's data.
//
// Always 200 with valid JSON — the UI is never handed a 500.

import express from 'express';

import { buildBrief } from '../brief/index.js';
import { loadProject } from '../config/index.js';
import { bodyOf, fail, resolveProjectId } from '../http/respond.js';
import { loadProjectData, readCell, resolveCell, patchCache, writeCell } from '../sheets/index.js';
import { BLOCKED_BY_MAX, EDITABLE_FIELDS, NOTES_MAX, STATUS_VALUES } from '../../shared/contract.js';

export const stepRoutes = express.Router();

const EDITABLE = new Set(EDITABLE_FIELDS);
const STATUSES = new Set(STATUS_VALUES);

/** Status is normalised so an empty cell and "todo" compare equal. */
function normalizeFor(field, v) {
  const s = (v === undefined || v === null ? '' : String(v)).trim();
  return field === 'status' ? s.toLowerCase() || 'todo' : s;
}

/**
 * Everything that can be refused without touching the network.
 * @returns {{ error: object } | { value: string }}
 */
function validate({ id, field, rawValue }) {
  if (!id) return { error: fail('bad_request', 'Missing step id.') };

  if (!EDITABLE.has(field)) {
    return {
      error: fail('bad_field', `Field "${field}" is not editable. Allowed: ${EDITABLE_FIELDS.join(', ')}.`),
    };
  }

  if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
    return { error: fail('bad_value', 'Value must be a string.') };
  }

  const value = String(rawValue);

  if (field === 'status' && !STATUSES.has(value.trim().toLowerCase())) {
    return {
      error: fail('bad_value', `Status must be one of: ${STATUS_VALUES.join(', ')}. Got "${value}".`),
    };
  }
  if (field === 'notes' && value.length > NOTES_MAX) {
    return {
      error: fail('bad_value', `Notes are capped at ${NOTES_MAX} characters (got ${value.length}).`),
    };
  }
  if (field === 'blocked_by' && value.length > BLOCKED_BY_MAX) {
    return { error: fail('bad_value', `blocked_by is capped at ${BLOCKED_BY_MAX} characters.`) };
  }

  return { value };
}

/**
 * Body: { project, id, field, value, expectedRowVersion }
 *
 * `expectedRowVersion` is what the client last saw in THAT cell. Immediately
 * before writing we re-read the cell; if it no longer matches, someone else
 * changed it and we refuse rather than clobber (reason: 'stale').
 */
stepRoutes.post('/step', async (req, res) => {
  const body = bodyOf(req);
  const projectId = resolveProjectId(body.project);
  const id = String(body.id ?? '').trim();
  const field = String(body.field ?? '').trim();

  // ---- validate before touching the network -------------------------------
  let project;
  try {
    project = loadProject(projectId);
  } catch (err) {
    return res.json(fail('bad_request', `Could not load project config: ${err.message}`));
  }

  const checked = validate({ id, field, rawValue: body.value ?? '' });
  if (checked.error) return res.json(checked.error);
  const { value } = checked;

  // ---- do the write -------------------------------------------------------
  try {
    // Writes require live data: we must not locate a row using a stale cache.
    const data = await loadProjectData(project);
    if (data.source !== 'live') {
      return res.json(
        fail('offline', `Can't save while offline (${data.source}). ${data.message || ''}`.trim(), {
          brief: buildBrief(project, data),
        })
      );
    }

    let target;
    try {
      target = resolveCell(project, data.tracker, id, field);
    } catch (err) {
      return res.json(fail('not_found', err.message, { brief: buildBrief(project, data) }));
    }

    // Pre-write re-read: the tightest window we can get without a full
    // optimistic-concurrency system (explicitly out of scope per the spec).
    const current = await readCell(project, target.a1);

    const expected = normalizeFor(field, body.expectedRowVersion ?? '');
    const currentNorm = normalizeFor(field, current);
    const valueNorm = normalizeFor(field, value);

    if (expected !== currentNorm) {
      return res.json(
        fail(
          'stale',
          `${id}.${field} changed in the sheet since this page loaded ` +
            `(sheet now has "${current || '(empty)'}", this page expected "${body.expectedRowVersion || '(empty)'}"). ` +
            `Refreshed instead of overwriting.`,
          {
            brief: buildBrief(project, data),
            // M3 Part B: hand back the value we actually found, so the client can
            // retry with a correct expectedRowVersion instead of re-reading blind.
            // For notes this is what lets "Save again" deliberately overwrite
            // without the user having to retype anything.
            id,
            field,
            currentValue: current,
          }
        )
      );
    }

    // No-op: don't spend an API call rewriting the same value.
    if (currentNorm === valueNorm) {
      return res.json({
        ok: true,
        noop: true,
        updatedStep: { id, field, value },
        brief: buildBrief(project, data),
      });
    }

    await writeCell(project, target.a1, value);

    // Cache coherence: reflect the change even if the re-read below fails.
    patchCache(project.id, target.rowIdx, target.colIdx, value);

    // Recompute from sheet truth so the client never keeps its optimistic guess.
    const after = await loadProjectData(project);
    return res.json({
      ok: true,
      cell: target.a1,
      updatedStep: { id, field, value },
      brief: buildBrief(project, after),
    });
  } catch (err) {
    console.error(`[vpt] write failed for ${id}.${field}:`, err.message);
    return res.json(fail('write_failed', err.message || String(err)));
  }
});
