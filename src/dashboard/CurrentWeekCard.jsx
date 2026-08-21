import { useTheme } from '../theme.jsx';
import { FONT_BODY, FONT_DISPLAY } from '../tokens.js';
import { card, eyebrow, primary } from '../styles.js';

/**
 * "You're in W3" — the third card in the dashboard's top row.
 *
 * Carries the fix for "a new project shows a blank week and you have to go edit
 * JSON": when there is no schedule the figure is replaced by a button that
 * opens the editor, right where the gap shows up.
 */
export default function CurrentWeekCard({ currentWeek, hasSchedule, onEditSchedule }) {
  const { T } = useTheme();

  // The week label is a string or null from the backend; anything else is a
  // malformed payload, and React throws outright on an object child.
  const week = typeof currentWeek === 'string' || typeof currentWeek === 'number' ? String(currentWeek) : '';

  return (
    <section style={{ ...card(T), padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={eyebrow(T)}>Current week</div>

      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 82,
          fontWeight: 700,
          lineHeight: 0.92,
          color: T.deep,
          marginTop: 'auto',
          paddingTop: 16,
        }}
      >
        {week || '—'}
      </div>

      <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.text2, marginTop: 12 }}>
        {week
          ? `You're in ${week}.`
          : hasSchedule
            ? 'Before the first tracked week.'
            : 'No schedule set.'}
      </div>

      {week ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.text3, marginTop: 4 }}>
          Work scheduled for {week} or earlier counts as on schedule.
        </div>
      ) : (
        <button
          type="button"
          onClick={onEditSchedule}
          style={{ ...primary(T), marginTop: 8, alignSelf: 'flex-start' }}
        >
          {hasSchedule ? 'Edit schedule' : 'Add a schedule →'}
        </button>
      )}
    </section>
  );
}
