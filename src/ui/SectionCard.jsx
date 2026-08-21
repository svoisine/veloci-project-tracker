import { useTheme } from '../theme.jsx';
import { card, countChip, dot, emptyLine, hintText, listDivider, sectionHeading } from '../styles.js';

/**
 * The card every list on the dashboard is drawn in: a colour-coded dot, an
 * uppercase heading, a count pill, an optional subtitle, then a hairline and
 * the list itself.
 *
 * LaneColumn, BlockedList, KnList and the two inline sections in App each had
 * their own copy of this chrome — four near-identical blocks that had already
 * drifted apart in padding and empty-state wording. One card, four callers.
 *
 * `count` is shown as a pill when given; pass `null` for a section that isn't
 * counting anything (Pull Ahead). `empty` is rendered in place of children when
 * `count === 0`.
 */
export default function SectionCard({
  title,
  subtitle,
  accent,
  accentSoft,
  count = null,
  empty = null,
  // Pull Ahead dims its dot but keeps the heading a step brighter, so the
  // heading colour can be set apart from the accent. Defaults to the accent.
  headingColor,
  style,
  children,
}) {
  const { T } = useTheme();
  const isEmpty = count === 0 && empty !== null;

  return (
    <section style={{ ...card(T), padding: '18px 20px 14px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtitle ? 4 : 10 }}>
        <span style={dot(accent)} />
        <h2 style={sectionHeading(headingColor || accent)}>{title}</h2>
        {count === null ? null : <span style={countChip(accent, accentSoft)}>{count}</span>}
      </div>

      {subtitle ? (
        <div style={{ ...hintText(T), marginBottom: 12, paddingLeft: 17 }}>{subtitle}</div>
      ) : null}

      <div style={listDivider(T)}>
        {isEmpty ? <div style={emptyLine(T)}>{empty}</div> : children}
      </div>
    </section>
  );
}
