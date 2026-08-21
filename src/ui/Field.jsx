import { useTheme } from '../theme.jsx';
import { FONT_BODY } from '../tokens.js';
import { fieldLabel } from '../styles.js';

/**
 * A labelled form control, with an optional hint underneath that an error
 * replaces when there is one.
 *
 * There were three of these — StepRow's (label only), ScheduleEditor's
 * `Labelled` (label only) and NewProjectForm's (label + hint + error) — all
 * drawing the same uppercase label. This is the superset; the callers that only
 * pass a label get exactly what they had.
 */
export default function Field({ label, hint, error, children }) {
  const { T } = useTheme();

  return (
    <div>
      <div style={fieldLabel(T)}>{label}</div>
      {children}
      {error ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.blocked, marginTop: 5 }}>{error}</div>
      ) : hint ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.text3, marginTop: 5 }}>{hint}</div>
      ) : null}
    </div>
  );
}
