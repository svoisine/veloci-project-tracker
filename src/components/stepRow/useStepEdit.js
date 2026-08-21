// stepRow/useStepEdit.js — the editing state machine behind a step row.
//
// Drafts, the busy field, the transient "saved"/"conflict" flash, and the
// notes-conflict rules. Kept out of StepRow.jsx because the row's layout and
// its save semantics are edited for completely different reasons, and the
// conflict handling is the subtlest logic in the frontend.
//
// `onEdit(field, value, expectedOverride)` must resolve to { ok, error, reason }.
// The parent does the optimistic update and the rollback; this only reports
// progress.

import { useEffect, useRef, useState } from 'react';

export function useStepEdit(step, onEdit) {
  const [busyField, setBusyField] = useState(null);
  const [flash, setFlash] = useState(null);

  const [notesDraft, setNotesDraft] = useState(step.notes || '');
  const [blockedDraft, setBlockedDraft] = useState(step.blockedBy || '');

  // Part B: set when a notes write is refused as stale. While this is held, the
  // user's typed text is protected from the incoming sheet value.
  const [notesConflict, setNotesConflict] = useState(null); // { sheetValue }

  const timerRef = useRef(null);
  const conflictRef = useRef(null);
  conflictRef.current = notesConflict;

  // Keep drafts in step with the server's truth whenever it changes underneath —
  // EXCEPT while a notes conflict is unresolved. That refreshed value is exactly
  // the text we are protecting the user's writing from; adopting it here is the
  // notes-loss bug this part exists to fix.
  useEffect(() => {
    if (conflictRef.current) return;
    setNotesDraft(step.notes || '');
  }, [step.notes]);

  useEffect(() => setBlockedDraft(step.blockedBy || ''), [step.blockedBy]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const showFlash = (tone, text, ms = 2600) => {
    clearTimeout(timerRef.current);
    setFlash({ tone, text });
    timerRef.current = setTimeout(() => setFlash(null), ms);
  };

  const run = async (field, value, expectedOverride) => {
    if (!onEdit) return undefined;
    setBusyField(field);
    const res = await onEdit(field, value, expectedOverride);
    setBusyField(null);

    if (res && res.ok) {
      // A successful write settles any conflict — the sheet now holds our text.
      if (field === 'notes') setNotesConflict(null);
      showFlash('done', res.noop ? 'no change' : 'saved');
      return res;
    }

    if (res?.reason === 'stale' && field === 'notes') {
      // Hold the user's draft and show the recovery choices inline.
      setNotesConflict({ sheetValue: res.currentValue ?? '' });
      showFlash('blocked', 'conflict', 6000);
      return res;
    }

    showFlash('blocked', res?.reason === 'stale' ? 'refreshed' : 'failed', 4000);
    return res;
  };

  return {
    busyField,
    flash,
    notesDraft,
    setNotesDraft,
    notesDirty: notesDraft !== (step.notes || ''),
    resetNotes: () => setNotesDraft(step.notes || ''),
    blockedDraft,
    setBlockedDraft,
    blockedDirty: blockedDraft !== (step.blockedBy || ''),
    resetBlocked: () => setBlockedDraft(step.blockedBy || ''),
    notesConflict,
    /** Retry the write, deliberately overwriting what the sheet now holds. */
    saveNotesAgain: () => run('notes', notesDraft, notesConflict?.sheetValue ?? ''),
    /** Give up on the user's text and show what the sheet actually has. */
    loadSheetNotes: () => {
      setNotesDraft(notesConflict?.sheetValue ?? '');
      setNotesConflict(null);
    },
    run,
  };
}
