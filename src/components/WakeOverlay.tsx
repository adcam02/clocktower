import { useEffect, useState } from 'react';
import { getRole, TEAM_SINGULAR } from '../data';
import { loadJSON, saveJSON } from '../lib/util';
import { player, useClient } from '../net/client';
import type { WakeMessage, WakeReply } from '../state/types';
import { useView } from '../state/view';
import { CharacterGrid } from './CharacterGrid';
import { Icon } from './Icon';
import { askText, PanelView } from './PanelView';
import { RichText } from './RichText';
import { Token } from './Token';

export function WakeOverlay() {
  const priv = useClient((s) => s.priv);
  const [hidden, setHidden] = useState<string | null>(null);
  const wake = priv?.wake ?? null;
  const reply = wake ? priv?.replies.find((r) => r.wakeId === wake.id) : undefined;

  return (
    <>
      <RoleReveal />
      {wake && hidden === wake.id && (
        <button className="awake-pill" onClick={() => setHidden(null)}>
          <Icon name="eye" /> You’re awake. Open
        </button>
      )}
      {wake && hidden !== wake.id && (
        <div className="wake-overlay" key={wake.id}>
          <div className="wake-sheet">
            <div className="wake-eyebrow">
              <span className="eyebrow">{wake.when}</span>
              <span>The Storyteller wakes you</span>
            </div>
            <PanelView message={wake} seatFor={priv?.seatId} />
            {wake.ask && <AskBox wake={wake} reply={reply} />}
            <footer className="wake-foot">
              {priv?.wakeSeen ? (
                <span className="wake-seen">
                  <Icon name="check" /> The Storyteller knows you’ve seen this
                </span>
              ) : (
                <button className="btn primary big" onClick={() => player.ack(wake.id)}>
                  <Icon name="check" /> Got it
                </button>
              )}
              <button className="btn quiet" onClick={() => setHidden(wake.id)}>
                <Icon name="sleep" /> Close my eyes
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function AskBox({ wake, reply }: { wake: WakeMessage; reply?: WakeReply }) {
  const view = useView();
  const ask = wake.ask!;
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState(!reply);
  useEffect(() => setEditing(!reply), [reply]);
  const count = ask.kind === 'yesno' ? 1 : ask.count;
  const pick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : count === 1 ? [id] : p.length < count ? [...p, id] : p));

  if (!editing && reply) {
    const parts = [
      ...(reply.seatIds ?? []).map((id) => view.seats.find((s) => s.id === id)?.label ?? 'Someone'),
      ...(reply.roleIds ?? []).map((id) => getRole(id)?.name ?? id),
      ...(reply.answer !== undefined ? [reply.answer ? 'Yes' : 'No'] : []),
    ];
    return (
      <div className="ask-box answered">
        <span>
          You answered <b>{parts.join(', ')}</b>
        </span>
        <button className="btn small quiet" onClick={() => (setPicked([]), setEditing(true))}>
          Change answer
        </button>
      </div>
    );
  }

  return (
    <div className="ask-box">
      <h3>{askText(ask)}</h3>
      {ask.kind === 'yesno' ? (
        <div className="ask-yesno">
          <button className="btn big sapphire" onClick={() => player.reply(wake.id, { answer: true })}>
            Yes
          </button>
          <button className="btn big blood" onClick={() => player.reply(wake.id, { answer: false })}>
            No
          </button>
        </div>
      ) : (
        <>
          {ask.kind === 'players' ? (
            <div className="ask-seats">
              {view.seats.map((s) => (
                <button key={s.id} className={`ask-seat ${picked.includes(s.id) ? 'on' : ''} ${s.dead ? 'dead' : ''}`} onClick={() => pick(s.id)}>
                  <span className="ask-num">{s.index + 1}</span>
                  {s.label}
                  {s.isMe && <em>you</em>}
                </button>
              ))}
            </div>
          ) : (
            <div className="ask-chars">
              <CharacterGrid ids={view.script.roles} size={58} selected={picked} onPick={pick} />
            </div>
          )}
          <button
            className="btn primary"
            disabled={picked.length !== count}
            onClick={() => player.reply(wake.id, ask.kind === 'players' ? { seatIds: picked } : { roleIds: picked })}
          >
            Send {picked.length === count ? '' : `(${picked.length} of ${count})`}
          </button>
        </>
      )}
    </div>
  );
}

/** The moment a player first sees their character, or learns it has changed. */
function RoleReveal() {
  const view = useView();
  const me = view.seats.find((s) => s.isMe);
  const key = `clocktower:seen-role:${view.room}`;
  const [seen, setSeen] = useState<Record<string, string>>(() => loadJSON(key, {}));
  const role = getRole(me?.roleId);
  if (!me || !role || seen[me.id] === role.id) return null;
  const changed = Boolean(seen[me.id]);
  const done = () => {
    const next = { ...seen, [me.id]: role.id };
    setSeen(next);
    saveJSON(key, next);
  };
  return (
    <div className="reveal-overlay" onClick={done}>
      <div className="reveal-card" onClick={(e) => e.stopPropagation()}>
        <span className="eyebrow">{changed ? 'Your character has changed' : 'Your character'}</span>
        <div className="reveal-flip">
          <div className="reveal-back">
            <Token roleId={null} />
          </div>
          <div className="reveal-front">
            <Token roleId={role.id} alignment={me.alignment} />
          </div>
        </div>
        <h2>
          You are the <span className={me.alignment === 'evil' ? 'blood' : 'sapphire'}>{role.name}</span>
        </h2>
        <span className={`reveal-team ${me.alignment ?? ''}`}>
          {me.alignment === 'evil' ? 'Evil' : me.alignment === 'good' ? 'Good' : ''} {TEAM_SINGULAR[role.team]}
        </span>
        <p>
          <RichText text={role.ability} />
        </p>
        <button className="btn primary big" onClick={done}>
          Keep it secret
        </button>
      </div>
    </div>
  );
}
