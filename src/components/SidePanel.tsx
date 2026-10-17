import { useState } from 'react';
import { editionLogo, getRole, jinxesFor, nightOrderList, nightReminder, NIGHT_SPECIALS, rolesByTeam, TEAM_LABEL, TEAMS, genericIcon } from '../data';
import { demonInfo, minionInfo, presetFor, wholeEvilTeam } from '../lib/presets';
import { evilInfoStatus } from '../lib/evilInfo';
import { seatName, seatsWithRole, st, useHost } from '../state/host';
import { ui, useUI, type Panel } from '../state/ui';
import { useView } from '../state/view';
import { Icon } from './Icon';
import { Journal, Notepad } from './Notepad';
import { PanelView, ReplyLine } from './PanelView';
import { RichText } from './RichText';
import { Token } from './Token';

export function SidePanel() {
  const panel = useUI((s) => s.panel);
  const view = useView();
  if (!panel) return null;
  const tabs: { id: Exclude<Panel, null>; label: string }[] = [
    ...(view.mode === 'st' ? [{ id: 'night' as const, label: 'Night order' }] : []),
    { id: 'reference', label: 'Characters' },
    { id: 'history', label: view.mode === 'st' ? 'Log' : 'Votes' },
  ];
  const active = view.mode === 'player' || tabs.some((t) => t.id === panel) ? panel : 'reference';
  const titles: Record<string, string> = { reference: 'Characters', notes: 'Notepad', journal: 'What the Storyteller showed you', history: 'Votes' };
  return (
    <aside className="side-panel surface" aria-label="Side panel">
      <header className="side-head">
        {view.mode === 'player' ? (
          <h2 className="side-title">{titles[active] ?? ''}</h2>
        ) : (
        <div className="side-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={active === t.id} className={active === t.id ? 'on' : ''} onClick={() => useUI.setState({ panel: t.id })}>
              {t.label}
            </button>
          ))}
        </div>
        )}
        <button className="btn quiet square small" onClick={() => useUI.setState({ panel: null })} aria-label="Close panel">
          <Icon name="x" />
        </button>
      </header>
      <div className="side-body scroll">
        {active === 'night' && <NightOrder />}
        {active === 'reference' && <Reference />}
        {active === 'history' && <History />}
        {active === 'notes' && <Notepad />}
        {active === 'journal' && <Journal />}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------- night order

function NightOrder() {
  const hidden = useUI((s) => s.hideGrimoire);
  if (hidden) return <p className="char-empty">The grimoire is hidden, so the night order is too. Show the grimoire to see it again.</p>;
  return <NightOrderList />;
}

