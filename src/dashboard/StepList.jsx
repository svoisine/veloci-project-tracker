import SectionCard from '../ui/SectionCard.jsx';
import StepRow from '../components/StepRow.jsx';

/**
 * A section card holding step rows — the In Progress and Pull Ahead blocks.
 *
 * Both were written out inline in App.jsx with their own copy of the card,
 * heading and row loop. The only real differences are the marker glyph and
 * whether the rows are dimmed, so they are props.
 */
export default function StepList({
  title,
  subtitle,
  accent,
  accentSoft,
  headingColor,
  steps,
  marker,
  dim = false,
  showCount = true,
  canEdit,
  onEdit,
  style,
}) {
  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      accent={accent}
      accentSoft={accentSoft}
      headingColor={headingColor}
      count={showCount ? steps.length : null}
      style={style}
    >
      {steps.map((s) => (
        <StepRow
          key={s.id}
          step={s}
          accent={accent}
          marker={marker}
          dim={dim}
          canEdit={canEdit}
          onEdit={(field, value) => onEdit(s.id, field, value)}
        />
      ))}
    </SectionCard>
  );
}
