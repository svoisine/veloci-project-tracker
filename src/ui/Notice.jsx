import { useTheme } from '../theme.jsx';
import { FONT_BODY } from '../tokens.js';
import { toneColors } from '../styles.js';

/**
 * The tinted box that explains a problem or confirms an action.
 *
 * There were five of these written out by hand — App's Notice, the Hub's flash
 * and its backend-unreachable box, the schedule editor's error, the new-project
 * form's error — each with its own padding, radius and border alpha. Same
 * component now; `tone` picks the colour and `title`/`hint`/`body` are all
 * optional, which covers the plain one-line flash as well as the full notice.
 *
 * `hint` sits ABOVE `body` deliberately: it is the sentence telling the user
 * what to do, and the body is usually the raw failure text behind it.
 */
export default function Notice({ tone = 'error', title, hint, body, style, children }) {
  const { T } = useTheme();
  const { fg, bg } = toneColors(T, tone);

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${fg}44`,
        borderRadius: 12,
        padding: '13px 16px',
        marginBottom: 16,
        ...style,
      }}
    >
      {title ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: fg, marginBottom: 3 }}>
          {title}
        </div>
      ) : null}

      {hint ? (
        <div
          style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.text, lineHeight: 1.55, marginBottom: 6 }}
        >
          {hint}
        </div>
      ) : null}

      {body ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.text2, lineHeight: 1.5 }}>{body}</div>
      ) : null}

      {children}
    </div>
  );
}
