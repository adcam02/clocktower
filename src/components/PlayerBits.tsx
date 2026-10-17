import { getRole, TEAM_SINGULAR } from '../data';
import { player } from '../net/client';
import { ui, useUI, type Panel } from '../state/ui';
import { useView } from '../state/view';
import { Icon, type IconName } from './Icon';
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
  const myTurn = n.status !== 'idle' && n.status !== 'countdown' && n.step > 0 && n.order[n.step - 1] === me.id && !locked;
  let note = '';
  if (locked) note = up ? 'Your vote is in.' : 'The hand has passed you.';
  else if (!canVote) note = 'You have used your ghost vote.';
  else if (myTurn) note = 'The hand is on you. You can still change your mind.';
  else if (me.dead) note = 'Voting uses your one ghost vote.';
  return (
    <div className={`vote-bar surface ${myTurn ? 'my-turn' : ''}`}>
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

/** The player's menu: big, labelled buttons down the right side (along the bottom on phones). */
export function PlayerRail() {
  const view = useView();
  const panel = useUI((s) => s.panel);
  const muted = useUI((s) => s.muted);
  const me = view.seats.find((s) => s.isMe);
  const open = (p: Exclude<Panel, null>) => () => ui.togglePanel(p);
  const items: { key: string; icon: IconName; label: string; on?: boolean; disabled?: boolean; action: () => void }[] = [
    {
      key: 'me',
      icon: 'user',
      label: 'Me',
      disabled: !me?.roleId,
      action: () => me?.roleId && ui.open({ kind: 'role', roleId: me.roleId }),
    },
    { key: 'reference', icon: 'book', label: 'Characters', on: panel === 'reference', action: open('reference') },
    { key: 'notes', icon: 'notepad', label: 'Notepad', on: panel === 'notes', action: open('notes') },
    { key: 'journal', icon: 'scroll', label: 'Storyteller info', on: panel === 'journal', action: open('journal') },
    { key: 'history', icon: 'vote', label: 'Votes', on: panel === 'history', action: open('history') },
    { key: 'sound', icon: muted ? 'mute' : 'volume', label: muted ? 'Sound off' : 'Sound on', action: () => useUI.setState({ muted: !muted }) },
    { key: 'settings', icon: 'cog', label: 'Settings', action: () => ui.open({ kind: 'settings' }) },
  ];
  return (
    <nav className="player-rail surface" aria-label="Menu">
      {items.map((it) => (
        <button key={it.key} className={`rail-item ${it.on ? 'on' : ''}`} onClick={it.action} disabled={it.disabled} aria-pressed={it.on}>
          <Icon name={it.icon} />
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
