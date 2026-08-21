import { useTheme } from '../theme.jsx';
import { BRAND_GRADIENT, FONT_BODY, FONT_DISPLAY } from '../tokens.js';
import { ghost, primary } from '../styles.js';

const time = (d) => (d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');

/** The hub's title bar: wordmark, project count, theme toggle, Add Project. */
export default function HubHeader({ count, creating, onToggleCreate }) {
  const { T, theme, toggle, overridden, until } = useTheme();

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
        <h1
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
          {count === null ? 'Loading…' : `${count} project${count === 1 ? '' : 's'}`}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={toggle}
          title={overridden ? `Manual ${theme} — auto resumes at ${time(until)}` : `Auto ${theme}`}
          style={ghost(T, { size: 'lg' })}
        >
          {theme === 'dark' ? '☾ Dark' : '☀ Light'}
          {overridden ? <span style={{ color: T.text3 }}> · manual</span> : null}
        </button>

        <button type="button" onClick={onToggleCreate} style={primary(T, { size: 'lg' })}>
          {creating ? '✕ Cancel' : '+ Add Project'}
        </button>
      </div>
    </header>
  );
}
