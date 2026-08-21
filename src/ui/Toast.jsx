import { useTheme } from '../theme.jsx';
import { FONT_BODY } from '../tokens.js';
import { toneColors } from '../styles.js';

/** The corner notification after a save. `toast` is { tone, text }. */
export default function Toast({ toast, onClose }) {
  const { T } = useTheme();
  const { fg, bg } = toneColors(T, toast.tone);

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        maxWidth: 460,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        background: T.bg2,
        border: `1px solid ${T.line}`,
        borderLeft: `3px solid ${fg}`,
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 10px 30px rgba(0,0,0,.35)',
        animation: 'vptRise .18s ease-out',
        zIndex: 50,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: fg, marginTop: 5, flexShrink: 0 }} />
      <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.text, lineHeight: 1.5, flex: 1 }}>
        {toast.text}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          background: bg,
          border: 'none',
          borderRadius: 6,
          color: T.text2,
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: 1,
          padding: '4px 6px',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
