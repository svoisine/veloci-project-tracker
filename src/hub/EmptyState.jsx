import { useTheme } from '../theme.jsx';
import { FONT_BODY, FONT_DISPLAY } from '../tokens.js';
import { primary } from '../styles.js';

/**
 * Nothing here but the shipped example (or nothing at all) is a brand-new
 * install, not a broken one. Invite, don't alarm.
 */
export default function EmptyState({ onCreate, hasExample = false }) {
  const { T } = useTheme();

  return (
    <div
      style={{
        background: T.bg2,
        border: `1px dashed ${T.line}`,
        borderRadius: 14,
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 10 }}>🦖</div>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: '.04em',
          textTransform: 'uppercase',
          color: T.text,
        }}
      >
        {hasExample ? 'Add your first project' : 'No projects yet'}
      </div>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 13,
          color: T.text2,
          marginTop: 8,
          maxWidth: 480,
          margin: '8px auto 0',
          lineHeight: 1.6,
        }}
      >
        A project is one Google Sheet with a <code>Tracker</code> tab. Add Project walks you through it —
        including a first-time Google setup guide and a sheet template to start from.
        {hasExample ? ' The example below is a placeholder; delete it whenever you like.' : ''}
      </div>
      <button
        type="button"
        onClick={onCreate}
        style={{ ...primary(T, { size: 'lg' }), fontSize: 13, padding: '11px 22px', marginTop: 18 }}
      >
        + Add Project
      </button>
    </div>
  );
}
