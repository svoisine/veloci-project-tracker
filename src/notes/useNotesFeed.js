// notes/useNotesFeed.js — the notes feed's data, separate from its panel.
//
// Same split as dashboard/useBrief.js: this hook knows what the feed IS, and
// NotesPanel renders it. Nothing here writes to the sheet — the feed is
// read-only, and the one POST it makes (`/api/notes/seen`) moves a local
// snapshot file and cannot reach Google.
//
// WHEN IT LOADS
//   · on mount, so the header badge can show a count before the panel is ever
//     opened — a badge that only appears once you look is not a badge
//   · every time the panel is opened, so a note edited through the per-step
//     editor since mount is never shown stale
//   · on the dashboard's Refresh, alongside the brief
//
// That is one extra sheet read per dashboard load, concurrent with the brief's,
// and it is the price of keeping the feed out of /api/brief: pulling the counts
// through the brief envelope would wire this feature into the hardened path it
// is supposed to stay clear of.

import { useCallback, useEffect, useRef, useState } from 'react';

import { get, notesPath, notesSeenPath, post } from '../api.js';

/** Anything that isn't an array becomes one, so `.map`/`.length` are always safe. */
const asList = (v) => (Array.isArray(v) ? v : []);

/** A counts object with numeric fields, whatever arrived. */
function asCounts(c) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return c && typeof c === 'object'
    ? { new: num(c.new), changed: num(c.changed), total: num(c.total) }
    : { new: 0, changed: 0, total: 0 };
}

export function useNotesFeed(projectId) {
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [seenPending, setSeenPending] = useState(false);

  // A reload that lands after the project has changed (or the dashboard has
  // unmounted) must not overwrite the new project's feed with the old one's.
  const liveFor = useRef(projectId);
  useEffect(() => {
    liveFor.current = projectId;
    return () => {
      liveFor.current = null;
    };
  }, [projectId]);

  // Which load is the current one. Opening the panel reloads, and the Notes
  // button is not disabled while that is in flight, so a second open can easily
  // overtake the first — and responses do NOT come back in the order they were
  // asked for. Without a ticket the slower, older response lands last and wins,
  // leaving the panel showing read-state that has already been superseded.
  const latestLoad = useRef(0);

  const load = useCallback(
    async (isRefresh) => {
      const ticket = ++latestLoad.current;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const json = await get(notesPath(projectId));
      // Superseded by a newer load, or the project changed underneath us.
      // The winner owns the state and the flags; this one just goes away.
      if (ticket !== latestLoad.current || liveFor.current !== projectId) return;

      // ok:false here is either api.js reporting it could not reach the backend
      // at all, or the route refusing the project id. Both are worth showing;
      // neither should blank a feed we already have.
      if (json.ok === false && !Array.isArray(json.items)) {
        setError(json.error || json.message || 'Could not load the notes feed.');
      } else if (json.ok === false) {
        setError(json.message || json.error || 'Could not load the notes feed.');
        setFeed({ ...json, items: asList(json.items), counts: asCounts(json.counts) });
      } else {
        setFeed({ ...json, items: asList(json.items), counts: asCounts(json.counts) });
      }

      setLoading(false);
      setRefreshing(false);
    },
    [projectId]
  );

  // Re-runs when the open project changes, so switching projects never shows
  // the previous project's notes.
  useEffect(() => {
    setFeed(null);
    load(false);
  }, [load]);

  /**
   * "Mark all seen" — promote the snapshot, then reload so every item comes
   * back from the server as `unchanged` rather than being patched to look that
   * way locally. The badge is then whatever the server says it is, which is the
   * only version that survives a reload.
   */
  const markSeen = useCallback(async () => {
    setSeenPending(true);
    try {
      const json = await post(notesSeenPath(projectId));
      if (liveFor.current !== projectId) return json;

      if (json.ok === false) setError(json.error || 'Could not mark these notes as seen.');
      else await load(true);

      return json;
    } finally {
      // Always clears, including on the early return above — a pending flag
      // left set disables "Mark all seen" for the rest of the session.
      setSeenPending(false);
    }
  }, [projectId, load]);

  const items = asList(feed?.items);
  const counts = asCounts(feed?.counts);

  return {
    feed,
    items,
    counts,
    /** What the header badge shows: everything not yet acknowledged. */
    unseen: counts.new + counts.changed,
    source: feed?.source || 'none',
    message: feed?.message || null,
    snapshotAt: feed?.snapshotAt || null,
    loading,
    refreshing,
    error,
    seenPending,
    reload: useCallback(() => load(true), [load]),
    markSeen,
  };
}
