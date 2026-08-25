import { useTheme } from '../theme.jsx';
import { FONT_BODY, FONT_MONO, STATUS_LABELS, statusColors } from '../tokens.js';

/**
 * The state marker: what changed about this note since you last marked
 * everything seen. New and changed carry the warm accents so they read as the
 * thing to look at; unchanged gets a dot, because a label saying "unchanged" on
 * every other row is noise.
 */
function stateMarker(T, state) {
  if (state === 'new') return { text: 'NEW', fg: T.deep, bg: T.deepSoft };
  if (state === 'changed') return { text: 'CHANGED', fg: T.progress, bg: T.progressSoft };
  return null;
}

/**
 * A read-only status pill.
 *
 * StatusChip is a <select> — it exists to CHANGE a status, and the feed must
 * not offer that: editing a note or its step stays with the per-step editor.
 * This borrows the same statusColors() pair and the same pill shape so a
 * "Blocked" here is visibly the same "Blocked" as on the dashboard, without
 * putting a second write path on screen.
 */
function StatusPill({ status }) {
  const { T } = useTheme();
  const { fg, bg } = statusColors(T, status);
  return (
    <span
      style={{
        fontFamily: FONT_BODY,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.03em',
        color: fg,
        background: bg,
        border: `1px solid ${fg}44`,
        borderRadius: 999,
        padding: '3px 10px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/**
 * One note in the feed: which step it is on, what state that note is in, and
 * the note itself.
 *
 * The note text is `pre-wrap` so line breaks the user typed survive, and it
 * inherits `overflow-wrap: anywhere` from #root so a 3000-character pasted
 * token wraps instead of widening the panel. `minWidth: 0` on the header row's
 * flex children is what lets that shrinking actually happen.
 */
export default function NoteCard({ item }) {
  const { T } = useTheme();
  const marker = stateMarker(T, item.state);
  const unseen = !!marker;

  return (
    <article
      style={{
        background: unseen ? T.bg3 : 'transparent',
        border: `1px solid ${unseen ? T.line : T.line2}`,
        borderLeft: `3px solid ${unseen ? marker.fg : T.line2}`,
        borderRadius: 10,
        padding: '10px 12px',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 6,
          minWidth: 0,
        }}
      >
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.text3, flexShrink: 1, minWidth: 0 }}>
          {item.id}
        </span>

        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.4,
            color: T.text,
            flex: '1 1 140px',
            minWidth: 0,
          }}
        >
          {item.title || '(untitled step)'}
        </span>

        {marker ? (
          <span
            style={{
              fontFamily: FONT_BODY,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '.11em',
              color: marker.fg,
              background: marker.bg,
              border: `1px solid ${marker.fg}44`,
              borderRadius: 5,
              padding: '2px 6px',
              flexShrink: 0,
            }}
          >
            {marker.text}
          </span>
        ) : (
          <span
            aria-label="unchanged"
            title="Unchanged since you last marked these seen"
            style={{ width: 5, height: 5, borderRadius: '50%', background: T.text3, flexShrink: 0 }}
          />
        )}

        <StatusPill status={item.status} />
      </div>

      {/*
        `pre-wrap` keeps the line breaks the writer typed, and `overflow-wrap:
        anywhere` is inherited from #root so an unbreakable token wraps instead
        of widening the panel.

        The height bound is the other half of that. VPT caps its own notes at
        NOTES_MAX (2000), but a note edited in Google Sheets has no such limit —
        a 50,000-character one rendered as a single 19,000-pixel card, which
        does not break the layout but does bury every other note in the feed
        under it. Capping the height and letting that one note scroll inside its
        own card keeps every note reachable while no single note can run away
        with the panel.
      */}
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 12.5,
          lineHeight: 1.55,
          color: unseen ? T.text : T.text2,
          whiteSpace: 'pre-wrap',
          minWidth: 0,
          maxHeight: '55vh',
          overflowY: 'auto',
        }}
      >
        {item.notes}
      </div>
    </article>
  );
}
