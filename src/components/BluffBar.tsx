import { genericIcon, getRole } from '../data';
import { evilInfoStatus } from '../lib/evilInfo';
import { demonInfo, minionInfo, wholeEvilTeam } from '../lib/presets';
import { seatName, st, useHost } from '../state/host';
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
      <EvilChecklist />
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

/** A reminder that stays up on the first night until the evil team has been shown each other and the bluffs. */
function EvilChecklist() {
  const g = useHost((s) => s.g);
  const s = evilInfoStatus(g);
  if (!s.missing) return null;
  const demon = s.demons.map((d) => seatName(g, d.id)).join(' & ');
  return (
    <div className="evil-check surface" role="status">
      <span className="eyebrow">Don’t forget</span>
      {!s.minionsShown && !s.bluffsShown && (
        <button
          className="evil-item together"
          onClick={() => {
            const p = wholeEvilTeam();
            ui.wake(p.to, p.panels, null, p.extra);
          }}
        >
          <img src={genericIcon('evil')} alt="" />
          <span>Wake the evil team together, with {demon}’s bluffs</span>
          <em>Together</em>
        </button>
      )}
      {!s.minionsShown && (
        <button
          className="evil-item"
          onClick={() => {
            const p = minionInfo();
            ui.wake(p.to, p.panels);
          }}
        >
          <img src={genericIcon('minion')} alt="" />
          <span>Show the Minions their Demon</span>
          <em>Minion info</em>
        </button>
      )}
      {!s.bluffsShown && (
        <button
          className="evil-item"
          onClick={() => {
            const p = demonInfo();
            ui.wake(p.to, p.panels);
          }}
        >
          <img src={genericIcon('demon')} alt="" />
          <span>Give {demon} {s.bluffsChosen ? 'these' : 'three'} bluffs</span>
          <em>Demon info</em>
        </button>
      )}
    </div>
  );
}
