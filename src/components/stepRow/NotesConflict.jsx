import { useTheme } from '../../theme.jsx';
import { FONT_BODY } from '../../tokens.js';
import { fieldLabel, ghost, primary } from '../../styles.js';
import { Spinner } from '../StatusChip.jsx';

/**
 * Shown when a notes write lost a race with the sheet.
 *
 * The contract with the user is that their typing survives: the textarea below
 * still holds their text, and the sheet's competing version is shown here for
 * comparison rather than silently swapped in. Both exits are explicit.
 */
export default function NotesConflict({ sheetValue, busy, onSaveAgain, onLoadSheet }) {
  const { T } = useTheme();

  return (
    <div
      style={{
        background: T.progressSoft,
        border: `1px solid ${T.progress}55`,
        borderRadius: 9,
        padding: '10px 12px',
        marginBottom: 8,
      }}
    >
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.progress, marginBottom: 4 }}>
        This note changed in the sheet since you started editing
      </div>

      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.text2, lineHeight: 1.5 }}>
        Your text is kept below. Review it and <strong>Save again</strong> to overwrite the sheet, or{' '}
        <strong>load the sheet's version</strong> to discard yours.
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ ...fieldLabel(T), marginBottom: 3 }}>Now in the sheet</div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 12,
            color: T.text,
            background: T.bg,
            border: `1px solid ${T.line2}`,
            borderRadius: 7,
            padding: '7px 9px',
            maxHeight: 90,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {sheetValue ? sheetValue : <span style={{ color: T.text3 }}>(empty)</span>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onSaveAgain}
          disabled={busy}
          style={primary(T, { color: T.progress, disabled: busy })}
        >
          Save again (keep mine)
        </button>
        <button type="button" onClick={onLoadSheet} disabled={busy} style={ghost(T, { disabled: busy })}>
          Load the sheet's version
        </button>
        {busy ? <Spinner color={T.progress} /> : null}
      </div>
    </div>
  );
}
