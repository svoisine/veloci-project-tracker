// notes/NotesPanel.jsx — the slide-in Notes Activity Feed.
//
// A note left on a step is the one thing on a shared tracker that nothing
// surfaces later: the dashboard shows a "✎•" glyph on the row and you have to
// already know to look. This panel is where those notes get read — grouped by
// the status of the step they sit on, with whatever is new since you last
// looked pulled to the top.
//
// Read-only by construction. No control in here writes to the sheet: "Mark all
// seen" moves a local snapshot file and nothing else. Editing a note is still
// the per-step editor's job, on the dashboard behind this panel.

import { useEffect, useMemo, useRef, useState } from 'react';

import { useTheme } from '../theme.jsx';
import { FONT_BODY, FONT_DISPLAY, statusColors } from '../tokens.js';
import { ghost, hintText, input, primary } from '../styles.js';
import { Bar } from '../ui/Skeleton.jsx';
import { countsByStatus, GROUP_ORDER, groupNotes, labelOf } from './groupNotes.js';
import NoteCard from './NoteCard.jsx';

const allStatuses = () => new Set(GROUP_ORDER);

/**
 * How many note cards are put in the DOM at once.
 *
 * A tracker with 20,000 rows produces 10,000 feed items, and rendering all of
 * them took ten seconds and 70,000 DOM nodes — the tab simply locked up, and
 * every keystroke in the search box paid the same cost again. Capping the
 * RENDER (never the counts, never the diff) keeps the panel instant on any
 * sheet. VPT already caps lists this way in brief/sections.js.
 *
 * Items arrive sorted new → changed → unchanged, so the cap keeps exactly the
 * ones worth looking at first, and the filters below reach the whole set.
 */
