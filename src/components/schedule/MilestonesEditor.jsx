import { useTheme } from '../../theme.jsx';
import { LABEL_MAX } from '../../../shared/contract.js';
import { FONT_BODY, FONT_MONO } from '../../tokens.js';
import { ghost, input, primary } from '../../styles.js';
import { Spinner } from '../StatusChip.jsx';
import Group from './Group.jsx';

/** The milestone rows plus their add/save controls. */
export default function MilestonesEditor({ milestones, setMilestones, busy, onSave }) {
  const { T } = useTheme();
  const saving = busy === 'milestones';

  const edit = (i, patch) =>
    setMilestones(milestones.map((m, n) => (n === i ? { ...m, ...patch } : m)));

  return (
    <Group title="Milestones" hint="The countdown on the dashboard uses the next one still ahead.">
      {milestones.length === 0 ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.text3, padding: '6px 0 10px' }}>
          No milestones yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
          {milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={m.date}
                onChange={(e) => edit(i, { date: e.target.value })}
                style={input(T, { fontFamily: FONT_MONO, width: 160, flexShrink: 0 })}
              />
              <input
                value={m.label}
                maxLength={LABEL_MAX}
                placeholder="What happens on this date"
                onChange={(e) => edit(i, { label: e.target.value })}
                style={input(T, { flex: 1, minWidth: 200 })}
              />
              <button
                type="button"
                title="Remove this milestone"
                onClick={() => setMilestones(milestones.filter((_, n) => n !== i))}
                style={{ ...ghost(T), color: T.blocked, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setMilestones([...milestones, { date: '', label: '' }])}
          style={ghost(T)}
        >
          + Add milestone
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          style={primary(T, { color: T.done, disabled: saving })}
        >
          Save milestones
        </button>
        {saving ? <Spinner color={T.done} /> : null}
      </div>
    </Group>
  );
}
