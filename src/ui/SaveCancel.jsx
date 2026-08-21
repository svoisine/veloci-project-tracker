import { useTheme } from '../theme.jsx';
import { ghost, primary } from '../styles.js';
import { Spinner } from '../components/StatusChip.jsx';

/**
 * Save / Cancel for an inline editor, with the spinner that belongs to them.
 *
 * Both buttons go inert until the value is `dirty`: a Save that does nothing is
 * worse than a Save you cannot press, because the user cannot tell which one
 * they got.
 */
export default function SaveCancel({ busy, dirty, onSave, onCancel, saveLabel = 'Save' }) {
  const { T } = useTheme();
  const idle = !dirty || busy;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <button
        type="button"
        onClick={onSave}
        disabled={idle}
        style={primary(T, { color: T.done, disabled: idle })}
      >
        {saveLabel}
      </button>
      <button type="button" onClick={onCancel} disabled={idle} style={ghost(T, { disabled: !dirty })}>
        Cancel
      </button>
      {busy ? <Spinner color={T.text2} /> : null}
    </div>
  );
}