const RENDER_CAP = 300;

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function NotesPanel({ feed, onClose }) {
  const { T } = useTheme();
  const { items, counts, unseen, source, message, snapshotAt, loading, refreshing, error, seenPending } = feed;

  // `null` means "whatever the feed suggests": new-and-changed-only while there
  // is anything unseen, all notes once there isn't — so the panel is never
  // empty while there are notes to read. An explicit toggle wins from then on.
  const [unseenPref, setUnseenPref] = useState(null);
  const [statuses, setStatuses] = useState(allStatuses);
  const [query, setQuery] = useState('');
  const [hover, setHover] = useState(null);

  const unseenOnly = unseenPref === null ? unseen > 0 : unseenPref;
  const closeRef = useRef(null);

  // Escape closes the panel. CAPTURE phase, and the event is stopped here:
  // Root.jsx listens for Escape on window to go back to the hub, and while the
  // panel is open Escape should close the panel, not leave the project.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  // Move focus in, so the panel is keyboard-reachable the moment it opens.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Chip counts are computed over everything EXCEPT the status filter, so each
  // chip says how many notes selecting it would reveal. Counts that moved as
  // you toggled OTHER chips would be unreadable.
  const scoped = useMemo(() => groupNotes(items, { unseenOnly, query }), [items, unseenOnly, query]);
  const chipCounts = useMemo(() => countsByStatus(scoped.groups.flatMap((g) => g.items)), [scoped]);
  const overall = useMemo(() => countsByStatus(items), [items]);
  const chipStatuses = GROUP_ORDER.filter((s) => overall[s] > 0);

  const { groups, shown, matched, capped } = useMemo(
    () => groupNotes(items, { statuses, unseenOnly, query, limit: RENDER_CAP }),
    [items, statuses, unseenOnly, query]
  );

  const toggleStatus = (status) =>
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });

  const seenLabel = snapshotAt
    ? `new since you last marked all seen · ${formatWhen(snapshotAt)}`
    : 'nothing marked seen yet on this machine — all of this is new to you';

  return (
    <>
      {/* The scrim. Clicking it closes, which is what a slide-in panel is
          expected to do, and it stops the dashboard behind being clicked
          through by accident. */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(22,16,12,.42)',
          zIndex: 40,
          animation: 'vptFade .18s ease-out',
        }}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Notes activity feed"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(460px, 100vw)',
          zIndex: 41,
          display: 'flex',
          flexDirection: 'column',
          background: T.bg2,
          borderLeft: `1px solid ${T.line}`,
          boxShadow: '-8px 0 32px rgba(0,0,0,.22)',
          animation: 'vptSlideIn .2s cubic-bezier(.2,.8,.3,1)',
        }}
      >
        {/* ------------------------------------------------------------ head */}
        <div style={{ padding: '18px 20px 12px', borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: '.05em',
                textTransform: 'uppercase',
                color: T.deep,
                margin: 0,
                flex: 1,
                minWidth: 0,
              }}
            >
              Notes
            </h2>

            {source === 'cache' ? (
              <span
                title={message || 'Showing the last good pull.'}
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.progress,
                  background: T.progressSoft,
                  border: `1px solid ${T.progress}44`,
                  borderRadius: 999,
                  padding: '3px 9px',
                  flexShrink: 0,
                }}
              >
                ⚠ cached
              </span>
            ) : null}

            {refreshing ? <span style={{ ...hintText(T), flexShrink: 0 }}>refreshing…</span> : null}

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              onMouseEnter={() => setHover('close')}
              onMouseLeave={() => setHover(null)}
              style={{
                ...ghost(T),
                color: hover === 'close' ? T.text : T.text2,
                background: hover === 'close' ? T.bg3 : 'transparent',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ ...hintText(T), marginTop: 6 }}>{seenLabel}</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.text2 }}>
              <strong style={{ color: counts.new > 0 ? T.deep : T.text2 }}>{counts.new}</strong> new{' · '}
              <strong style={{ color: counts.changed > 0 ? T.progress : T.text2 }}>{counts.changed}</strong>{' '}
              changed{' · '}
              {counts.total} total
            </span>

            <button
              type="button"
              onClick={feed.markSeen}
              disabled={unseen === 0 || seenPending}
              title={
                unseen === 0
                  ? 'Nothing new to mark seen'
                  : 'Remember this as what you have read. Nothing is written to the sheet.'
              }
              style={{
                ...primary(T, { color: T.deep, disabled: unseen === 0 || seenPending }),
                marginLeft: 'auto',
              }}
            >
              {seenPending ? 'Marking…' : '✓ Mark all seen'}
            </button>
          </div>
        </div>

        {/* --------------------------------------------------------- filters */}
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${T.line2}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <button type="button" onClick={() => setUnseenPref(true)} style={statePill(T, unseenOnly)}>
              New &amp; changed
            </button>
            <button type="button" onClick={() => setUnseenPref(false)} style={statePill(T, !unseenOnly)}>
              All notes
            </button>

            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes…"
              aria-label="Search notes"
              style={{ ...input(T), width: 'auto', flex: '1 1 130px', minWidth: 110 }}
            />
          </div>

          {chipStatuses.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {chipStatuses.map((status) => {
                const on = statuses.has(status);
                const n = chipCounts[status] || 0;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatus(status)}
                    aria-pressed={on}
                    title={`${on ? 'Hide' : 'Show'} ${labelOf(status)}`}
                    style={{ ...statusPill(T, status, on), opacity: on && n === 0 ? 0.5 : 1 }}
                  >
                    {labelOf(status)} {n}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* ------------------------------------------------------------ body */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '14px 20px 24px' }}>
          {loading ? (
            <>
              <Bar height={78} radius={10} style={{ marginBottom: 8 }} />
              <Bar height={78} radius={10} style={{ marginBottom: 8 }} />
              <Bar height={78} radius={10} />
            </>
          ) : (
            <Body
              T={T}
              error={error}
              groups={groups}
              shown={shown}
              matched={matched}
              capped={capped}
              items={items}
              unseen={unseen}
              unseenOnly={unseenOnly}
              statuses={statuses}
              query={query}
              onShowAll={() => setUnseenPref(false)}
              onAllStatuses={() => setStatuses(allStatuses())}
              onClearSearch={() => setQuery('')}
            />
          )}
        </div>
      </aside>
    </>
  );
}

/**
 * The list, or the reason there isn't one.
 *
 * Split out because the empty states are the interesting part: "no notes at
 * all" and "nothing new since you last looked" are different situations with
 * different ways out, and one flat "nothing here" for both is how a panel ends
 * up feeling broken when it is working perfectly.
 */
