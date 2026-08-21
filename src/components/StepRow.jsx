import { useEffect, useState } from 'react';

import { useTheme } from '../theme.jsx';
import { FONT_BODY, FONT_MONO } from '../tokens.js';
import StatusChip from './StatusChip.jsx';
import StepDetails from './stepRow/StepDetails.jsx';
import { useStepEdit } from './stepRow/useStepEdit.js';

/**
 * One step: the row itself. The editing state machine is in
 * stepRow/useStepEdit.js and the expandable panel is stepRow/StepDetails.jsx —
 * this file is the line you see in a lane column.
 *
 * `onEdit(field, value)` must resolve to { ok, error, reason }. The parent does
 * the optimistic update and the rollback; this row only reports progress.
 */
export default function StepRow({
  step,
  accent,
  marker = '•',
  dim = false,
  trailing = null,
  canEdit = true,
  onEdit,
}) {
  const { T } = useTheme();
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);

  const edit = useStepEdit(step, onEdit);

  // A conflict has recovery choices that only exist inside the panel, so a
  // refused save has to open it whether or not the user had it open.
  useEffect(() => {
    if (edit.notesConflict) setOpen(true);
  }, [edit.notesConflict]);

  // Controls are rendered whenever a handler exists, but go inert when the
  // dashboard isn't on live data — a disabled chip explains itself better than
  // a missing one.
  const hasHandler = typeof onEdit === 'function';
  const editable = hasHandler && canEdit;

  return (
    <div
      style={{
        borderRadius: 9,
        margin: '0 -10px',
        background: hover || open ? T.mutedSoft : 'transparent',
        transition: 'background .12s',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/*
        The row wraps rather than compresses. Every control here is a fixed
        width, and inside a narrow lane column they together outrun the space —
        left to shrink, the title collapses to one character per line. Grouping
        the controls into a single flex item lets them drop to a second line
        (right-aligned) while the title keeps a readable floor.
      */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', flexWrap: 'wrap' }}>
        <span style={{ color: accent, fontSize: 12, flexShrink: 0 }}>{marker}</span>

        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            color: dim ? T.text3 : accent,
            // minWidth keeps normal ids aligned in a column; shrink stays
            // ENABLED so an abnormally long id from a messy sheet wraps instead
            // of pushing the whole page sideways.
            flexShrink: 1,
            minWidth: 74,
            letterSpacing: '-.01em',
          }}
        >
          {step.id}
        </span>

        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13.5,
            lineHeight: 1.45,
            color: dim ? T.text2 : T.text,
            flex: '1 1 170px',
            minWidth: 150,
            textDecoration: step.status === 'skipped' ? 'line-through' : 'none',
          }}
        >
          {step.title}
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
          {edit.flash ? (
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: 10.5,
                fontWeight: 600,
                color: edit.flash.tone === 'done' ? T.done : T.blocked,
                flexShrink: 0,
              }}
            >
              {edit.flash.text}
            </span>
          ) : null}

          {trailing ? (
            <span
              style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.text3, maxWidth: 210, textAlign: 'right' }}
            >
              {trailing}
            </span>
          ) : null}

          {hasHandler ? (
            <StatusChip
              value={step.status}
              busy={edit.busyField === 'status'}
              disabled={!canEdit}
              onChange={(v) => edit.run('status', v)}
            />
          ) : null}

          {editable ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              title={open ? 'Hide details' : 'Edit notes'}
              style={{
                fontFamily: FONT_BODY,
                fontSize: 11,
                color: open ? T.text : T.text3,
                background: open ? T.bg3 : 'transparent',
                border: `1px solid ${open ? T.line : 'transparent'}`,
                borderRadius: 7,
                padding: '3px 7px',
                cursor: 'pointer',
                flexShrink: 0,
                lineHeight: 1.3,
              }}
            >
              {step.notes ? '✎•' : '✎'}
            </button>
          ) : null}

          {step.week ? (
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10.5,
                color: T.text3,
                border: `1px solid ${T.line2}`,
                borderRadius: 5,
                padding: '2px 6px',
                flexShrink: 0,
              }}
            >
              {step.week}
            </span>
          ) : null}
        </span>
      </div>

      {open && editable ? (
        <StepDetails
          notesDraft={edit.notesDraft}
          onNotesChange={edit.setNotesDraft}
          notesDirty={edit.notesDirty}
          notesConflict={edit.notesConflict}
          blockedDraft={edit.blockedDraft}
          onBlockedChange={edit.setBlockedDraft}
          blockedDirty={edit.blockedDirty}
          showBlockedBy={step.status === 'blocked'}
          busyField={edit.busyField}
          onSave={edit.run}
          onResetNotes={edit.resetNotes}
          onResetBlocked={edit.resetBlocked}
          onSaveNotesAgain={edit.saveNotesAgain}
          onLoadSheetNotes={edit.loadSheetNotes}
        />
      ) : null}
    </div>
  );
}
