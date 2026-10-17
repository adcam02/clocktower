import { create } from 'zustand';
import {
  defaultAlignment,
  editionScript,
  getRole,
  rolesByTeam,
  setCustomRoles,
  type Alignment,
  type Script,
} from '../data';
import { loadJSON, roomCode, saveJSON, shuffle, uid } from '../lib/util';
import type {
  Ask,
  GameState,
  Nomination,
  Phase,
  PrivateState,
  PublicState,
  Seat,
  WakeMessage,
  WakePanel,
} from './types';

const KEY = 'clocktower:storyteller';

export function blankSeat(): Seat {
  return {
    id: uid(),
    name: '',
    playerId: null,
    roleId: null,
    shownRoleId: null,
    alignment: null,
    dead: false,
    ghostVote: true,
    reminders: [],
  };
}

function freshGame(prev?: GameState, keepPlayers = true): GameState {
  const seats = prev
    ? prev.seats.map((s) =>
        keepPlayers ? { ...blankSeat(), id: s.id, name: s.name, playerId: s.playerId } : blankSeat(),
      )
    : Array.from({ length: 8 }, blankSeat);
  return {
    v: 1,
    room: prev?.room ?? roomCode(),
    phase: 'night',
    day: 1,
    script: prev?.script ?? editionScript('tb'),
    seats,
    bag: [],
    bluffs: [null, null, null],
    fabled: [],
    revealed: false,
    grimoireRevealed: false,
    nomination: null,
    marked: null,
    history: [],
    townHall: null,
    awake: {},
    wakes: [],
    replies: [],
    nightDone: [],
  };
}

function loadGame(): GameState | null {
  const g = loadJSON<GameState | null>(KEY, null);
  if (!g || g.v !== 1 || !Array.isArray(g.seats)) return null;
  if (g.nomination && (g.nomination.status === 'running' || g.nomination.status === 'countdown')) {
    g.nomination.status = g.nomination.step > 0 ? 'paused' : 'idle';
  }
  g.townHall ??= null;
  setCustomRoles(g.script.custom);
  return g;
}

// ---------------------------------------------------------------- derived values

export function seatName(g: { seats: { id: string; name: string }[] }, id: string | null | undefined): string {
  if (!id) return 'The Storyteller';
  const i = g.seats.findIndex((s) => s.id === id);
  if (i < 0) return 'Someone';
  return g.seats[i].name || `Seat ${i + 1}`;
}

export function aliveCount(seats: { dead: boolean }[]): number {
  return seats.filter((s) => !s.dead).length;
}

export function majorityOf(seats: { dead: boolean }[]): number {
  return Math.ceil(aliveCount(seats) / 2);
}

export function isTraveller(roleId: string | null | undefined): boolean {
  return getRole(roleId)?.team === 'traveller';
}

export function seatAlignment(s: Seat): Alignment | null {
  return s.alignment ?? defaultAlignment(getRole(s.roleId)?.team);
}

/** Who the Storyteller sees in each night-order role: the real character, plus anyone who thinks they have it. */
export function seatsWithRole(g: GameState, roleId: string): { seat: Seat; believes: boolean }[] {
  const out: { seat: Seat; believes: boolean }[] = [];
  for (const s of g.seats) {
    if (s.roleId === roleId) out.push({ seat: s, believes: false });
    else if (s.shownRoleId === roleId) out.push({ seat: s, believes: true });
  }
  return out;
}

export function nightLabel(g: { phase: Phase; day: number }): string {
  return `${g.phase === 'night' ? 'Night' : 'Day'} ${g.day}`;
}

