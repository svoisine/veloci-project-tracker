import { useState } from 'react';

import { useTheme } from '../theme.jsx';
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from '../tokens.js';
import { card } from '../styles.js';

/**
 * One project on the hub. The status dot reflects the CONFIG only — whether the
 * sheet is reachable is a question the dashboard answers, because finding out
 * costs a network round trip the hub deliberately doesn't spend.
 */
function statusOf(T, project) {
  switch (project.status) {
    case 'broken':
      return { color: T.blocked, label: 'config unreadable' };
    case 'needs-sheet-id':
      return { color: T.progress, label: 'needs a sheet ID' };
    default:
      return { color: T.done, label: 'ready' };
  }
}

export default function ProjectCard({ project, isLast, busy, onOpen, onDelete }) {
  const { T } = useTheme();
  const [hover, setHover] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const status = statusOf(T, project);
  const openable = project.status !== 'broken';

  return (
    <section
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...card(T),
        // Resting state is quieter than a dashboard panel — a grid of cards
        // with full-strength borders reads as a table of boxes.
        border: `1px solid ${hover ? T.line : T.line2}`,
        padding: '16px 18px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'border-color .15s, transform .15s',
        transform: hover && openable ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          title={status.label}
          style={{ width: 8, height: 8, borderRadius: '50%', background: status.color, flexShrink: 0 }}
        />
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '.03em',
            color: T.text,
            margin: 0,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {project.name}
        </h2>
        {isLast ? (
          <span
            style={{
              fontFamily: FONT_BODY,
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: T.deep,
              background: T.deepSoft,
              borderRadius: 5,
              padding: '3px 6px',
              flexShrink: 0,
            }}
          >
            last opened
          </span>
        ) : null}
      </div>

      <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: T.text3 }}>{project.id}</div>

      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.text2, minHeight: 34 }}>
        {project.status === 'broken' ? (
          <span style={{ color: T.blocked }}>{project.error || 'This config file could not be read.'}</span>
        ) : project.needsSheetId ? (
          <span>Add a Google Sheet ID to start pulling data.</span>
        ) : project.progress ? (
          <span>
            <strong style={{ color: T.text }}>
              {project.progress.done}/{project.progress.total}
            </strong>{' '}
            steps complete ({project.progress.pct}%)
            {project.cachedAt ? (
              <span style={{ color: T.text3 }}> · from cache</span>
            ) : null}
          </span>
        ) : (
          <span style={{ color: T.text3 }}>No cached data yet — open it to pull the sheet.</span>
        )}
      </div>

      {project.progress && project.progress.total > 0 ? (
        <div style={{ height: 5, borderRadius: 3, background: T.track, overflow: 'hidden' }}>
          <div
            style={{
              width: `${project.progress.pct}%`,
              height: '100%',
              background: T.done,
              borderRadius: 3,
              transition: 'width .4s',
            }}
          />
        </div>
      ) : null}

      {confirming ? (
        <div
          style={{
            background: T.blockedSoft,
            border: `1px solid ${T.blocked}44`,
            borderRadius: 9,
            padding: '10px 11px',
          }}
        >
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.text, lineHeight: 1.5 }}>
            Remove <strong>{project.name}</strong> from VPT?
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.text2, marginTop: 4, lineHeight: 1.5 }}>
            This deletes only the local config file. <strong>Your Google Sheet is not affected.</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              style={{
                fontFamily: FONT_BODY,
                fontSize: 11.5,
                fontWeight: 600,
                color: T.bg,
                background: T.blocked,
                border: 'none',
                borderRadius: 7,
                padding: '5px 12px',
                cursor: busy ? 'default' : 'pointer',
              }}
            >
              {busy ? 'Removing…' : 'Remove'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              style={{
                fontFamily: FONT_BODY,
                fontSize: 11.5,
                color: T.text2,
                background: 'transparent',
                border: `1px solid ${T.line}`,
                borderRadius: 7,
                padding: '5px 12px',
                cursor: 'pointer',
              }}
            >
              Keep
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
          <button
            type="button"
            onClick={onOpen}
            disabled={!openable}
            style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '.03em',
              color: openable ? T.bg : T.text3,
              background: openable ? T.deep : T.mutedSoft,
              border: 'none',
              borderRadius: 8,
              padding: '7px 14px',
              cursor: openable ? 'pointer' : 'not-allowed',
              flex: 1,
            }}
          >
            Open →
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            title="Remove from VPT (does not touch the sheet)"
            style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: T.text3,
              background: 'transparent',
              border: `1px solid ${T.line2}`,
              borderRadius: 8,
              padding: '7px 10px',
              cursor: 'pointer',
            }}
          >
            Remove
          </button>
        </div>
      )}
    </section>
  );
}