function Body({
  T,
  error,
  groups,
  shown,
  matched,
  capped,
  items,
  unseen,
  unseenOnly,
  statuses,
  query,
  onShowAll,
  onAllStatuses,
  onClearSearch,
}) {
  if (error && items.length === 0) {
    return <Empty T={T} title="Couldn't load the notes feed" body={error} />;
  }

  if (items.length === 0) {
    return (
      <Empty
        T={T}
        title="No notes yet"
        body="Notes added to a step — with the ✎ button on the dashboard — show up here, grouped by that step's status."
      />
    );
  }

  if (matched === 0) {
    if (statuses.size === 0) {
      return (
        <Empty T={T} title="No statuses selected" body="Pick at least one status above.">
          <button type="button" onClick={onAllStatuses} style={ghost(T)}>
            Show all statuses
          </button>
        </Empty>
      );
    }
    if (query.trim()) {
      return (
        <Empty T={T} title="No notes match that search" body={`Nothing here contains "${query.trim()}".`}>
          <button type="button" onClick={onClearSearch} style={ghost(T)}>
            Clear search
          </button>
        </Empty>
      );
    }
    if (unseenOnly && unseen === 0) {
      return (
        <Empty
          T={T}
          title="Nothing new since you last looked"
          body={`All ${items.length} note${items.length === 1 ? '' : 's'} here are as you left them.`}
        >
          <button type="button" onClick={onShowAll} style={ghost(T)}>
            Show all notes
          </button>
        </Empty>
      );
    }
    return (
      <Empty T={T} title="Nothing matches these filters" body="Turn a status chip back on to see more.">
        <button type="button" onClick={onAllStatuses} style={ghost(T)}>
          Show all statuses
        </button>
      </Empty>
    );
  }

  return (
    <>
      {/* Say so when the render cap bites, rather than quietly showing a
          subset. The counts above are still the true totals. */}
      {capped ? (
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 11.5,
            color: T.text3,
            background: T.mutedSoft,
            border: `1px solid ${T.line2}`,
            borderRadius: 8,
            padding: '7px 10px',
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          Showing the first {shown.toLocaleString()} of {matched.toLocaleString()} matching notes — narrow
          with the filters or the search box above.
        </div>
      ) : null}

      {groups.map((group) => (
    <section key={group.status} style={{ marginBottom: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          paddingBottom: 5,
          borderBottom: `1px solid ${T.line2}`,
        }}
      >
        <h3
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '.09em',
            textTransform: 'uppercase',
            color: T.text2,
            margin: 0,
          }}
        >
          {group.label}
        </h3>
        <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.text3 }}>{group.items.length}</span>
      </div>

      {group.items.map((item) => (
        <NoteCard key={item.id} item={item} />
      ))}
    </section>
      ))}
    </>
  );
}

function Empty({ T, title, body, children }) {
  return (
    <div style={{ padding: '28px 4px', textAlign: 'center' }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: T.text2, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ ...hintText(T), lineHeight: 1.6, marginBottom: children ? 12 : 0 }}>{body}</div>
      {children}
    </div>
  );
}

/** The New-&-changed / All-notes segmented pair. */
function statePill(T, on) {
  return {
    fontFamily: FONT_BODY,
    fontSize: 11.5,
    fontWeight: 600,
    color: on ? T.bg : T.text2,
    background: on ? T.deep : 'transparent',
    border: `1px solid ${on ? T.deep : T.line}`,
    borderRadius: 999,
    padding: '5px 12px',
    cursor: 'pointer',
    flexShrink: 0,
  };
}

/** A status filter chip, in that status's own colours while it is on. */
function statusPill(T, status, on) {
  const { fg, bg } = statusColors(T, status);
  return {
    fontFamily: FONT_BODY,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '.02em',
    color: on ? fg : T.text3,
    background: on ? bg : 'transparent',
    border: `1px solid ${on ? `${fg}55` : T.line2}`,
    borderRadius: 999,
    padding: '4px 10px',
    cursor: 'pointer',
    textDecoration: on ? 'none' : 'line-through',
  };
}
