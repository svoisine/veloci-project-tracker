// dashboard/useBrief.js — everything the dashboard KNOWS, separate from how it
// looks.
//
// App.jsx used to hold the fetch, the optimistic write, the rollback, the toast
// timer and 400 lines of JSX in one component, so changing the save semantics
// meant editing the same file as changing a heading. This hook owns the data;
// App renders what it returns.

import { useCallback, useEffect, useRef, useState } from 'react';

import { briefPath, get, post, projectPath } from '../api.js';

// wire field name -> the key it lives under on a step object
const FIELD_KEY = { status: 'status', notes: 'notes', blocked_by: 'blockedBy' };

const STEP_LISTS = ['inProgress', 'readyDeep', 'readyGap', 'pullAhead', 'blocked'];

function findStep(brief, id) {
  for (const key of STEP_LISTS) {
    const hit = (brief?.[key] || []).find((s) => s.id === id);
    if (hit) return hit;
  }
  return null;
}

/** Optimistic patch: show the new value everywhere the step appears. */
function patchStep(brief, id, field, value) {
  const key = FIELD_KEY[field];
  const next = { ...brief };
  for (const listName of STEP_LISTS) {
    next[listName] = (brief[listName] || []).map((s) => (s.id === id ? { ...s, [key]: value } : s));
  }
  return next;
}

/** A toast that clears itself, and cleans up its timer on unmount. */
function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const showToast = useCallback((tone, text, ms = 6000) => {
    clearTimeout(timer.current);
    setToast({ tone, text, at: Date.now() });
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);

  return { toast, showToast, dismissToast: () => setToast(null) };
}

export function useBrief(projectId) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // M4: the schedule/milestones editor and the raw project config it edits.
  const [showSchedule, setShowSchedule] = useState(false);
  const [projectConfig, setProjectConfig] = useState(null);

  const { toast, showToast, dismissToast } = useToast();

  // editStep needs the CURRENT brief without being re-created on every change,
  // which would re-render every row that takes it as a prop.
  const briefRef = useRef(null);
  useEffect(() => {
    briefRef.current = brief;
  }, [brief]);

  const load = useCallback(
    async (isRefresh) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setFetchError(null);

      const json = await get(briefPath(projectId));
      // The brief has no `ok` field of its own — the backend is designed never
      // to fail this way, so an ok:false here is api.js reporting that it could
      // not get a readable object at all (almost always: server not running).
      if (json.ok === false) setFetchError(json.error || 'Could not load this project.');
      else setBrief(json);

      setLoading(false);
      setRefreshing(false);
    },
    [projectId]
  );

  // Re-runs when the open project changes, so switching projects re-fetches
  // rather than showing the previous project's data under a new name.
  useEffect(() => {
    setBrief(null);
    setShowSchedule(false);
    setProjectConfig(null);
    load(false);
  }, [load]);

  /**
   * Open the schedule editor, pulling the raw config it edits. The brief
   * carries only the computed schedule, not the source arrays.
   */
  const openSchedule = useCallback(async () => {
    setShowSchedule(true);
    const json = await get(projectPath(projectId));
    // The editor still opens on failure; it just starts from empty.
    if (json.ok) setProjectConfig(json.project);
  }, [projectId]);

  const closeSchedule = useCallback(() => setShowSchedule(false), []);

  // A schedule change alters the computed week and countdown, so refetch.
  const onScheduleSaved = useCallback(
    (project) => {
      setProjectConfig(project);
      load(true);
    },
    [load]
  );

  /**
   * Optimistic write with rollback.
   *
   * The UI shows the new value immediately. If the write fails the previous
   * brief is put back and the failure is surfaced — the dashboard must never be
   * left showing a value that didn't reach the sheet.
   */
  const editStep = useCallback(
    async (id, field, value, expectedOverride) => {
      const snapshot = briefRef.current;
      const step = findStep(snapshot, id);
      if (!step) {
        const err = { ok: false, error: `Step ${id} is not on this page.` };
        showToast('error', err.error);
        return err;
      }

      // Normally "what this page last saw in that cell". A retry after a stale
      // notes conflict passes the sheet's now-current value instead, which is
      // how Save-again deliberately overwrites (Part B).
      const expected = expectedOverride !== undefined ? expectedOverride : (step[FIELD_KEY[field]] ?? '');
      setBrief(patchStep(snapshot, id, field, value));

      const json = await post('/api/step', {
        project: projectId,
        id,
        field,
        value,
        expectedRowVersion: expected,
      });

      if (json.ok) {
        if (json.brief) setBrief(json.brief);
        if (!json.noop) showToast('ok', `Saved ${id} · ${field.replace('_', ' ')}`, 3000);
        return json;
      }

      if (json.reason === 'stale' && json.brief) {
        // Someone else changed it. Take their value rather than clobber it.
        //
        // The refreshed brief is adopted either way, so the rest of the page
        // shows truth. For NOTES the row additionally holds on to what the user
        // typed and offers Save-again / load-sheet-version (Part B) — losing a
        // paragraph of writing to a background edit is not acceptable, whereas
        // losing a status click is trivial.
        setBrief(json.brief);
        showToast(
          'warn',
          field === 'notes'
            ? `${id} — this note changed in the sheet. Your text is kept in the editor; review and Save again to overwrite.`
            : json.error,
          9000
        );
        return json;
      }

      setBrief(snapshot);
      showToast('error', `Couldn't save ${id} — reverted. ${json.error || ''}`.trim(), 9000);
      return json;
    },
    [showToast, projectId]
  );

  return {
    brief,
    loading,
    refreshing,
    fetchError,
    toast,
    dismissToast,
    refresh: () => load(true),
    editStep,
    showSchedule,
    projectConfig,
    openSchedule,
    closeSchedule,
    onScheduleSaved,
  };
}

/** Anything that isn't an array becomes one, so `.map`/`.length` are always safe. */
export const asList = (v) => (Array.isArray(v) ? v : []);

/** A progress object with numeric fields, whatever arrived. */
export function asProgress(p) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return p && typeof p === 'object'
    ? { done: num(p.done), total: num(p.total), pct: num(p.pct) }
    : { done: 0, total: 0, pct: 0 };
}
