import SectionCard from '../ui/SectionCard.jsx';
import StepRow from './StepRow.jsx';

/**
 * One "READY NOW" lane: a titled card holding the steps you could start now.
 * accent / accentSoft drive the colour identity (coral = deep, gold = gap).
 */
export default function LaneColumn({
  title,
  subtitle,
  accent,
  accentSoft,
  steps = [],
  emptyText,
  canEdit = true,
  onEdit,
}) {
  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      accent={accent}
      accentSoft={accentSoft}
      count={steps.length}
      empty={emptyText}
      style={{ flex: 1, minWidth: 320 }}
    >
      {steps.map((s) => (
        <StepRow
          key={s.id}
          step={s}
          accent={accent}
          canEdit={canEdit}
          onEdit={onEdit ? (field, value) => onEdit(s.id, field, value) : undefined}
        />
      ))}
    </SectionCard>
  );
}