function NightOrderList() {
  const g = useHost((s) => s.g);
  const [kind, setKind] = useState<'first' | 'other' | null>(null);
  const [showAll, setShowAll] = useState(false);
  const k = kind ?? (g.day <= 1 ? 'first' : 'other');
  const list = nightOrderList(k, g.script);
  // The Storyteller's sheet offers waking the whole evil team in one go, just before the separate steps.
  if (k === 'first' && list.includes('minioninfo')) list.splice(list.indexOf('minioninfo'), 0, 'eviltogether');
  const players = g.seats.length;
  const awake = Object.keys(g.awake).length;
  const evil = evilInfoStatus(g);

  const rows = list
    .map((id) => {
      const special = NIGHT_SPECIALS[id];
      const holders = special ? [] : seatsWithRole(g, id);
      const fabled = g.fabled.includes(id);
      const onScript = g.script.roles.includes(id);
      if (special) {
        if (k === 'other' && (id === 'minioninfo' || id === 'demoninfo' || id === 'eviltogether')) return null;
        return { id, special: true, holders, inPlay: true };
      }
      if (!holders.length && !fabled && !(showAll && onScript)) return null;
      if (!nightReminder(id, k)) return null;
      return { id, special: false, holders, inPlay: holders.length > 0 || fabled };
    })
    .filter(Boolean) as { id: string; special: boolean; holders: ReturnType<typeof seatsWithRole>; inPlay: boolean }[];

  return (
    <div className="night-order">
      <div className="night-tools">
        <div className="seg small">
          <button className={k === 'first' ? 'on' : ''} onClick={() => setKind('first')}>
            First night
          </button>
          <button className={k === 'other' ? 'on' : ''} onClick={() => setKind('other')}>
            Other nights
          </button>
        </div>
        <label className="check">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Whole script
        </label>
        {awake > 0 && (
          <button className="btn small" onClick={() => st.sleep()}>
            <Icon name="sleep" /> Sleep all ({awake})
          </button>
        )}
      </div>
      <ol className="night-list">
        {rows.map((row) => {
          const key = `${k}:${row.id}`;
          const done = g.nightDone.includes(key);
          const special = NIGHT_SPECIALS[row.id];
          const role = getRole(row.id);
          const dead = row.holders.length > 0 && row.holders.every((h) => h.seat.dead);
          const evilStep = row.id === 'minioninfo' || row.id === 'demoninfo' || row.id === 'eviltogether';
          const few = evilStep && players < 7;
          const text = nightReminder(row.id, k);
          const wake = () => {
            if (row.id === 'eviltogether') {
              const p = wholeEvilTeam();
              ui.wake(p.to, p.panels, null, p.extra);
            } else if (row.id === 'minioninfo') {
              const p = minionInfo();
              ui.wake(p.to, p.panels);
            } else if (row.id === 'demoninfo') {
              const p = demonInfo();
              ui.wake(p.to, p.panels);
            } else {
              const p = presetFor(row.id, k);
              ui.wake(
                row.holders.map((h) => h.seat.id),
                p.panels,
                p.ask,
              );
            }
          };
          return (
            <li key={row.id} className={`night-row ${done ? 'done' : ''} ${!row.inPlay ? 'absent' : ''} ${dead || few ? 'dim' : ''} ${special ? 'special' : ''}`}>
              <button className="night-check" onClick={() => st.toggleNightDone(key)} aria-label={done ? 'Mark as not done' : 'Mark as done'}>
                {done && <Icon name="check" />}
              </button>
              <div className="night-icon">
                {special ? (
                  special.icon === 'minion' || special.icon === 'demon' || special.icon === 'evil' ? (
                    <img src={genericIcon(special.icon)} alt="" />
                  ) : (
                    <Icon name={special.icon === 'dusk' ? 'moon' : 'sun'} />
                  )
                ) : (
                  <Token roleId={row.id} label={false} />
                )}
              </div>
              <div className="night-text">
                <div className="night-name">
                  <strong>{special ? special.name : role?.name}</strong>
                  {row.holders.map((h) => (
                    <span key={h.seat.id} className={`night-who ${h.seat.dead ? 'dead' : ''}`}>
                      {h.seat.name || 'Empty seat'}
                      {h.believes && ` (${getRole(h.seat.roleId)?.name})`}
                    </span>
                  ))}
                  {few && <span className="night-who">7+ players only</span>}
                  {!few && k === 'first' && row.id === 'minioninfo' && evil.minions.length > 0 && (
                    <span className={`night-state ${evil.minionsShown ? 'ok' : 'todo'}`}>{evil.minionsShown ? 'Shown' : 'Not shown yet'}</span>
                  )}
                  {!few && k === 'first' && row.id === 'eviltogether' && evil.demons.length > 0 && (
                    <span className={`night-state ${evil.minionsShown && evil.bluffsShown ? 'ok' : 'todo'}`}>
                      {evil.minionsShown && evil.bluffsShown ? 'Done' : 'Not shown yet'}
                    </span>
                  )}
                  {!few && k === 'first' && row.id === 'demoninfo' && evil.demons.length > 0 && (
                    <span className={`night-state ${evil.bluffsShown ? 'ok' : 'todo'}`}>{evil.bluffsShown ? 'Bluffs shown' : 'Bluffs not shown yet'}</span>
                  )}
                </div>
                {text && (
                  <p>
                    <RichText text={text} />
                  </p>
                )}
              </div>
              {(row.holders.length > 0 || evilStep) && (
                <button className="btn small night-wake" onClick={wake} title="Wake them">
                  <Icon name="wake" />
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------- reference sheet

function Reference() {
  const view = useView();
  const s = view.script;
  const teams = rolesByTeam(s.roles);
  const jinxes = jinxesFor(s.roles);
  const [tab, setTab] = useState<'roles' | 'night'>('roles');
  const inPlay = new Set(view.mode === 'st' ? view.seats.map((x) => x.roleId) : []);
  // Travellers only confuse the sheet unless one is actually sitting in the game.
  const seated = new Set(view.seats.filter((x) => x.traveller && x.roleId).map((x) => x.roleId!));
  const travellers = [...seated].map((id) => getRole(id)).filter((r) => r !== undefined);
  return (
    <div className="reference">
      <div className="ref-head">
        <img src={s.logo || editionLogo(s.id)} alt="" onError={(e) => ((e.target as HTMLImageElement).src = editionLogo('custom'))} />
        <div>
          <strong>{s.name}</strong>
          {s.author && <span>by {s.author}</span>}
        </div>
        {view.mode === 'st' && (
          <button className="btn small" onClick={() => ui.open({ kind: 'script' })}>
            Change
          </button>
        )}
      </div>
      <div className="seg small">
        <button className={tab === 'roles' ? 'on' : ''} onClick={() => setTab('roles')}>
          Abilities
        </button>
        <button className={tab === 'night' ? 'on' : ''} onClick={() => setTab('night')}>
          Night order
        </button>
      </div>
      {tab === 'roles' ? (
        <>
          {TEAMS.filter((t) => teams[t].length && t !== 'traveller').map((t) => (
            <section key={t} className={`ref-team team-${t}`}>
              <h3>{TEAM_LABEL[t]}</h3>
              {teams[t].map((r) => (
                <button key={r.id} className={`ref-role ${inPlay.has(r.id) ? 'in-play' : ''}`} onClick={() => ui.open({ kind: 'role', roleId: r.id })}>
                  <Token roleId={r.id} label={false} />
                  <div>
                    <strong>{r.name}</strong>
                    <p>
                      <RichText text={r.ability} />
                    </p>
                  </div>
                </button>
              ))}
            </section>
          ))}
          {travellers.length > 0 && (
            <section className="ref-team team-traveller">
              <h3>Travellers in play</h3>
              {travellers.map((r) => (
                <button key={r.id} className="ref-role" onClick={() => ui.open({ kind: 'role', roleId: r.id })}>
                  <Token roleId={r.id} label={false} />
                  <div>
                    <strong>{r.name}</strong>
                    <p>
                      <RichText text={r.ability} />
                    </p>
                  </div>
                </button>
              ))}
            </section>
          )}
          {view.fabled.length > 0 && (
            <section className="ref-team team-fabled">
              <h3>Fabled in play</h3>
              {view.fabled.map((id) => {
                const r = getRole(id);
                return r ? (
                  <button key={id} className="ref-role" onClick={() => ui.open({ kind: 'role', roleId: id })}>
                    <Token roleId={id} label={false} />
                    <div>
                      <strong>{r.name}</strong>
                      <p>{r.ability}</p>
                    </div>
                  </button>
                ) : null;
              })}
            </section>
          )}
          {jinxes.length > 0 && (
            <section className="ref-team ref-jinxes">
              <h3>Jinxes</h3>
              {jinxes.map((j, i) => (
                <div key={i} className="ref-jinx">
                  <span className="jinx-pair">
                    <Token roleId={j.a} label={false} />
                    <Token roleId={j.b} label={false} />
                  </span>
                  <p>{j.reason}</p>
                </div>
              ))}
            </section>
          )}
        </>
      ) : (
        <div className="ref-nights">
          {(['first', 'other'] as const).map((k) => (
            <section key={k}>
              <h3>{k === 'first' ? 'First night' : 'Other nights'}</h3>
              <ol>
                {nightOrderList(k, s)
                  .filter((id) => NIGHT_SPECIALS[id] || (s.roles.includes(id) && nightReminder(id, k) && (getRole(id)?.team !== 'traveller' || seated.has(id))))
                  .filter((id) => k === 'first' || (id !== 'minioninfo' && id !== 'demoninfo'))
                  .map((id) => {
                    const sp = NIGHT_SPECIALS[id];
                    return (
                      <li key={id}>
                        {sp ? (
                          sp.icon === 'minion' || sp.icon === 'demon' ? (
                            <img src={genericIcon(sp.icon)} alt="" />
                          ) : (
                            <Icon name={sp.icon === 'dusk' ? 'moon' : 'sun'} />
                          )
                        ) : (
                          <Token roleId={id} label={false} />
                        )}
                        <span>{sp ? sp.name : getRole(id)?.name}</span>
                      </li>
                    );
                  })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- votes & log

function History() {
  const view = useView();
  const [tab, setTab] = useState<'votes' | 'wakes'>('votes');
  const days = [...new Set(view.history.map((h) => h.day))].sort((a, b) => b - a);
  const name = (id: string) => view.seats.find((s) => s.id === id)?.label ?? 'Someone';
  return (
    <div className="history">
      {view.mode === 'st' && (
        <div className="seg small">
          <button className={tab === 'votes' ? 'on' : ''} onClick={() => setTab('votes')}>
            Votes
          </button>
          <button className={tab === 'wakes' ? 'on' : ''} onClick={() => setTab('wakes')}>
            What you’ve shown
          </button>
        </div>
      )}
      {tab === 'votes' ? (
        days.length ? (
          days.map((d) => (
            <section key={d} className="history-day">
              <h3>Day {d}</h3>
              {view.history
                .filter((h) => h.day === d)
                .map((h) => (
                  <div key={h.id} className={`vote-record ${h.votes >= h.majority ? 'enough' : ''}`}>
                    <div className="vote-line">
                      <span>
                        <b className="sapphire">{h.nominatorName}</b> nominated <b className="blood">{h.nomineeName}</b>
                      </span>
                      <span className="vote-tally">
                        {h.votes}
                        <small>/{h.majority}</small>
                      </span>
                    </div>
                    <div className="vote-voters">{h.voters.length ? h.voters.map(name).join(', ') : 'Nobody voted'}</div>
                  </div>
                ))}
            </section>
          ))
        ) : (
          <p className="char-empty">No votes yet. Each nomination’s result is kept here once its vote finishes.</p>
        )
      ) : (
        <WakeLog />
      )}
    </div>
  );
}

function WakeLog() {
  const g = useHost((s) => s.g);
  const wakes = [...g.wakes].reverse();
  if (!wakes.length) return <p className="char-empty">Nothing shown yet.</p>;
  return (
    <ol className="journal">
      {wakes.map((w) => (
        <li key={w.id}>
          <span className="eyebrow">
            {w.when} · {w.to.map((id) => seatName(g, id)).join(', ')}
          </span>
          <PanelView message={w} compact />
          {g.replies
            .filter((r) => r.wakeId === w.id)
            .map((r) => (
              <div key={r.seatId} className="log-reply">
                <b>{seatName(g, r.seatId)}</b>
                <ReplyLine reply={r} name={(id) => seatName(g, id)} />
              </div>
            ))}
        </li>
      ))}
    </ol>
  );
}
