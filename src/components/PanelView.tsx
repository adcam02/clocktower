import { getRole } from '../data';
import type { Ask, WakePanel, WakeReply } from '../state/types';
import { useView } from '../state/view';
import { Icon } from './Icon';
import { cardTitle, InfoCard, SignGlyph, signLabel } from './InfoCard';
import { RichText } from './RichText';
import { Token } from './Token';

export interface PanelEdit {
  active: number;
  select: (i: number) => void;
  removePanel: (i: number) => void;
  removeCard: (i: number) => void;
  removeRole: (i: number, id: string) => void;
  removeSeat: (i: number, id: string) => void;
  removeSign: (i: number, s: string) => void;
  clearText: (i: number) => void;
}

function X({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      className="panel-x"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
    >
      <Icon name="x" />
    </button>
  );
}

export function askText(ask: Ask): string {
  if (!ask) return '';
  if (ask.prompt) return ask.prompt;
  if (ask.kind === 'yesno') return 'Answer yes or no';
  if (ask.kind === 'players') return ask.count === 1 ? 'Choose a player' : `Choose ${ask.count} players`;
  return ask.count === 1 ? 'Choose a character' : `Choose ${ask.count} characters`;
}

export function PanelView({
  message,
  compact,
  reply,
  edit,
  seatFor,
}: {
  message: { panels: WakePanel[]; ask: Ask };
  compact?: boolean;
  reply?: WakeReply;
  edit?: PanelEdit;
  /** The seat this is being shown to, so their own name reads as “you”. */
  seatFor?: string | null;
}) {
  const view = useView();
  const name = (id: string) => {
    const s = view.seats.find((x) => x.id === id);
    if (!s) return 'Someone';
    return id === seatFor ? `${s.label} (you)` : s.label;
  };

  if (compact) {
    return (
      <div className="panels compact">
        {message.panels.map((p, i) => (
          <div key={i} className="panel-line">
            {p.card && <span className="panel-card-name">{cardTitle(p.card)}</span>}
            {p.roleIds.map((id) => (
              <span key={id} className="chip role">
                <Token roleId={id} label={false} /> {getRole(id)?.name}
              </span>
            ))}
            {p.seatIds.map((id) => (
              <span key={id} className="chip seat">
                {name(id)}
              </span>
            ))}
            {p.signs.map((s) => (
              <span key={s} className={`chip sign sign-${s}`}>
                <span className="chip-glyph">
                  <SignGlyph sign={s} />
                </span>
                {signLabel(s)}
              </span>
            ))}
            {p.text && <span className="panel-text-inline">“{p.text}”</span>}
          </div>
        ))}
        {reply && <ReplyLine reply={reply} name={name} />}
      </div>
    );
  }

  return (
    <div className={`panels ${message.panels.length > 1 ? 'multi' : ''}`}>
      {message.panels.map((p, i) => {
        const empty = !p.card && !p.roleIds.length && !p.seatIds.length && !p.signs.length && !p.text;
        const single = p.roleIds.length === 1 && !p.seatIds.length;
        return (
          <section
            key={i}
            className={`panel ${edit?.active === i ? 'active' : ''} ${p.card ? 'has-card' : ''} ${empty ? 'empty' : ''}`}
            onClick={edit ? () => edit.select(i) : undefined}
          >
            {edit && message.panels.length > 1 && <X onClick={() => edit.removePanel(i)} label="Remove this card" />}
            {p.card && (
              <div className="panel-card">
                <InfoCard id={p.card} size={edit ? 'md' : 'lg'} />
                {edit && <X onClick={() => edit.removeCard(i)} label="Remove card" />}
              </div>
            )}
            <div className="panel-content">
              {empty && edit && <p className="panel-hint">Pick a card, a signal, players or characters on the left.</p>}
              {p.roleIds.length > 0 && (
                <div className={`panel-roles n${Math.min(p.roleIds.length, 4)}`}>
                  {p.roleIds.map((id) => {
                    const r = getRole(id);
                    return (
                      <div key={id} className="panel-role">
                        <Token roleId={id} />
                        {single && r && !edit && (
                          <p>
                            <RichText text={r.ability} />
                          </p>
                        )}
                        {edit && <X onClick={() => edit.removeRole(i, id)} label={`Remove ${r?.name}`} />}
                      </div>
                    );
                  })}
                </div>
              )}
              {p.seatIds.length > 0 && (
                <div className="panel-seats">
                  {p.seatIds.map((id) => (
                    <span key={id} className={`panel-seat ${id === seatFor ? 'me' : ''}`}>
                      <Icon name="pin" />
                      {name(id)}
                      {edit && <X onClick={() => edit.removeSeat(i, id)} label="Remove player" />}
                    </span>
                  ))}
                </div>
              )}
              {p.signs.length > 0 && (
                <div className="panel-signs">
                  {p.signs.map((s) => (
                    <span key={s} className={`panel-sign sign-${s}`}>
                      <span className="panel-sign-glyph">
                        <SignGlyph sign={s} />
                      </span>
                      <span>{signLabel(s)}</span>
                      {edit && <X onClick={() => edit.removeSign(i, s)} label="Remove signal" />}
                    </span>
                  ))}
                </div>
              )}
              {p.text && (
                <p className="panel-text">
                  {p.text}
                  {edit && <X onClick={() => edit.clearText(i)} label="Remove text" />}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function ReplyLine({ reply, name }: { reply: WakeReply; name: (id: string) => string }) {
  const parts: string[] = [];
  if (reply.seatIds?.length) parts.push(reply.seatIds.map(name).join(', '));
  if (reply.roleIds?.length) parts.push(reply.roleIds.map((id) => getRole(id)?.name ?? id).join(', '));
  if (reply.answer !== undefined) parts.push(reply.answer ? 'Yes' : 'No');
  return (
    <div className="reply-line">
      <Icon name="feather" /> Answered: <b>{parts.join(' · ') || 'nothing'}</b>
    </div>
  );
}
