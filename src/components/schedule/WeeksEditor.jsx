import { useTheme } from '../../theme.jsx';
import { MAX_WEEKS } from '../../../shared/contract.js';
import { FONT_BODY, FONT_MONO } from '../../tokens.js';
import { fieldLabel, ghost, input, primary } from '../../styles.js';
import { Spinner } from '../StatusChip.jsx';
import Field from '../../ui/Field.jsx';
import Group from './Group.jsx';

/** Week keys in numeric order — "W10" must not sort before "W2". */
const inWeekOrder = (weekStarts) =>
  Object.keys(weekStarts).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

/**
 * The week generator and the editable list it produces.
 *
 * Weeks use a generator rather than a 14-row form — every schedule VPT has seen
 * is just 7-day increments, and typing fourteen dates by hand is the tedium this
 * is meant to remove. Generated dates remain individually editable afterwards.
 */
export default function WeeksEditor({
  weekStarts,
  setWeekStarts,
  gen,
  setGen,
  busy,
  onGenerate,
  onSave,
}) {
  const { T } = useTheme();
  const weekKeys = inWeekOrder(weekStarts);
  const generating = busy === 'generate';
  const saving = busy === 'weeks';

  return (
    <Group title="Week schedule" hint="Generates W1…Wn on 7-day steps. This is what drives “You're in W3”.">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Field label="Week 1 starts">
          <input
            type="date"
            value={gen.start}
            onChange={(e) => setGen({ ...gen, start: e.target.value })}
            style={input(T, { fontFamily: FONT_MONO, width: 160 })}
          />
        </Field>
        <Field label="How many weeks">
          <input
            type="number"
            min={1}
            max={MAX_WEEKS}
            value={gen.weeks}
            onChange={(e) => setGen({ ...gen, weeks: e.target.value })}
            style={input(T, { fontFamily: FONT_MONO, width: 90 })}
          />
        </Field>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: FONT_BODY,
            fontSize: 12,
            color: T.text2,
            paddingBottom: 9,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={gen.includeW0}
            onChange={(e) => setGen({ ...gen, includeW0: e.target.checked })}
          />
          also add W0 (the week before)
        </label>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!gen.start || generating}
          style={{ ...primary(T, { disabled: !gen.start || generating }), marginBottom: 9 }}
        >
          Generate &amp; save
        </button>
        {generating ? (
          <span style={{ paddingBottom: 9 }}>
            <Spinner color={T.deep} />
          </span>
        ) : null}
      </div>

      {weekKeys.length === 0 ? null : (
        <div style={{ marginTop: 14 }}>
          <div style={{ ...fieldLabel(T), marginBottom: 7 }}>
            {weekKeys.length} week{weekKeys.length === 1 ? '' : 's'} — edit any date individually
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
              gap: 7,
              maxHeight: 230,
              overflowY: 'auto',
              paddingRight: 4,
            }}
          >
            {weekKeys.map((k) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: T.gap, minWidth: 30, flexShrink: 0 }}
                >
                  {k}
                </span>
                <input
                  type="date"
                  value={weekStarts[k]}
                  onChange={(e) => setWeekStarts({ ...weekStarts, [k]: e.target.value })}
                  style={input(T, { fontFamily: FONT_MONO, fontSize: 11.5, padding: '6px 8px' })}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              style={primary(T, { color: T.done, disabled: saving })}
            >
              Save week dates
            </button>
            <button type="button" onClick={() => setWeekStarts({})} style={ghost(T)}>
              Clear all
            </button>
            {saving ? <Spinner color={T.done} /> : null}
          </div>
        </div>
      )}
    </Group>
  );
}
