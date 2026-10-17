import { useMemo, useState } from 'react';
import { ALL_ROLES, getRole } from '../data';
import { demonInfo, minionInfo, wholeEvilTeam } from '../lib/presets';
import { joinNames } from '../lib/util';
import { seatName, st, useHost } from '../state/host';
import type { Ask, InfoCard as CardId, WakePanel } from '../state/types';
import { emptyPanel, ui, useUI } from '../state/ui';
import { CharacterGrid } from './CharacterGrid';
import { Icon } from './Icon';
import { CARDS, InfoCard, SIGNS, SignGlyph } from './InfoCard';
import { Modal } from './Modal';
import { askText, PanelView, ReplyLine } from './PanelView';

type Adder = 'player' | 'character' | 'text' | null;

const QUESTIONS = ['Who do you want to kill?', 'Who do you want to poison?', 'Who do you want to protect?', 'Who is your master?'];

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function WakeComposer() {
  const g = useHost((s) => s.g);
  const draft = useUI((s) => s.draft);
  const [adder, setAdder] = useState<Adder>(null);
  const [scope, setScope] = useState<'play' | 'script' | 'all'>('script');
  const [moreNumbers, setMoreNumbers] = useState(false);
  const [adding, setAdding] = useState(false);
  const panel = draft.panels[draft.active] ?? emptyPanel();

  const edit = (fn: (p: WakePanel) => WakePanel) =>
    ui.setDraft((d) => ({ ...d, panels: d.panels.map((x, i) => (i === d.active ? fn(x) : x)) }));
  const setTo = (to: string[]) => ui.setDraft((d) => ({ ...d, to }));
  const setAsk = (ask: Ask) => ui.setDraft((d) => ({ ...d, ask }));
  // Switching between players and characters keeps any question already written.
  const prompt = draft.ask?.prompt;
  const load = (p: { to: string[]; panels: WakePanel[]; extra?: Record<string, WakePanel[]> }, ask: Ask = null) =>
    ui.setDraft(() => ({ to: p.to, panels: p.panels, active: p.panels.length - 1, ask, extra: p.extra ?? {}, sentId: null }));

  const addCard = (card: CardId) =>
    ui.setDraft((d) => {
      const cur = d.panels[d.active];
      let ask = d.ask;
      if (!ask && card === 'makeChoice') ask = { kind: 'players', count: 1 };
      if (!ask && card === 'useAbility') ask = { kind: 'yesno' };
      if (!cur.card) return { ...d, ask, panels: d.panels.map((x, i) => (i === d.active ? { ...x, card } : x)) };
      return { ...d, ask, panels: [...d.panels, { ...emptyPanel(), card }], active: d.panels.length };
    });

  const sent = g.wakes.find((w) => w.id === draft.sentId);
  const content = draft.panels.filter((p) => p.card || p.roleIds.length || p.seatIds.length || p.signs.length || p.text.trim());
  // Cards only some of them see, kept to people still being woken.
  const extra = Object.fromEntries(Object.entries(draft.extra ?? {}).filter(([seat, p]) => draft.to.includes(seat) && p.length));
  const dirty =
    !sent || JSON.stringify([sent.to, sent.panels, sent.ask, sent.extra ?? {}]) !== JSON.stringify([draft.to, content, draft.ask, extra]);
  const names = draft.to.map((id) => seatName(g, id));

  const send = () => {
    if (!draft.to.length || !content.length) return;
    const id = st.wake(draft.to, content, draft.ask, extra);
    ui.setDraft((d) => ({ ...d, sentId: id }));
  };

  const evil = useMemo(() => {
    const demons = g.seats.filter((s) => getRole(s.roleId)?.team === 'demon').length;
    const minions = g.seats.filter((s) => getRole(s.roleId)?.team === 'minion').length;
    return { demons, minions };
  }, [g.seats]);

  const inPlay = useMemo(() => [...new Set(g.seats.flatMap((s) => [s.roleId, s.shownRoleId]).filter(Boolean) as string[])], [g.seats]);
  const charIds = scope === 'play' ? inPlay : scope === 'script' ? g.script.roles : ALL_ROLES.map((r) => r.id);
  const numbers = moreNumbers ? Array.from({ length: 21 }, (_, i) => i) : [0, 1, 2, 3, 4, 5];

  return (
    <Modal
      size="xl"
      className="wake-modal"
      title={
        <span className="wake-title">
          Wake
          {draft.to.map((id) => (
            <span key={id} className="wake-chip">
              {seatName(g, id)}
              <button onClick={() => setTo(draft.to.filter((x) => x !== id))} aria-label={`Don’t wake ${seatName(g, id)}`}>
                <Icon name="x" />
              </button>
            </span>
          ))}
          <span className="wake-add">
            <button className="btn small square" onClick={() => setAdding(!adding)} title="Wake someone else too" aria-label="Wake someone else too">
              <Icon name="userPlus" />
            </button>
            {adding && (
              <div className="wake-add-menu surface">
                {g.seats.map((s, i) => (
                  <button
                    key={s.id}
                    className={draft.to.includes(s.id) ? 'on' : ''}
                    onClick={() => {
                      setTo(toggle(draft.to, s.id));
                    }}
                  >
                    <Icon name={draft.to.includes(s.id) ? 'check' : 'plus'} />
                    {s.name || `Seat ${i + 1}`}
                    <em>{getRole(s.roleId)?.name}</em>
                  </button>
                ))}
              </div>
            )}
          </span>
        </span>
      }
      head={
        <div className="wake-presets">
          <button className="btn small" disabled={!evil.demons || !evil.minions} onClick={() => load(wholeEvilTeam())} title="Wake the Demon and Minions together so they see each other">
            Evil team
          </button>
          <button className="btn small" disabled={!evil.minions} onClick={() => load(minionInfo())}>
            Minion info
          </button>
          <button className="btn small" disabled={!evil.demons} onClick={() => load(demonInfo())} title="Minions and the three bluffs">
            Demon info
          </button>
        </div>
      }
      footer={
        <>
          <div className="wake-status">
            {sent && (
              <>
                {sent.to.map((id) => {
                  const awake = g.awake[id];
                  const reply = g.replies.find((r) => r.wakeId === sent.id && r.seatId === id);
                  return (
                    <span key={id} className={`wake-state ${reply ? 'replied' : awake?.seen ? 'seen' : awake ? 'awake' : 'asleep'}`}>
                      <b>{seatName(g, id)}</b> {reply ? '' : awake?.seen ? 'has seen it' : awake ? 'is looking…' : 'is asleep'}
                      {reply && <ReplyLine reply={reply} name={(x) => seatName(g, x)} />}
                    </span>
                  );
                })}
              </>
            )}
            {!sent && draft.to.length > 0 && <span className="wake-state">Not shown yet</span>}
          </div>
          <button
            className="btn quiet"
            onClick={() => ui.setDraft((d) => ({ ...d, panels: [emptyPanel()], active: 0, ask: null, extra: {}, sentId: null }))}
          >
            Clear
          </button>
          <button
            className="btn"
            disabled={!draft.to.some((id) => g.awake[id])}
            onClick={() => {
              st.sleep(draft.to);
              ui.setDraft((d) => ({ ...d, sentId: null }));
            }}
          >
            <Icon name="sleep" /> Put to sleep
          </button>
          <button className="btn primary" disabled={!draft.to.length || !content.length || !dirty} onClick={send}>
            <Icon name="wake" /> {sent && !dirty ? 'Shown' : `Show ${names.length === 1 ? names[0] : names.length ? `${names.length} players` : ''}`}
          </button>
        </>
      }
    >
      {!draft.to.length ? (
        <div className="wake-pick">
          <p>Who are you waking?</p>
          <div className="wake-pick-list">
            {g.seats.map((s, i) => (
              <button key={s.id} className="btn" onClick={() => setTo([s.id])}>
                {s.name || `Seat ${i + 1}`}
                <em>{getRole(s.roleId)?.name}</em>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="wake-grid">
          <div className="wake-palette">
            <div className="palette-signs">
              {SIGNS.map((s) => (
                <button key={s.id} className={`sign-btn ${panel.signs.includes(s.id) ? 'on' : ''}`} onClick={() => edit((p) => ({ ...p, signs: toggle(p.signs, s.id) }))}>
                  <span className="sign-glyph">
                    <SignGlyph sign={s.id} />
                  </span>
                  {s.label}
                </button>
              ))}
              {numbers.map((n) => (
                <button
                  key={n}
                  className={`sign-btn num ${panel.signs.includes(`n${n}`) ? 'on' : ''}`}
                  onClick={() => edit((p) => ({ ...p, signs: toggle(p.signs, `n${n}`) }))}
                >
                  <span className="sign-glyph">
                    <SignGlyph sign={`n${n}`} />
                  </span>
                  {['Zero', 'One', 'Two', 'Three', 'Four', 'Five'][n] ?? n}
                </button>
              ))}
              <button className="sign-btn" onClick={() => setMoreNumbers(!moreNumbers)}>
                <span className="sign-glyph">
                  <Icon name={moreNumbers ? 'minus' : 'plus'} />
                </span>
                {moreNumbers ? 'Fewer' : 'More'}
              </button>
            </div>

            <div className="palette-adders">
              <button className={`sign-btn ${adder === 'player' ? 'on' : ''}`} onClick={() => setAdder(adder === 'player' ? null : 'player')}>
                <span className="sign-glyph">
                  <Icon name="users" />
                </span>
                Player
              </button>
              <button className={`sign-btn ${adder === 'character' ? 'on' : ''}`} onClick={() => setAdder(adder === 'character' ? null : 'character')}>
                <span className="sign-glyph">
                  <Icon name="sparkle" />
                </span>
                Character
              </button>
              <button className={`sign-btn ${adder === 'text' ? 'on' : ''}`} onClick={() => setAdder(adder === 'text' ? null : 'text')}>
                <span className="sign-glyph">
                  <Icon name="feather" />
                </span>
                Custom
              </button>
            </div>

            {adder === 'player' && (
              <div className="adder">
                <div className="adder-seats">
                  {g.seats.map((s, i) => (
                    <button key={s.id} className={`btn small ${panel.seatIds.includes(s.id) ? 'primary' : ''} ${s.dead ? 'dead' : ''}`} onClick={() => edit((p) => ({ ...p, seatIds: toggle(p.seatIds, s.id) }))}>
                      {s.name || `Seat ${i + 1}`}
                      <em>{getRole(s.roleId)?.name}</em>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {adder === 'character' && (
              <div className="adder">
                <div className="seg small">
                  <button className={scope === 'play' ? 'on' : ''} onClick={() => setScope('play')}>
                    In play
                  </button>
                  <button className={scope === 'script' ? 'on' : ''} onClick={() => setScope('script')}>
                    Script
                  </button>
                  <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>
                    Everything
                  </button>
                </div>
                <CharacterGrid ids={charIds} size={56} selected={panel.roleIds} onPick={(id) => edit((p) => ({ ...p, roleIds: toggle(p.roleIds, id) }))} />
              </div>
            )}
            {adder === 'text' && (
              <div className="adder">
                <textarea
                  className="input text-adder"
                  placeholder="Anything you want them to read"
                  value={panel.text}
                  maxLength={280}
                  autoFocus
                  onChange={(e) => edit((p) => ({ ...p, text: e.target.value }))}
                />
              </div>
            )}

            <div className="palette-cards">
              {CARDS.map((c) => (
                <button key={c.id} className={`card-btn ${draft.panels.some((p) => p.card === c.id) ? 'on' : ''}`} onClick={() => addCard(c.id)} title={c.title}>
                  <InfoCard id={c.id} size="sm" />
                </button>
              ))}
            </div>

            <div className="palette-ask">
              <span className="eyebrow">Ask for an answer</span>
              <div className="seg">
                <button className={!draft.ask ? 'on' : ''} onClick={() => setAsk(null)}>
                  No
                </button>
                <button className={draft.ask?.kind === 'players' ? 'on' : ''} onClick={() => setAsk({ kind: 'players', count: draft.ask?.kind === 'players' ? draft.ask.count : 1, prompt })}>
                  Players
                </button>
                <button className={draft.ask?.kind === 'character' ? 'on' : ''} onClick={() => setAsk({ kind: 'character', count: 1, prompt })}>
                  Character
                </button>
                <button className={draft.ask?.kind === 'yesno' ? 'on' : ''} onClick={() => setAsk({ kind: 'yesno', prompt })}>
                  Yes or no
                </button>
              </div>
              {draft.ask && draft.ask.kind !== 'yesno' && (
                <div className="stepper">
                  <button className="btn small square" onClick={() => setAsk({ ...draft.ask!, count: Math.max(1, (draft.ask as { count: number }).count - 1) } as Ask)} aria-label="Fewer">
                    <Icon name="minus" />
                  </button>
                  <b>{(draft.ask as { count: number }).count}</b>
                  <button className="btn small square" onClick={() => setAsk({ ...draft.ask!, count: Math.min(5, (draft.ask as { count: number }).count + 1) } as Ask)} aria-label="More">
                    <Icon name="plus" />
                  </button>
                </div>
              )}
              <div className="ask-question">
                <input
                  className="input"
                  placeholder={draft.ask ? askText({ ...draft.ask, prompt: undefined }) : 'Ask them a question (optional)'}
                  value={prompt ?? ''}
                  maxLength={80}
                  onChange={(e) => setAsk({ ...(draft.ask ?? { kind: 'players', count: 1 }), prompt: e.target.value || undefined } as Ask)}
                />
                <div className="ask-chips">
                  {QUESTIONS.map((q) => (
                    <button
                      key={q}
                      className={`chip-btn ${prompt === q ? 'on' : ''}`}
                      onClick={() => setAsk({ ...(draft.ask && draft.ask.kind !== 'yesno' ? draft.ask : { kind: 'players', count: 1 }), prompt: q } as Ask)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="wake-preview">
            <div className="preview-head">
              <span className="eyebrow">{joinNames(names)} will see</span>
              <button className="btn small quiet" onClick={() => ui.setDraft((d) => ({ ...d, panels: [...d.panels, emptyPanel()], active: d.panels.length }))}>
                <Icon name="plus" /> Another card
              </button>
            </div>
            <div className="preview-stage">
              <PanelView
                message={{ panels: draft.panels, ask: draft.ask }}
                seatFor={draft.to.length === 1 ? draft.to[0] : null}
                edit={{
                  active: draft.active,
                  select: (i) => ui.setDraft((d) => ({ ...d, active: i })),
                  removePanel: (i) =>
                    ui.setDraft((d) => {
                      const panels = d.panels.filter((_, k) => k !== i);
                      return { ...d, panels: panels.length ? panels : [emptyPanel()], active: Math.max(0, Math.min(d.active, panels.length - 1)) };
                    }),
                  removeCard: (i) => ui.setDraft((d) => ({ ...d, panels: d.panels.map((p, k) => (k === i ? { ...p, card: null } : p)) })),
                  removeRole: (i, id) => ui.setDraft((d) => ({ ...d, panels: d.panels.map((p, k) => (k === i ? { ...p, roleIds: p.roleIds.filter((x) => x !== id) } : p)) })),
                  removeSeat: (i, id) => ui.setDraft((d) => ({ ...d, panels: d.panels.map((p, k) => (k === i ? { ...p, seatIds: p.seatIds.filter((x) => x !== id) } : p)) })),
                  removeSign: (i, s) => ui.setDraft((d) => ({ ...d, panels: d.panels.map((p, k) => (k === i ? { ...p, signs: p.signs.filter((x) => x !== s) } : p)) })),
                  clearText: (i) => ui.setDraft((d) => ({ ...d, panels: d.panels.map((p, k) => (k === i ? { ...p, text: '' } : p)) })),
                }}
              />
              {draft.ask && <div className="preview-ask">They’ll be asked: {askText(draft.ask)}</div>}
              {Object.entries(extra).map(([seat, panels]) => (
                <div key={seat} className="preview-extra">
                  <div className="preview-extra-head">
                    <span className="eyebrow">Only {seatName(g, seat)} also sees</span>
                    <button
                      className="btn small quiet"
                      onClick={() => ui.setDraft((d) => ({ ...d, extra: Object.fromEntries(Object.entries(d.extra).filter(([k]) => k !== seat)) }))}
                    >
                      <Icon name="x" /> Remove
                    </button>
                  </div>
                  <PanelView message={{ panels, ask: null }} seatFor={seat} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
