import { useTheme } from '../../theme.jsx';
import { BLOCKED_BY_MAX, NOTES_MAX } from '../../../shared/contract.js';
import { input } from '../../styles.js';
import Field from '../../ui/Field.jsx';
import SaveCancel from '../../ui/SaveCancel.jsx';
import NotesConflict from './NotesConflict.jsx';

/**
 * The panel that opens under a step row: the notes editor, and — only when the
 * step is blocked — the blocked_by field.
 *
 * The two caps come from shared/contract.js, so the textarea cannot accept more
 * than POST /api/step will store. They used to be typed in here as literals,
 * which meant raising the server's limit silently left the field on the old one.
 */
export default function StepDetails({
  notesDraft,
  onNotesChange,
  notesDirty,
  notesConflict,
  blockedDraft,
  onBlockedChange,
  blockedDirty,
  showBlockedBy,
  busyField,
  onSave,
  onResetNotes,
  onResetBlocked,
  onSaveNotesAgain,
  onLoadSheetNotes,
}) {
  const { T } = useTheme();

  return (
    // Indent enough to read as a child of the row, but not so much that a
    // narrow lane column leaves the textarea a slot too small to type in.
    <div style={{ padding: '2px 10px 12px 34px', display: 'grid', gap: 10 }}>
      <Field label="Notes">
        {notesConflict ? (
          <NotesConflict
            sheetValue={notesConflict.sheetValue}
            busy={busyField === 'notes'}
            onSaveAgain={onSaveNotesAgain}
            onLoadSheet={onLoadSheetNotes}
          />
        ) : null}

        <textarea
          value={notesDraft}
          maxLength={NOTES_MAX}
          rows={2}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add a note…"
          style={input(T, {
            resize: 'vertical',
            minHeight: 46,
            // Make it obvious which text is the one being protected.
            border: `1px solid ${notesConflict ? T.progress : T.line}`,
          })}
        />

        {notesConflict ? null : (
          <SaveCancel
            busy={busyField === 'notes'}
            dirty={notesDirty}
            onSave={() => onSave('notes', notesDraft)}
            onCancel={onResetNotes}
          />
        )}
      </Field>

      {showBlockedBy ? (
        <Field label="Blocked by (KN ids — optional)">
          <input
            value={blockedDraft}
            maxLength={BLOCKED_BY_MAX}
            onChange={(e) => onBlockedChange(e.target.value)}
            placeholder="e.g. KN001; KN004"
            style={input(T)}
          />
          <SaveCancel
            busy={busyField === 'blocked_by'}
            dirty={blockedDirty}
            onSave={() => onSave('blocked_by', blockedDraft)}
            onCancel={onResetBlocked}
          />
        </Field>
      ) : null}
    </div>
  );
}
