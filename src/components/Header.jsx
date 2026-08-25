import { useState } from 'react';

import { useTheme } from '../theme.jsx';
import { BRAND_GRADIENT, FONT_DISPLAY, FONT_BODY } from '../tokens.js';

function badges(T) {
  return {
    live: { text: '● live', fg: T.done, bg: T.doneSoft },
    cache: { text: '⚠ cached', fg: T.progress, bg: T.progressSoft },
    none: { text: '✗ no data', fg: T.blocked, bg: T.blockedSoft },
  };
}

function formatTime(iso) {
  if (!iso) return '';
  // `new Date('not-a-date')` does not throw — it returns an Invalid Date whose
  // toLocaleTimeString() is the literal string "Invalid Date". The try/catch
  // below never fired, so a malformed timestamp printed as "updated Invalid Date".
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function Header({
  project,
  source,
  generatedAt,
  cachedAt,
  onRefresh,
  refreshing,
  onBack,
  onEditSchedule,
  scheduleOpen,
  onOpenNotes,
  notesOpen,
  notesUnseen = 0,
  notesTotal = 0,
}) {
  const { T, theme, toggle, overridden, until } = useTheme();
  const [hover, setHover] = useState(null);
  const badge = badges(T)[source] || badges(T).none;

  const stamp =
    source === 'cache' && cachedAt
      ? `cached ${formatTime(cachedAt)}`
      : generatedAt
        ? `updated ${formatTime(generatedAt)}`
        : '';

  const untilLabel = until
    ? until.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  const ghost = (key) => ({
    fontFamily: FONT_BODY,
    fontSize: 12.5,
    fontWeight: 600,
    letterSpacing: '.03em',
    color: hover === key ? T.text : T.text2,
    background: hover === key ? T.bg3 : T.bg2,
    border: `1px solid ${hover === key ? T.line : T.line2}`,
    borderRadius: 9,
    padding: '8px 14px',
    cursor: 'pointer',
    transition: 'color .15s, background .15s, border-color .15s',
  });

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
        paddingBottom: 20,
        borderBottom: `1px solid ${T.line}`,
        marginBottom: 24,
      }}
    >
      <div>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            onMouseEnter={() => setHover('back')}
            onMouseLeave={() => setHover(null)}
            style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '.04em',
              color: hover === 'back' ? T.text : T.text2,
              background: 'transparent',
              border: 'none',
              borderRadius: 7,
              padding: '2px 0',
              marginBottom: 8,
              cursor: 'pointer',
              display: 'block',
              transition: 'color .15s',
            }}
          >
            ← All projects
          </button>
        ) : null}

        <h1
          onClick={onBack}
          title={onBack ? 'Back to all projects' : undefined}
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: '.02em',
            lineHeight: 1,
            margin: 0,
            backgroundImage: BRAND_GRADIENT,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            cursor: onBack ? 'pointer' : 'default',
            width: 'fit-content',
          }}
        >
          🦖 Veloci Project Tracker
        </h1>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            fontWeight: 500,
            color: T.text2,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            marginTop: 8,
          }}
        >
          {project || '—'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {stamp ? <span style={{ fontSize: 12, color: T.text3 }}>{stamp}</span> : null}

        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '.05em',
            color: badge.fg,
            background: badge.bg,
            border: `1px solid ${badge.fg}44`,
            borderRadius: 999,
            padding: '6px 13px',
            whiteSpace: 'nowrap',
          }}
        >
          {badge.text}
        </span>

        <button
          type="button"
          onClick={toggle}
          onMouseEnter={() => setHover('theme')}
          onMouseLeave={() => setHover(null)}
          title={
            overridden
              ? `Manual ${theme} — auto resumes at ${untilLabel}`
              : `Auto ${theme} — next switch at ${untilLabel}`
          }
          style={ghost('theme')}
        >
          {theme === 'dark' ? '☾ Dark' : '☀ Light'}
          {overridden ? <span style={{ color: T.text3 }}> · manual</span> : null}
        </button>

        {onOpenNotes ? (
          <button
            type="button"
            onClick={onOpenNotes}
            onMouseEnter={() => setHover('notes')}
            onMouseLeave={() => setHover(null)}
            title={
              notesUnseen > 0
                ? `${notesUnseen} note${notesUnseen === 1 ? '' : 's'} new or changed since you last looked`
                : 'Read the notes left on this project’s steps'
            }
            style={{
              ...ghost('notes'),
              color: notesOpen || hover === 'notes' ? T.text : T.text2,
              background: notesOpen || hover === 'notes' ? T.bg3 : T.bg2,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            Notes
            {/* The badge counts what is NEW or CHANGED since the last "mark all
                seen" — not how many notes exist. A badge showing the total
                would never go down, so it would never mean anything. */}
            {notesUnseen > 0 ? (
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 10.5,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: T.bg,
                  background: T.deep,
                  borderRadius: 999,
                  padding: '3px 6px',
                  minWidth: 17,
                  textAlign: 'center',
                }}
              >
                {notesUnseen > 99 ? '99+' : notesUnseen}
              </span>
            ) : notesTotal > 0 ? (
              <span style={{ fontSize: 11, color: T.text3, lineHeight: 1 }}>{notesTotal}</span>
            ) : null}
          </button>
        ) : null}

        {onEditSchedule ? (
          <button
            type="button"
            onClick={onEditSchedule}
            onMouseEnter={() => setHover('schedule')}
            onMouseLeave={() => setHover(null)}
            title="Edit this project's weeks and milestones (local config only)"
            style={{
              ...ghost('schedule'),
              color: scheduleOpen ? T.text : hover === 'schedule' ? T.text : T.text2,
              background: scheduleOpen ? T.bg3 : hover === 'schedule' ? T.bg3 : T.bg2,
            }}
          >
            ⚙ Schedule
          </button>
        ) : null}

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          onMouseEnter={() => setHover('refresh')}
          onMouseLeave={() => setHover(null)}
          style={{
            ...ghost('refresh'),
            color: refreshing ? T.text3 : hover === 'refresh' ? T.text : T.text2,
            cursor: refreshing ? 'default' : 'pointer',
          }}
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>
    </header>
  );
}
