import { getRole, TEAM_SINGULAR } from '../data';
import { player } from '../net/client';
import { ui } from '../state/ui';
import { useView } from '../state/view';
import { Icon } from './Icon';
import { RichText } from './RichText';
import { Token } from './Token';

export function MyCharacter() {
  const view = useView();
  const me = view.seats.find((s) => s.isMe);
  const role = getRole(me?.roleId);
  const fabled = view.fabled.map((id) => getRole(id)).filter(Boolean);

  return (
    <aside className="my-character">
      {fabled.length > 0 && (
        <div className="my-fabled">
          {fabled.map((f) => (
            <button key={f!.id} className="bluff-slot" title={f!.name} onClick={() => ui.open({ kind: 'role', roleId: f!.id })}>
              <Token roleId={f!.id} />
            </button>
          ))}
        </div>
      )}
      {!me ? (
        <div className="my-card surface hint">
          <Icon name="pin" />
          <p>Click an empty seat to sit down.</p>
        </div>
      ) : role ? (
        <button className={`my-card surface align-${me.alignment ?? 'none'}`} onClick={() => ui.open({ kind: 'role', roleId: role.id })}>
          <Token roleId={role.id} alignment={me.alignment} dead={me.dead} />
          <div className="my-text">
            <span className="eyebrow">
              You are the {me.alignment ? (me.alignment === 'good' ? 'good ' : 'evil ') : ''}
              {TEAM_SINGULAR[role.team]}
            </span>
            <strong>{role.name}</strong>
            <p>
              <RichText text={role.ability} />
            </p>
          </div>
        </button>
      ) : (
        <div className="my-card surface hint">
          <Token roleId={null} />
          <p>{view.revealed ? 'Your character is on its way…' : 'Your character will appear here when the Storyteller hands them out.'}</p>
        </div>
      )}
    </aside>
  );
}

export function VoteBar() {
  const view = useView();
  const n = view.nomination;
  const me = view.seats.find((s) => s.isMe);
  if (!n || !me || n.status === 'done') return null;
  const nominee = view.seats.find((s) => s.id === n.nomineeId);
  const up = n.votes.includes(me.id);
  const locked = n.locked.includes(me.id);
  const canVote = !me.dead || me.ghostVote;
  let note = '';
  if (locked) note = up ? 'Your vote is in.' : 'The hand has passed you.';
  else if (!canVote) note = 'You have used your ghost vote.';
  else if (me.dead) note = 'Voting uses your one ghost vote.';
  return (
    <div className="vote-bar surface">
      <div className="vote-q">
        <span className="vote-ask">
          Execute <b className="blood">{nominee?.label}</b>?
        </span>
        {note && <span>{note}</span>}
      </div>
      <button
        className={`btn big ${up ? 'primary' : ''}`}
        disabled={locked || (!canVote && !up)}
        onClick={() => player.vote(!up)}
      >
        <Icon name="hand" /> {up ? 'Hand raised' : 'Raise hand'}
      </button>
    </div>
  );
}
