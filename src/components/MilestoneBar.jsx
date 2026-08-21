import { useTheme } from '../theme.jsx';
import { FONT_DISPLAY, FONT_BODY } from '../tokens.js';
import { card, eyebrow, primary } from '../styles.js';

function prettyDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// TL: one unit only — days. The big figure never reads negative; a milestone
// that has slipped past today counts up as "N days ago" instead.
function countdown(daysLeft) {
  const n = Number(daysLeft);
  if (!Number.isFinite(n)) return { figure: '—', unit: '' };
  if (n === 0) return { figure: 'Today', unit: '' };
  const abs = Math.abs(n);
  const noun = abs === 1 ? 'day' : 'days';
  return { figure: abs, unit: n < 0 ? `${noun} ago` : noun };
}

export default function MilestoneBar({ milestone, projectId, onEditSchedule }) {
  const { T } = useTheme();

  // M3: name the file that actually belongs to the open project. Before the
  // hub existed a single filename could be hardcoded here; with several
  // projects that would be wrong for all but one of them.
  const configFile = `projects/${projectId || '<project>'}.json`;

  const count = countdown(milestone ? milestone.daysLeft : NaN);

  return (
    <section style={{ ...card(T), padding: '18px 20px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={eyebrow(T)}>Next milestone</div>

      {!milestone ? (
        // M4: milestones are editable in the app now, so point at the editor
        // rather than telling the user to go and hand-edit JSON.
        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.text3, lineHeight: 1.5 }}>
            {onEditSchedule ? (
              'No upcoming milestone.'
            ) : (
              <>
                No upcoming milestone — add or update{' '}
                <code style={{ color: T.text2 }}>milestones</code> in{' '}
                <code style={{ color: T.text2 }}>{configFile}</code>.
              </>
            )}
          </div>
          {onEditSchedule ? (
            <button type="button" onClick={onEditSchedule} style={{ ...primary(T), marginTop: 10 }}>
              Add a milestone →
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13.5,
              lineHeight: 1.4,
              color: T.deep,
              marginTop: 10,
              minHeight: 38,
            }}
          >
            {milestone.label}
          </div>

          <div
            style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 'auto', paddingTop: 14 }}
          >
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 54,
                fontWeight: 700,
                lineHeight: 0.9,
                color: T.text,
              }}
            >
              {count.figure}
            </span>
            {count.unit ? (
              <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.text2 }}>{count.unit}</span>
            ) : null}
          </div>

          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.text3, marginTop: 10 }}>
            {prettyDate(milestone.date)}
          </div>
        </>
      )}
    </section>
  );
}