export function toPublic(g: GameState, online: Set<string>): PublicState {
  return {
    room: g.room,
    phase: g.phase,
    day: g.day,
    script: g.script,
    seats: g.seats.map((s) => {
      const traveller = isTraveller(s.roleId);
      const show = g.grimoireRevealed || traveller;
      return {
        id: s.id,
        name: s.name,
        claimed: Boolean(s.playerId),
        connected: Boolean(s.playerId && online.has(s.playerId)),
        dead: s.dead,
        ghostVote: s.ghostVote,
        roleId: show ? s.roleId : null,
        alignment: g.grimoireRevealed ? seatAlignment(s) : null,
      };
    }),
    fabled: g.fabled,
    revealed: g.revealed,
    grimoireRevealed: g.grimoireRevealed,
    nomination: g.nomination,
    marked: g.marked,
    history: g.history,
    townHall: g.townHall,
  };
}

export function toPrivate(g: GameState, playerId: string): PrivateState {
  const seat = g.seats.find((s) => s.playerId === playerId) ?? null;
  if (!seat) return { seatId: null, roleId: null, alignment: null, wake: null, wakeSeen: false, log: [], replies: [] };
  const shown = seat.shownRoleId ?? seat.roleId;
  const awake = g.awake[seat.id];
  const visible = g.revealed || isTraveller(seat.roleId);
  return {
    seatId: seat.id,
    roleId: visible ? shown : null,
    alignment: visible ? seat.alignment ?? defaultAlignment(getRole(shown)?.team) : null,
    wake: awake ? g.wakes.find((w) => w.id === awake.wakeId) ?? null : null,
    wakeSeen: awake?.seen ?? false,
    log: g.wakes.filter((w) => w.to.includes(seat.id)),
    replies: g.replies.filter((r) => r.seatId === seat.id),
  };
}

function votingOrder(seats: Seat[], nomineeId: string): string[] {
  const i = seats.findIndex((s) => s.id === nomineeId);
  const n = seats.length;
  return Array.from({ length: n }, (_, k) => seats[(i + 1 + k) % n].id);
}

function pickRandom<T>(list: T[]): T | null {
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

/** The Drunk, Lunatic and Marionette are told they are something else. */
function suggestShown(g: GameState, seat: Seat): string | null {
  const inPlay = new Set(g.seats.map((s) => s.roleId).filter(Boolean) as string[]);
  const byTeam = rolesByTeam(g.script.roles);
  const unused = (team: 'townsfolk' | 'outsider' | 'demon') => byTeam[team].map((r) => r.id).filter((id) => !inPlay.has(id));
  if (seat.roleId === 'drunk') return pickRandom(unused('townsfolk'));
  if (seat.roleId === 'marionette') return pickRandom([...unused('townsfolk'), ...unused('outsider')]);
  if (seat.roleId === 'lunatic') {
    const demon = g.seats.find((s) => getRole(s.roleId)?.team === 'demon');
    return demon?.roleId ?? pickRandom(byTeam.demon.map((r) => r.id));
  }
  return null;
}

export const NEEDS_SHOWN = new Set(['drunk', 'lunatic', 'marionette']);

// ---------------------------------------------------------------- the store

interface HostStore {
  g: GameState;
  update: (fn: (g: GameState) => void) => void;
}

export const useHost = create<HostStore>((set, get) => ({
  g: loadGame() ?? freshGame(),
  update: (fn) => {
    const g = structuredClone(get().g);
    fn(g);
    set({ g });
  },
}));

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const flush = () => {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  saveJSON(KEY, useHost.getState().g);
};
useHost.subscribe(() => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 150);
});
// Don't lose the last change if the tab is closed or refreshed straight after it.
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());

export const hostGame = () => useHost.getState().g;
const update = (fn: (g: GameState) => void) => useHost.getState().update(fn);
const seatOf = (g: GameState, id: string) => g.seats.find((s) => s.id === id);

// ---------------------------------------------------------------- voting clock

let clock: ReturnType<typeof setTimeout> | null = null;

function stopClock() {
  if (clock) clearTimeout(clock);
  clock = null;
}

