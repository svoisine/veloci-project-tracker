import { useTheme } from '../theme.jsx';
import { STATUS_VALUES, STATUS_LABELS, statusColors, FONT_BODY } from '../tokens.js';

/**
 * The inline status control. A native <select> styled as a chip — keyboard
 * accessible and predictable, with no dropdown library. `colorScheme` is set on
 * <html> by the theme, so the native option list matches light/dark too.
 *
 * The caret is a real element rather than a background gradient: mixing the
 * `background` shorthand with background-size/position in a React style object
 * lets the shorthand reset the longhands, which tiles the caret across the
 * whole control.
 */
export default function StatusChip({ value, onChange, busy = false, disabled = false }) {
  const { T } = useTheme();
  const status = STATUS_VALUES.includes(value) ? value : 'todo';
  const { fg, bg } = statusColors(T, status);
  const locked = busy || disabled;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <select
          value={status}
          disabled={locked}
          onChange={(e) => onChange(e.target.value)}
          title={disabled ? 'Editing needs live data' : busy ? 'Saving…' : 'Change status'}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '.03em',
            color: fg,
            backgroundColor: bg,
            backgroundImage: 'none',
            border: `1px solid ${fg}44`,
            borderRadius: 999,
            padding: '4px 21px 4px 10px',
            cursor: locked ? (disabled ? 'not-allowed' : 'progress') : 'pointer',
            opacity: locked ? 0.55 : 1,
            transition: 'opacity .15s',
          }}
        >
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s} style={{ backgroundColor: T.bg2, color: T.text }}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 8,
            lineHeight: 1,
            color: fg,
            opacity: locked ? 0.5 : 0.85,
            pointerEvents: 'none',
          }}
        >
          ▾
        </span>
      </span>

      {busy ? <Spinner color={fg} /> : null}
    </span>
  );
}

export function Spinner({ color, size = 11 }) {
  return (
    <span
      aria-label="Saving"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1.5px solid ${color}40`,
        borderTopColor: color,
        display: 'inline-block',
        animation: 'vptSpin .7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}
