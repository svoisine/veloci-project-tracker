import { useTheme } from '../theme.jsx';
import SectionCard from '../ui/SectionCard.jsx';
import StepRow from './StepRow.jsx';

/** An implicit block reads "waiting on X"; anything else is a hard block. */
const isHardBlock = (item) => !String(item.reason || '').startsWith('waiting on');

/**
 * Explicit blocks (status=blocked) read in the blocked colour; implicit
 * "waiting on <prereq>" ones read dim. Both are editable — unblocking a step
 * from here is the whole point.
 */
export default function BlockedList({ items = [], canEdit = true, onEdit }) {
  const { T } = useTheme();

  return (
    <SectionCard
      title="Blocked / Waiting"
      accent={T.blocked}
      accentSoft={T.blockedSoft}
      count={items.length}
      empty="Nothing blocked — the path is clear."
    >
      {items.map((item) => {
        const hard = isHardBlock(item);
        return (
          <StepRow
            key={item.id}
            step={item}
            accent={hard ? T.blocked : T.text3}
            marker={hard ? '✗' : '·'}
            dim={!hard}
            trailing={item.reason}
            canEdit={canEdit}
            onEdit={onEdit ? (field, value) => onEdit(item.id, field, value) : undefined}
          />
        );
      })}
    </SectionCard>
  );
}
