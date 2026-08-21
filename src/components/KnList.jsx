import { useTheme } from '../theme.jsx';
import { FONT_BODY, FONT_MONO } from '../tokens.js';
import SectionCard from '../ui/SectionCard.jsx';

const LOUD = new Set(['high', 'critical']);

/** React throws on an object child, so anything from the sheet is stringified. */
const text = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? '' : String(v));

/** Read-only in M2 — KN rows are not editable from the dashboard. */
export default function KnList({ items = [] }) {
  const { T } = useTheme();

  // A junk entry (null, a string) would take the whole card down on `kn.id`.
  // Rows the UI cannot draw are skipped rather than crashing the ones it can.
  const rows = (Array.isArray(items) ? items : []).filter((kn) => kn && typeof kn === 'object');

  return (
    <SectionCard
      title="Open Known Issues"
      accent={T.progress}
      accentSoft={T.progressSoft}
      count={rows.length}
      empty="None open — nice."
    >
      {rows.map((kn, i) => (
        <KnRow key={kn.id || i} kn={kn} />
      ))}
    </SectionCard>
  );
}

function KnRow({ kn }) {
  const { T } = useTheme();
  const loud = LOUD.has(String(kn.severity || '').toLowerCase());
  const c = loud ? T.blocked : T.progress;
  const soft = loud ? T.blockedSoft : T.progressSoft;

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '9px 0' }}>
      <span style={{ color: c, fontSize: 12, flexShrink: 0 }}>!</span>

      {/* Shrinkable: minWidth aligns normal ids, but a long one from the sheet
          must wrap rather than widen the page. */}
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: c, minWidth: 62, flexShrink: 1 }}>
        {text(kn.id)}
      </span>

      {kn.severity ? (
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: c,
            background: soft,
            borderRadius: 4,
            padding: '2px 6px',
            flexShrink: 1,
          }}
        >
          {text(kn.severity)}
        </span>
      ) : null}

      <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: T.text, flex: 1, lineHeight: 1.45 }}>
        {text(kn.title)}
      </span>

      {kn.blocks ? (
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.text3, flexShrink: 1 }}>
          blocks {text(kn.blocks)}
        </span>
      ) : null}
    </div>
  );
}
