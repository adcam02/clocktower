import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { defaultAlignment, getRole } from '../data';
import { player } from '../net/client';
import { st, useHost } from '../state/host';
import { notes, useNotes } from '../state/notes';
import { ui } from '../state/ui';
import { useView, type SeatView } from '../state/view';
import { Icon, type IconName } from './Icon';
import type { Geometry } from './Square';

function Popover({ geo, pt, children }: { geo: Geometry; pt: { x: number; y: number }; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const right = pt.x <= geo.cx;
    let left = right ? pt.x + geo.t * 0.58 : pt.x - geo.t * 0.58 - w;
    if (left < 8 || left + w > geo.w - 8) left = Math.min(Math.max(8, pt.x - w / 2), geo.w - w - 8);
    const top = Math.min(Math.max(8, pt.y - h * 0.35), geo.h - h - 8);
    setPos({ left, top });
  }, [geo, pt]);
  return (
    <div
      className="seat-menu surface"
      ref={ref}
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      role="menu"
    >
      {children}
    </div>
  );
}

function Item({ icon, children, onClick, tone, hint }: { icon: IconName; children: ReactNode; onClick: () => void; tone?: 'blood'; hint?: string }) {
  return (
    <button
      className={`menu-item ${tone ?? ''}`}
      role="menuitem"
      onClick={() => {
        onClick();
      }}
    >
      <Icon name={icon} />
      <span>{children}</span>
      {hint && <em>{hint}</em>}
    </button>
  );
}

export function SeatMenu({ seat, geo, pt }: { seat: SeatView; geo: Geometry; pt: { x: number; y: number } }) {
  const view = useView();
  const raw = useHost((s) => s.g.seats.find((x) => x.id === seat.id));
  if (!raw) return null;
  const role = getRole(raw.roleId);
  const shown = getRole(raw.shownRoleId);
  const alignment = raw.alignment ?? defaultAlignment(role?.team);
  const close = () => ui.menu(null);
  const marked = view.marked?.seatId === seat.id;

  return (
    <Popover geo={geo} pt={pt}>
      <header className="menu-head">
        <strong>{seat.label}</strong>
        <span>{role ? role.name : 'No character yet'}</span>
      </header>

      <div className="menu-group">
        <Item icon="sparkle" onClick={() => ui.open({ kind: 'character', seatId: seat.id, purpose: 'role' })}>
          {role ? 'Change character' : 'Choose character'}
        </Item>
        {role && (
          <Item icon="eye" hint={shown ? shown.name : undefined} onClick={() => ui.open({ kind: 'character', seatId: seat.id, purpose: 'shown' })}>
            They think they are…
          </Item>
        )}
        {role && (
          <div className="menu-seg" role="group" aria-label="Alignment">
            <button className={alignment === 'good' ? 'on good' : ''} onClick={() => st.setAlignment(seat.id, 'good')}>
              Good
            </button>
            <button className={alignment === 'evil' ? 'on evil' : ''} onClick={() => st.setAlignment(seat.id, 'evil')}>
              Evil
            </button>
          </div>
        )}
        <Item icon="pin" onClick={() => ui.open({ kind: 'reminder', seatId: seat.id })}>
          Add reminder
        </Item>
        {role && (
          <Item icon="swap" onClick={() => ui.pick({ kind: 'swapRole', seatId: seat.id })}>
            Swap characters with…
          </Item>
        )}
      </div>

      <div className="menu-group">
        <Item icon="wake" onClick={() => ui.wake([seat.id])}>
          Wake {seat.name || 'this player'}
        </Item>
        {seat.awake && (
          <Item icon="sleep" onClick={() => (st.sleep([seat.id]), close())}>
            Put to sleep
          </Item>
        )}
        <Item icon="vote" onClick={() => ui.pick({ kind: 'nominee', nominatorId: seat.id })}>
          Nominate…
        </Item>
        {marked ? (
          <Item icon="axe" onClick={() => (st.clearMark(), close())}>
            Clear execution mark
          </Item>
        ) : (
          <Item icon="axe" onClick={() => (st.markSeat(seat.id), close())}>
            Mark for execution
          </Item>
        )}
        <Item icon={seat.dead ? 'heart' : 'skull'} tone={seat.dead ? undefined : 'blood'} onClick={() => (st.toggleDead(seat.id), close())}>
          {seat.dead ? 'Bring back to life' : view.phase === 'night' ? 'Kill (players see it at dawn)' : 'Kill'}
        </Item>
        {seat.dead && (
          <Item icon="ghost" onClick={() => st.toggleGhostVote(seat.id)}>
            {seat.ghostVote ? 'Spend ghost vote' : 'Give back ghost vote'}
          </Item>
        )}
      </div>

      <div className="menu-group">
        <Item icon="pencil" onClick={() => ui.open({ kind: 'rename', seatId: seat.id })}>
          Rename
        </Item>
        <Item icon="swap" onClick={() => ui.pick({ kind: 'swap', seatId: seat.id })}>
          Swap seats with…
        </Item>
        <Item icon="move" onClick={() => ui.pick({ kind: 'move', seatId: seat.id })}>
          Move to…
        </Item>
        {seat.claimed && (
          <Item icon="logout" onClick={() => (st.vacateSeat(seat.id), close())}>
            Free this seat
          </Item>
        )}
        <Item icon="trash" tone="blood" onClick={() => (st.removeSeat(seat.id), close())}>
          Remove seat
        </Item>
      </div>
    </Popover>
  );
}

export function PlayerSeatMenu({ seat, geo, pt }: { seat: SeatView; geo: Geometry; pt: { x: number; y: number } }) {
  const note = useNotes((s) => s.notes[seat.id]);
  const close = () => ui.menu(null);
  const noteRole = getRole(note);
  if (seat.isMe) {
    return (
      <Popover geo={geo} pt={pt}>
        <header className="menu-head">
          <strong>{seat.label}</strong>
          <span>Your seat</span>
        </header>
        <div className="menu-group">
          {seat.roleId && (
            <Item icon="book" onClick={() => ui.open({ kind: 'role', roleId: seat.roleId! })}>
              My character
            </Item>
          )}
          <Item icon="pencil" onClick={() => ui.open({ kind: 'rename', seatId: seat.id })}>
            Change my name
          </Item>
          <Item icon="logout" tone="blood" onClick={() => (player.leave(), close())}>
            Leave this seat
          </Item>
        </div>
      </Popover>
    );
  }
  return (
    <Popover geo={geo} pt={pt}>
      <header className="menu-head">
        <strong>{seat.label}</strong>
        <span>{seat.roleId ? getRole(seat.roleId)?.name : noteRole ? `Your guess: ${noteRole.name}` : 'Only you see your notes'}</span>
      </header>
      <div className="menu-group">
        <Item icon="feather" onClick={() => ui.open({ kind: 'character', seatId: seat.id, purpose: 'note' })}>
          {note ? 'Change my guess' : 'Guess their character'}
        </Item>
        {note && (
          <Item icon="x" onClick={() => (notes.set(seat.id, null), close())}>
            Clear my guess
          </Item>
        )}
        {seat.roleId && (
          <Item icon="book" onClick={() => ui.open({ kind: 'role', roleId: seat.roleId! })}>
            About the {getRole(seat.roleId)?.name}
          </Item>
        )}
      </div>
    </Popover>
  );
}
