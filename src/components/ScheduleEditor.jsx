// ScheduleEditor.jsx — the project's schedule and milestones, editable without
// touching JSON by hand.
//
// Everything here is LOCAL CONFIG only: it writes projects/<id>.json through
// PATCH /api/projects/:id and POST /api/projects/:id/schedule. No path from this
// panel reaches the Google Sheet.
//
// This file is the panel and the two save calls; the two editors it contains
// are schedule/MilestonesEditor.jsx and schedule/WeeksEditor.jsx.

import { useEffect, useState } from 'react';

import { useTheme } from '../theme.jsx';
import { patch, post, projectPath } from '../api.js';
import { FONT_BODY } from '../tokens.js';
import { card, ghost, panelHeading } from '../styles.js';
import Notice from '../ui/Notice.jsx';
import MilestonesEditor from './schedule/MilestonesEditor.jsx';
import WeeksEditor from './schedule/WeeksEditor.jsx';

/**
 * The registry already drops junk milestone entries, but this panel is the one
 * that would white-screen on a bad one — so it does not take that on trust.
 */
const asRows = (project) => {
  const list = Array.isArray(project?.milestones) ? project.milestones : [];
  return list
    .filter((m) => m && typeof m === 'object' && !Array.isArray(m))
    .map((m) => ({ date: String(m.date ?? ''), label: String(m.label ?? '') }));
};

const asWeeks = (project) => {
  const w = project?.weekStarts;
  if (!w || typeof w !== 'object' || Array.isArray(w)) return {};
  return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)]));
};

export default function ScheduleEditor({ projectId, project, onSaved, onClose }) {
  const { T } = useTheme();

  const [milestones, setMilestones] = useState(() => asRows(project));
  const [weekStarts, setWeekStarts] = useState(() => asWeeks(project));
  const [gen, setGen] = useState({ start: '', weeks: 14, includeW0: true });

  const [busy, setBusy] = useState(null); // 'milestones' | 'weeks' | 'generate'
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    setMilestones(asRows(project));
    setWeekStarts(asWeeks(project));
  }, [project]);

  const say = (text) => {
    setFlash(text);
    setTimeout(() => setFlash(null), 4000);
  };

  /** Both saves share this: mark busy, call, adopt the result or show why not. */
  const save = async (which, call, onOk) => {
    setBusy(which);
    setError(null);
    const json = await call();
    setBusy(null);

    if (!json.ok) {
      setError(json.error || 'Could not save.');
      return;
    }
    onSaved?.(json.project);
    onOk?.(json);
  };

  const savePatch = (body, which) =>
    save(which, () => patch(projectPath(projectId), body), () => say('Saved.'));

  const generate = () =>
    save(
      'generate',
      () =>
        post(projectPath(projectId, '/schedule'), {
          startDate: gen.start,
          weeks: Number(gen.weeks),
          includeW0: gen.includeW0,
        }),
      (json) => {
        setWeekStarts(json.weekStarts || {});
        say(`Generated ${Object.keys(json.weekStarts || {}).length} weeks.`);
      }
    );

  return (
    <section style={{ ...card(T), padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h2 style={{ ...panelHeading(T), flex: 1 }}>Schedule &amp; milestones</h2>
        {flash ? (
          <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600, color: T.done }}>
            {flash}
          </span>
        ) : null}
        <button type="button" onClick={onClose} style={ghost(T)}>
          Close
        </button>
      </div>

      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.text2, marginBottom: 18, lineHeight: 1.5 }}>
        Saved to <code style={{ color: T.text }}>projects/{projectId}.json</code> on this machine.{' '}
        <strong>Your Google Sheet is not touched.</strong>
      </div>

      {error ? <Notice tone="error" body={error} style={{ borderRadius: 9, padding: '10px 13px' }} /> : null}

      <MilestonesEditor
        milestones={milestones}
        setMilestones={setMilestones}
        busy={busy}
        onSave={() => savePatch({ milestones }, 'milestones')}
      />

      <WeeksEditor
        weekStarts={weekStarts}
        setWeekStarts={setWeekStarts}
        gen={gen}
        setGen={setGen}
        busy={busy}
        onGenerate={generate}
        onSave={() => savePatch({ weekStarts }, 'weeks')}
      />
    </section>
  );
}