function lockSeat(g: GameState, nom: Nomination, seatId: string) {
  if (nom.locked.includes(seatId)) return;
  nom.locked.push(seatId);
  const seat = seatOf(g, seatId);
  if (seat?.dead && nom.votes.includes(seatId)) {
    seat.ghostVote = false;
    nom.spentGhosts.push(seatId);
  }
}

function runClock() {
  stopClock();
  const nom = hostGame().nomination;
  if (!nom) return;
  if (nom.status === 'countdown') {
    clock = setTimeout(() => {
      update((g) => {
        const n = g.nomination;
        if (!n || n.status !== 'countdown') return;
        if (n.countdown > 1) n.countdown -= 1;
        else {
          n.countdown = 0;
          n.status = 'running';
        }
      });
      runClock();
    }, 1000);
  } else if (nom.status === 'running') {
    clock = setTimeout(() => {
      update((g) => {
        const n = g.nomination;
        if (!n || n.status !== 'running') return;
        // The hand has rested on this player for a whole turn, so their vote is final as it moves on.
        if (n.step >= 1) lockSeat(g, n, n.order[n.step - 1]);
        if (n.step >= n.order.length) n.status = 'done';
        else n.step += 1;
      });
      runClock();
    }, nom.secondsPerPlayer * 1000);
  }
}

// ---------------------------------------------------------------- actions

