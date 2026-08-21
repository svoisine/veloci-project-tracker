import { useTheme } from '../../theme.jsx';
import { FONT_DISPLAY } from '../../tokens.js';
import { hintText } from '../../styles.js';

/** A titled block inside the schedule editor, separated by a hairline. */
export default function Group({ title, hint, children }) {
  const { T } = useTheme();

  return (
    <div style={{ borderTop: `1px solid ${T.line2}`, paddingTop: 14, marginTop: 14 }}>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          color: T.text,
          marginBottom: 2,
        }}
      >
        {title}
      </div>
      {hint ? <div style={{ ...hintText(T), marginBottom: 12 }}>{hint}</div> : null}
      {children}
    </div>
  );
}
