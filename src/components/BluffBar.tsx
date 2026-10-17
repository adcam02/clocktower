import { getRole } from '../data';
import { st, useHost } from '../state/host';
import { ui, useUI } from '../state/ui';
import { Icon } from './Icon';
import { Token } from './Token';

/** Storyteller's corner: the Demon's bluffs and any Fabled in play. */
export function BluffBar() {
  const bluffs = useHost((s) => s.g.bluffs);
  const fabled = useHost((s) => s.g.fabled);
  const hidden = useUI((s) => s.hideGrimoire);
  if (hidden) return null;
  return (
    <aside className="bluff-bar">
      <div className="bluff-group">
        <span className="eyebrow">Demon bluffs</span>
        <div className="bluff-slots">
          {bluffs.map((id, i) => (
            <button
              key={i}
              className="bluff-slot"
              onClick={() => ui.open({ kind: 'bluff', index: i })}
              title={id ? `${getRole(id)?.name}: click to change` : 'Choose a bluff'}
            >
              <Token roleId={id} blank="empty" />
              {!id && <Icon name="plus" className="bluff-plus" />}
            </button>
          ))}
          <button className="btn small square" title="Pick three bluffs at random" aria-label="Pick three bluffs at random" onClick={st.randomBluffs}>
            <Icon name="dice" />
          </button>
        </div>
      </div>
      <div className="bluff-group">
        <span className="eyebrow">Fabled</span>
        <div className="bluff-slots">
          {fabled.map((id) => (
            <button key={id} className="bluff-slot" onClick={() => ui.open({ kind: 'role', roleId: id })} title={getRole(id)?.name}>
              <Token roleId={id} />
            </button>
          ))}
          <button className="bluff-slot add" onClick={() => ui.open({ kind: 'fabled' })} title="Add a Fabled">
            <Token roleId={null} blank="empty" />
            <Icon name="plus" className="bluff-plus" />
          </button>
        </div>
      </div>
    </aside>
  );
}