export const st = {
  newGame(keepPlayers: boolean) {
    stopClock();
    const prev = hostGame();
    useHost.setState({ g: freshGame(prev, keepPlayers) });
  },
  newRoom() {
    stopClock();
    useHost.setState({ g: { ...freshGame(), room: roomCode() } });
  },

  setScript(script: Script) {
    setCustomRoles(script.custom);
    update((g) => {
      g.script = script;
      g.bag = [];
      g.bluffs = [null, null, null];
    });
  },

  // seats
  addSeat() {
    update((g) => void g.seats.push(blankSeat()));
  },
  setSeatCount(n: number) {
    update((g) => {
      while (g.seats.length < n) g.seats.push(blankSeat());
      // Remove empty, unclaimed seats from the end first.
      for (let i = g.seats.length - 1; i >= 0 && g.seats.length > n; i--) {
        if (!g.seats[i].playerId && !g.seats[i].name) g.seats.splice(i, 1);
      }
      while (g.seats.length > n) g.seats.pop();
    });
  },
  removeSeat(id: string) {
    update((g) => {
      g.seats = g.seats.filter((s) => s.id !== id);
      delete g.awake[id];
      if (g.nomination && (g.nomination.nomineeId === id || g.nomination.nominatorId === id)) g.nomination = null;
      if (g.marked?.seatId === id) g.marked = null;
    });
  },
  renameSeat(id: string, name: string) {
    update((g) => {
      const s = seatOf(g, id);
      if (s) s.name = name.trim().slice(0, 24);
    });
  },
  swapSeats(a: string, b: string) {
    update((g) => {
      const i = g.seats.findIndex((s) => s.id === a);
      const j = g.seats.findIndex((s) => s.id === b);
      if (i < 0 || j < 0) return;
      [g.seats[i], g.seats[j]] = [g.seats[j], g.seats[i]];
    });
  },
  moveSeat(id: string, toId: string) {
    update((g) => {
      const i = g.seats.findIndex((s) => s.id === id);
      const j = g.seats.findIndex((s) => s.id === toId);
      if (i < 0 || j < 0) return;
      const [s] = g.seats.splice(i, 1);
      g.seats.splice(j, 0, s);
    });
  },
  vacateSeat(id: string) {
    update((g) => {
      const s = seatOf(g, id);
      if (s) s.playerId = null;
    });
  },

  // characters
  setRole(id: string, roleId: string | null) {
    update((g) => {
      const s = seatOf(g, id);
      if (!s) return;
      s.roleId = roleId;
      s.shownRoleId = null;
      s.alignment = null;
      if (roleId && NEEDS_SHOWN.has(roleId)) s.shownRoleId = suggestShown(g, s);
    });
  },
  setShownRole(id: string, roleId: string | null) {
    update((g) => {
      const s = seatOf(g, id);
      if (s) s.shownRoleId = roleId && roleId !== s.roleId ? roleId : null;
    });
  },
  setAlignment(id: string, alignment: Alignment | null) {
    update((g) => {
      const s = seatOf(g, id);
      if (!s) return;
      s.alignment = alignment === defaultAlignment(getRole(s.roleId)?.team) ? null : alignment;
    });
  },
  swapRoles(a: string, b: string) {
    update((g) => {
      const x = seatOf(g, a);
      const y = seatOf(g, b);
      if (!x || !y) return;
      [x.roleId, y.roleId] = [y.roleId, x.roleId];
      [x.shownRoleId, y.shownRoleId] = [y.shownRoleId, x.shownRoleId];
      [x.alignment, y.alignment] = [y.alignment, x.alignment];
    });
  },
  clearRoles() {
    update((g) => {
      for (const s of g.seats) {
        s.roleId = null;
        s.shownRoleId = null;
        s.alignment = null;
        s.reminders = [];
      }
      g.revealed = false;
    });
  },
  toggleDead(id: string) {
    update((g) => {
      const s = seatOf(g, id);
      if (!s) return;
      s.dead = !s.dead;
      if (!s.dead) s.ghostVote = true;
    });
  },
  toggleGhostVote(id: string) {
    update((g) => {
      const s = seatOf(g, id);
      if (s) s.ghostVote = !s.ghostVote;
    });
  },
  addReminder(seatId: string, roleId: string, text: string) {
    update((g) => void seatOf(g, seatId)?.reminders.push({ id: uid(), roleId, text }));
  },
  removeReminder(seatId: string, reminderId: string) {
    update((g) => {
      const s = seatOf(g, seatId);
      if (s) s.reminders = s.reminders.filter((r) => r.id !== reminderId);
    });
  },

  // the bag
  setBag(ids: string[]) {
    update((g) => void (g.bag = ids));
  },
  addToBag(id: string) {
    update((g) => void g.bag.push(id));
  },
  removeFromBag(id: string) {
    update((g) => {
      const i = g.bag.lastIndexOf(id);
      if (i >= 0) g.bag.splice(i, 1);
    });
  },
  /** Hand the bag out at random to every seat that isn't a traveller. */
  dealRandom() {
    update((g) => {
      const seats = g.seats.filter((s) => !isTraveller(s.roleId));
      const bag = shuffle(g.bag).slice(0, seats.length);
      seats.forEach((s, i) => {
        s.roleId = bag[i] ?? null;
        s.shownRoleId = null;
        s.alignment = null;
        s.reminders = [];
      });
      for (const s of seats) if (s.roleId && NEEDS_SHOWN.has(s.roleId)) s.shownRoleId = suggestShown(g, s);
    });
  },
  suggestShown(id: string) {
    update((g) => {
      const s = seatOf(g, id);
      if (s) s.shownRoleId = suggestShown(g, s);
    });
  },
  reveal(on: boolean) {
    update((g) => void (g.revealed = on));
  },

  // bluffs & fabled
  setBluff(i: number, id: string | null) {
    update((g) => void (g.bluffs[i] = id));
  },
  randomBluffs() {
    update((g) => {
      const inPlay = new Set(g.seats.flatMap((s) => [s.roleId, s.shownRoleId]).filter(Boolean) as string[]);
      const byTeam = rolesByTeam(g.script.roles);
      const pool = [...byTeam.townsfolk, ...byTeam.outsider].map((r) => r.id).filter((id) => !inPlay.has(id));
      const tf = shuffle(byTeam.townsfolk.map((r) => r.id).filter((id) => !inPlay.has(id)));
      // Two Townsfolk and one Townsfolk-or-Outsider reads like a believable spread.
      const picks = [...tf.slice(0, 2)];
      for (const id of shuffle(pool)) if (picks.length < 3 && !picks.includes(id)) picks.push(id);
      g.bluffs = [picks[0] ?? null, picks[1] ?? null, picks[2] ?? null];
    });
  },
  toggleFabled(id: string) {
    update((g) => {
      g.fabled = g.fabled.includes(id) ? g.fabled.filter((f) => f !== id) : [...g.fabled, id];
    });
  },

  // day & night
  setPhase(phase: Phase) {
    stopClock();
    update((g) => {
      if (g.phase === phase) return;
      if (phase === 'night' && g.phase === 'day') g.day += 1;
      g.phase = phase;
      g.nomination = null;
      g.marked = null;
      g.nightDone = [];
      g.townHall = null;
      if (phase === 'day') g.awake = {};
    });
  },
  setDay(day: number) {
    update((g) => void (g.day = Math.max(1, day)));
  },
  toggleNightDone(key: string) {
    update((g) => {
      g.nightDone = g.nightDone.includes(key) ? g.nightDone.filter((k) => k !== key) : [...g.nightDone, key];
    });
  },

  // nominations
  nominate(nominatorId: string | null, nomineeId: string) {
    stopClock();
    update((g) => {
      const prev = g.nomination;
      g.nomination = {
        nominatorId,
        nomineeId,
        votes: [],
        locked: [],
        spentGhosts: [],
        order: votingOrder(g.seats, nomineeId),
        step: 0,
        status: 'idle',
        countdown: 0,
        secondsPerPlayer: prev?.secondsPerPlayer ?? 2,
      };
    });
  },
  setVote(seatId: string, up: boolean, force = false) {
    update((g) => {
      const n = g.nomination;
      const seat = seatOf(g, seatId);
      if (!n || !seat || n.status === 'done') return;
      if (!force && n.locked.includes(seatId)) return;
      if (!force && up && seat.dead && !seat.ghostVote) return;
      n.votes = n.votes.filter((v) => v !== seatId);
      if (up) n.votes.push(seatId);
      if (force && n.locked.includes(seatId) && seat.dead) {
        // The Storyteller corrected a locked dead vote; keep the ghost vote in step.
        const spent = n.spentGhosts.includes(seatId);
        if (up && !spent) {
          seat.ghostVote = false;
          n.spentGhosts.push(seatId);
        } else if (!up && spent) {
          seat.ghostVote = true;
          n.spentGhosts = n.spentGhosts.filter((x) => x !== seatId);
        }
      }
    });
  },
  countdown() {
    update((g) => {
      const n = g.nomination;
      if (!n || n.status === 'done') return;
      n.status = 'countdown';
      n.countdown = 3;
    });
    runClock();
  },
  startVote() {
    update((g) => {
      const n = g.nomination;
      if (n && n.status !== 'done') n.status = 'running';
    });
    runClock();
  },
  pauseVote() {
    stopClock();
    update((g) => {
      const n = g.nomination;
      if (n && (n.status === 'running' || n.status === 'countdown')) n.status = 'paused';
    });
  },
  resetVote() {
    stopClock();
    update((g) => {
      const n = g.nomination;
      if (!n) return;
      for (const id of n.spentGhosts) {
        const s = seatOf(g, id);
        if (s) s.ghostVote = true;
      }
      Object.assign(n, { votes: [], locked: [], spentGhosts: [], step: 0, status: 'idle', countdown: 0 });
    });
  },
  setSecondsPerPlayer(secs: number) {
    update((g) => {
      if (g.nomination) g.nomination.secondsPerPlayer = Math.max(1, Math.min(10, secs));
    });
  },
  closeNomination() {
    stopClock();
    update((g) => {
      const n = g.nomination;
      if (!n) return;
      if (n.status === 'done') {
        const voters = n.order.filter((id) => n.votes.includes(id));
        g.history.push({
          id: uid(),
          day: g.day,
          nominatorId: n.nominatorId,
          nomineeId: n.nomineeId,
          nominatorName: seatName(g, n.nominatorId),
          nomineeName: seatName(g, n.nomineeId),
          voters,
          votes: voters.length,
          majority: majorityOf(g.seats),
        });
      }
      g.nomination = null;
    });
  },
  markSeat(seatId: string, votes?: number) {
    update((g) => {
      const n = g.nomination;
      g.marked = { seatId, votes: votes ?? (n && n.nomineeId === seatId ? n.votes.length : 0) };
    });
  },
  clearMark() {
    update((g) => void (g.marked = null));
  },

  // waking players
  wake(to: string[], panels: WakePanel[], ask: Ask): string {
    const id = uid();
    update((g) => {
      const msg: WakeMessage = { id, to, panels, ask, at: Date.now(), when: nightLabel(g) };
      g.wakes.push(msg);
      for (const seatId of to) g.awake[seatId] = { wakeId: id, seen: false };
    });
    return id;
  },
  sleep(seatIds?: string[]) {
    update((g) => {
      if (!seatIds) g.awake = {};
      else for (const id of seatIds) delete g.awake[id];
    });
  },
  /** Rings the bell on every player's screen until they say they're back. */
  callTownHall() {
    update((g) => {
      if (g.townHall) {
        g.townHall.ring += 1;
        g.townHall.at = Date.now();
      } else g.townHall = { id: uid(), at: Date.now(), ring: 0, back: [] };
    });
  },
  endTownHall() {
    update((g) => void (g.townHall = null));
  },
  revealGrimoire(on: boolean) {
    update((g) => void (g.grimoireRevealed = on));
  },

  // things players ask for
  fromPlayer: {
    claim(playerId: string, seatId: string, name: string) {
      update((g) => {
        const seat = seatOf(g, seatId);
        if (!seat || (seat.playerId && seat.playerId !== playerId)) return;
        for (const s of g.seats) if (s.playerId === playerId) s.playerId = null;
        seat.playerId = playerId;
        if (name.trim()) seat.name = name.trim().slice(0, 24);
      });
    },
    leave(playerId: string) {
      update((g) => {
        for (const s of g.seats) if (s.playerId === playerId) s.playerId = null;
      });
    },
    rename(playerId: string, name: string) {
      update((g) => {
        const s = g.seats.find((x) => x.playerId === playerId);
        if (!s) return;
        if (name.trim()) s.name = name.trim().slice(0, 24);
      });
    },
    vote(playerId: string, up: boolean) {
      const s = hostGame().seats.find((x) => x.playerId === playerId);
      if (s) st.setVote(s.id, up);
    },
    back(playerId: string, id: string) {
      update((g) => {
        const s = g.seats.find((x) => x.playerId === playerId);
        if (s && g.townHall?.id === id && !g.townHall.back.includes(s.id)) g.townHall.back.push(s.id);
      });
    },
    ack(playerId: string, wakeId: string) {
      update((g) => {
        const s = g.seats.find((x) => x.playerId === playerId);
        const a = s && g.awake[s.id];
        if (a && a.wakeId === wakeId) a.seen = true;
      });
    },
    reply(playerId: string, wakeId: string, r: { seatIds?: string[]; roleIds?: string[]; answer?: boolean }) {
      update((g) => {
        const s = g.seats.find((x) => x.playerId === playerId);
        if (!s || !g.wakes.some((w) => w.id === wakeId && w.to.includes(s.id))) return;
        g.replies = g.replies.filter((x) => !(x.wakeId === wakeId && x.seatId === s.id));
        g.replies.push({ wakeId, seatId: s.id, ...r, at: Date.now() });
        const a = g.awake[s.id];
        if (a && a.wakeId === wakeId) a.seen = true;
      });
    },
  },
};
