// NewProjectForm.jsx — Add Project.
//
// The rules this form enforces (id pattern, name cap, the default sheet ranges,
// how a pasted URL becomes a sheet id) all come from shared/contract.js, which
// is the same module the server validates with. They used to be a second,
// hand-copied set of literals here — so tightening the server's id rule left
// this form happily accepting ids the API would then reject.
//
// The server is still the authority; this only lets us say "no" before a round
// trip, and say it next to the field.

import { useState } from 'react';

import {
  DEFAULT_KN_RANGE,
  DEFAULT_TRACKER_RANGE,
  ID_MAX,
  NAME_MAX,
  normalizeSheetId,
  SAFE_ID,
} from '../../shared/contract.js';
import { useTheme } from '../theme.jsx';
import { FONT_BODY, FONT_MONO } from '../tokens.js';
import { card, ghost, input, panelHeading, primary } from '../styles.js';
import Field from '../ui/Field.jsx';
import Notice from '../ui/Notice.jsx';
import { Spinner } from './StatusChip.jsx';
import SetupGuide from './SetupGuide.jsx';
import TemplateDownloads from './TemplateDownloads.jsx';

/** "My Analytics Project" -> "my-analytics-project" */
export function slugify(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, ID_MAX);
}

export default function NewProjectForm({ existingIds = [], onCreate, onCancel }) {
  const { T } = useTheme();

  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [idTouched, setIdTouched] = useState(false);
  const [sheet, setSheet] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [trackerRange, setTrackerRange] = useState(DEFAULT_TRACKER_RANGE);
  const [knRange, setKnRange] = useState(DEFAULT_KN_RANGE);

  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState(null);

  // The id follows the name until the user takes it over.
  const effectiveId = idTouched ? id : slugify(name);

  const idError = (() => {
    if (!effectiveId) return name ? 'Enter an id (letters, numbers, - and _).' : null;
    if (!SAFE_ID.test(effectiveId)) {
      return 'Only letters, numbers, hyphen and underscore — no spaces, dots or slashes.';
    }
    if (existingIds.includes(effectiveId)) return `A project with id "${effectiveId}" already exists.`;
    return null;
  })();

  const canSubmit = !busy && Boolean(name.trim()) && Boolean(effectiveId) && !idError;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setServerError(null);

    const res = await onCreate({
      id: effectiveId,
      name: name.trim(),
      spreadsheetId: normalizeSheetId(sheet),
      trackerRange: trackerRange.trim() || DEFAULT_TRACKER_RANGE,
      knRange: knRange.trim(),
    });

    setBusy(false);
    if (res && !res.ok) setServerError(res.error || 'Could not create that project.');
  };

  const showIdError = (idTouched || name) && idError;

  return (
    <form onSubmit={submit} style={{ ...card(T), padding: '20px 22px' }}>
      <h2 style={{ ...panelHeading(T), marginBottom: 4 }}>New project</h2>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.text2, marginBottom: 14 }}>
        One project = one Google Sheet with a tracker tab.
      </div>

      {/* Collapsed by default: anyone already set up just fills the form. */}
      <div style={{ marginBottom: 16 }}>
        <SetupGuide />
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Name" hint="What you'll see on the hub.">
          <input
            autoFocus
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Analytics Project"
            style={input(T, { size: 'roomy' })}
          />
        </Field>

        <Field
          label="Project id"
          hint="Becomes the filename projects/<id>.json. Suggested from the name — edit if you like."
          error={showIdError ? idError : null}
        >
          <input
            value={effectiveId}
            maxLength={ID_MAX}
            onChange={(e) => {
              setIdTouched(true);
              setId(e.target.value);
            }}
            placeholder="my-analytics-project"
            style={input(T, {
              size: 'roomy',
              fontFamily: FONT_MONO,
              borderColor: showIdError ? T.blocked : T.line,
            })}
          />
        </Field>

        <Field label="Google Sheet" hint="Paste the sheet URL or just its ID. Leave blank to add it later.">
          <input
            value={sheet}
            onChange={(e) => setSheet(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…  or  1AbC…"
            style={input(T, { size: 'roomy', fontFamily: FONT_MONO, fontSize: 11.5 })}
          />
          {sheet && normalizeSheetId(sheet) !== sheet.trim() ? (
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.done, marginTop: 5 }}>
              → id: {normalizeSheetId(sheet)}
            </div>
          ) : null}
        </Field>

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11.5,
              color: T.text2,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {showAdvanced ? '▾' : '▸'} Sheet ranges (defaults are usually right)
          </button>

          {showAdvanced ? (
            <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
              <Field label="Tracker range">
                <input
                  value={trackerRange}
                  onChange={(e) => setTrackerRange(e.target.value)}
                  placeholder={DEFAULT_TRACKER_RANGE}
                  style={input(T, { size: 'roomy', fontFamily: FONT_MONO, fontSize: 11.5 })}
                />
              </Field>
              <Field label="KN range" hint="Leave blank if this sheet has no known-issues tab.">
                <input
                  value={knRange}
                  onChange={(e) => setKnRange(e.target.value)}
                  placeholder={DEFAULT_KN_RANGE}
                  style={input(T, { size: 'roomy', fontFamily: FONT_MONO, fontSize: 11.5 })}
                />
              </Field>
            </div>
          ) : null}
        </div>
      </div>

      {/* A sheet built from the template parses on the first connect. */}
      <TemplateDownloads />

      {/* A4: the one step VPT cannot do for the user. */}
      <Notice
        tone="warn"
        title="One manual step after this"
        style={{ borderRadius: 9, padding: '11px 13px', marginTop: 16, marginBottom: 0 }}
        body={
          <>
            Share your Google Sheet with the service-account email as <strong>Editor</strong>, so VPT can
            read it and save your edits. That email is in your <code>service_account.json</code> under{' '}
            <code>client_email</code>. Without it the sheet will load as “not shared”.
          </>
        }
      />

      {serverError ? (
        <Notice
          tone="error"
          body={serverError}
          style={{ borderRadius: 9, padding: '10px 13px', marginTop: 12, marginBottom: 0 }}
        />
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
        <button type="submit" disabled={!canSubmit} style={primary(T, { color: T.done, disabled: !canSubmit, size: 'lg' })}>
          Create project
        </button>
        <button type="button" onClick={onCancel} style={ghost(T, { size: 'lg' })}>
          Cancel
        </button>
        {busy ? <Spinner color={T.done} /> : null}
      </div>
    </form>
  );
}
