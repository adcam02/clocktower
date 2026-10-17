import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { clamp } from '../lib/util';
import { useNotes } from '../state/notes';
import { st } from '../state/host';
import { ui, useUI } from '../state/ui';
import { useView, type SeatView } from '../state/view';
import { player } from '../net/client';
import { Dial } from './Dial';
import { Icon } from './Icon';
import { PlayerSeatMenu, SeatMenu } from './SeatMenu';
import { ReminderToken, Token } from './Token';
import { VoteHands } from './VoteHands';

export interface Geometry {
  w: number;
  h: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  t: number;
  dial: number;
  pts: { x: number; y: number }[];
}

function ellipsePerimeter(a: number, b: number) {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/** Places seats evenly around an ellipse that fills the space, starting at the top and going clockwise. */
export function layout(w: number, h: number, n: number): Geometry {
  const pad = 10;
  let t = clamp(Math.min(w, h) * 0.17, 46, 128);
  let rx = 0;
  let ry = 0;
  for (; t > 34; t -= 2) {
    const plate = t * 0.24 + 18;
    rx = w / 2 - t * 0.62 - pad;
    ry = h / 2 - t / 2 - plate - pad;
    if (rx < 40 || ry < 40) continue;
    if (n * t * 1.22 <= ellipsePerimeter(rx, ry)) break;
  }
  rx = Math.max(rx, 40);
  ry = Math.max(ry, 40);
  const cx = w / 2;
  const cy = h / 2 - 4;
  const samples = 720;
  const cum: number[] = [0];
  let prev = { x: cx, y: cy - ry };
  const at = (k: number) => {
    const a = -Math.PI / 2 + (k / samples) * Math.PI * 2;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  };
  for (let k = 1; k <= samples; k++) {
    const p = at(k);
    cum.push(cum[k - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  const total = cum[samples];
  const pts: { x: number; y: number }[] = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const target = (i / n) * total;
    while (k < samples && cum[k + 1] < target) k++;
    pts.push(at(k));
  }
  const dial = clamp(Math.min(rx, ry) * 2 - t * 1.25, 150, 420);
  return { w, h, cx, cy, rx, ry, t, dial, pts };
}

function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 1200, h: 800 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export function Square() {
  const view = useView();
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(ref);
  const geo = useMemo(() => layout(w, h, view.seats.length), [w, h, view.seats.length]);
  const menuSeat = useUI((s) => s.menuSeat);
  const pick = useUI((s) => s.pick);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ui.menu(null);
        ui.pick(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const menuIndex = view.seats.findIndex((s) => s.id === menuSeat);

  return (
    <div
      className={`town ${pick ? 'is-picking' : ''}`}
      ref={ref}
      style={{ '--t': `${geo.t}px` } as React.CSSProperties}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) ui.menu(null);
      }}
    >
      <Dial geo={geo} />
      <VoteHands geo={geo} />
      {view.seats.map((s, i) => (
        <SeatSpot key={s.id} seat={s} geo={geo} i={i} />
      ))}
      {menuIndex >= 0 &&
        (view.mode === 'st' ? (
          <SeatMenu seat={view.seats[menuIndex]} geo={geo} pt={geo.pts[menuIndex]} />
        ) : (
          <PlayerSeatMenu seat={view.seats[menuIndex]} geo={geo} pt={geo.pts[menuIndex]} />
        ))}
      {view.seats.length === 0 && (
        <div className="town-empty">
          {view.mode === 'st' ? (
            <>
              <p>The square is empty.</p>
              <button className="btn primary" onClick={() => st.setSeatCount(8)}>
                <Icon name="userPlus" /> Add 8 seats
              </button>
            </>
          ) : (
            <p>Waiting for the Storyteller to set out the seats…</p>
          )}
        </div>
      )}
    </div>
  );
}

function pickValid(pick: NonNullable<ReturnType<typeof useUI.getState>['pick']>, seat: SeatView) {
  if (pick.kind === 'nominee') return true;
  return pick.seatId !== seat.id;
}

function SeatSpot({ seat, geo, i }: { seat: SeatView; geo: Geometry; i: number }) {
  const view = useView();
  const pick = useUI((s) => s.pick);
  const menuSeat = useUI((s) => s.menuSeat);
  const note = useNotes((s) => s.notes[seat.id]);
  const pt = geo.pts[i];
  const t = geo.t;
  const nom = view.nomination;
  const st_ = view.mode === 'st';

  const voted = nom?.votes.includes(seat.id) ?? false;
  const locked = nom?.locked.includes(seat.id) ?? false;
  const handHere = nom && (nom.status === 'running' || nom.status === 'paused' || nom.status === 'done')
    ? (nom.step === 0 ? nom.nomineeId : nom.order[nom.step - 1]) === seat.id
    : false;
  const isNominee = nom?.nomineeId === seat.id;
  const isNominator = nom?.nominatorId === seat.id;
  const marked = view.marked?.seatId === seat.id;
  const canVote = !seat.dead || seat.ghostVote || (nom?.spentGhosts.includes(seat.id) ?? false);

  const onClick = () => {
    if (pick) {
      if (!pickValid(pick, seat)) return;
      if (pick.kind === 'nominee') st.nominate(pick.nominatorId, seat.id);
      else if (pick.kind === 'swap') st.swapSeats(pick.seatId, seat.id);
      else if (pick.kind === 'move') st.moveSeat(pick.seatId, seat.id);
      else if (pick.kind === 'swapRole') st.swapRoles(pick.seatId, seat.id);
      ui.pick(null);
      return;
    }
    if (view.mode === 'player') {
      if (!view.mySeatId && !seat.claimed) {
        ui.open({ kind: 'claim', seatId: seat.id });
        return;
      }
    }
    ui.menu(menuSeat === seat.id ? null : seat.id);
  };

  // Reminders sit between the token and the middle of the square.
  const dx = geo.cx - pt.x;
  const dy = geo.cy - pt.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const rs = Math.max(30, t * 0.5);

  const blank = seat.isMe || seat.claimed ? 'unknown' : 'empty';

  return (
    <div
      className={[
        'seat',
        seat.dead && 'is-dead',
        seat.diesAtDawn && 'dies-at-dawn',
        seat.isMe && 'is-me',
        isNominee && 'is-nominee',
        isNominator && 'is-nominator',
        marked && 'is-marked',
        handHere && 'has-hand',
        voted && 'has-voted',
        locked && 'is-locked',
        seat.awake && 'is-awake',
        pick && pickValid(pick, seat) && 'is-pickable',
        menuSeat === seat.id && 'is-open',
        !seat.claimed && 'is-unclaimed',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ left: pt.x, top: pt.y, '--t': `${t}px`, zIndex: menuSeat === seat.id ? 30 : 10 } as React.CSSProperties}
    >
      {st_ &&
        seat.reminders.map((r, j) => (
          <button
            key={r.id}
            className="seat-reminder"
            style={{
              left: ux * (t * 0.5 + rs * 0.62 + j * rs * 0.9) + (j % 2 ? -uy : uy) * rs * 0.18,
              top: uy * (t * 0.5 + rs * 0.62 + j * rs * 0.9) + (j % 2 ? ux : -ux) * rs * 0.18,
              '--size': `${rs}px`,
            } as React.CSSProperties}
            title={`Remove “${r.text}”`}
            onClick={() => st.removeReminder(seat.id, r.id)}
          >
            <ReminderToken roleId={r.roleId} text={r.text} />
          </button>
        ))}

      <button className="seat-token" onClick={onClick} aria-label={seat.label}>
        <Token
          roleId={seat.roleId}
          alignment={seat.alignment}
          dead={seat.dead}
          deadBadge={view.grimoireRevealed}
          blank={blank}
          className={seat.traveller ? 'is-traveller' : ''}
        />
        {st_ && seat.shownRoleId && (
          <span className="seat-shown" title="What this player believes they are">
            <Token roleId={seat.shownRoleId} label={false} />
          </span>
        )}
        {!st_ && note && !seat.isMe && (
          <span className="seat-note" title="Your note">
            <Token roleId={note} label={false} />
          </span>
        )}
      </button>

      {st_ && seat.diesAtDawn && (
        <span className="seat-dawn" title="Players will see this death at dawn">
          <Icon name="moon" /> at dawn
        </span>
      )}
      {marked && (
        <span className="seat-mark" title="Marked for execution">
          <Icon name="axe" />
        </span>
      )}
      {st_ && view.townHall && seat.claimed && !view.townHall.back.includes(seat.id) && (
        <span className="seat-hall" title="Not back in the town hall yet">
          <Icon name="bell" />
        </span>
      )}
      {st_ && seat.awake && (
        <span className={`seat-awake ${seat.awake.seen ? 'seen' : ''}`} title={seat.awake.seen ? 'Awake and has seen your info' : 'Awake'}>
          <Icon name="eye" />
        </span>
      )}
      {nom && nom.status !== 'done' && (st_ || seat.isMe) && canVote && (
        <button
          className={`seat-vote ${voted ? 'up' : ''}`}
          title={voted ? 'Lower hand' : 'Raise hand'}
          onClick={() => (st_ ? st.setVote(seat.id, !voted, true) : player.vote(!voted))}
          disabled={!st_ && locked}
        >
          <Icon name="hand" />
        </button>
      )}
      {nom && voted && !(nom.status !== 'done' && (st_ || seat.isMe) && canVote) && (
        <span className={`seat-vote static up ${locked ? 'locked' : ''}`}>
          <Icon name="hand" />
        </span>
      )}

      <div className="seat-plate">
        {st_ && seat.claimed && <span className={`dot ${seat.connected ? 'on' : ''}`} title={seat.connected ? 'Online' : 'Offline'} />}
        <span className="seat-name">{seat.label}</span>
        {seat.dead && seat.ghostVote && (
          <span className="ghost-vote" title="Has a ghost vote">
            <Icon name="vote" />
          </span>
        )}
      </div>
    </div>
  );
}
