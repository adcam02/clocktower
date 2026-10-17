import { ui, useUI } from '../state/ui';
import { useView } from '../state/view';

export function PickBanner() {
  const pick = useUI((s) => s.pick);
  const view = useView();
  if (!pick) return null;
  const name = (id: string | null) => (id ? view.seats.find((s) => s.id === id)?.label ?? 'Someone' : 'The Storyteller');
  const text =
    pick.kind === 'nominee'
      ? `Who did ${name(pick.nominatorId)} nominate?`
      : pick.kind === 'swap'
        ? `Swap ${name(pick.seatId)}’s seat with…`
        : pick.kind === 'move'
          ? `Move ${name(pick.seatId)} to which seat?`
          : `Swap ${name(pick.seatId)}’s character with…`;
  return (
    <div className="pick-banner surface" role="status">
      <span>{text}</span>
      <button className="btn small quiet" onClick={() => ui.pick(null)}>
        Cancel
      </button>
    </div>
  );
}
