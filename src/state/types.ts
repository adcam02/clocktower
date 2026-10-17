import type { Alignment, Script } from '../data';

export type Phase = 'night' | 'day';

export interface Reminder {
  id: string;
  roleId: string;
  text: string;
}

export interface Seat {
  id: string;
  name: string;
  /** The browser that took this seat. */
  playerId: string | null;
  /** The character the player really has. */
  roleId: string | null;
  /** What the player was told they are, when that differs (the Drunk, the Lunatic). */
  shownRoleId: string | null;
  /** Alignment when it differs from the character's team. */
  alignment: Alignment | null;
  dead: boolean;
  ghostVote: boolean;
  reminders: Reminder[];
}

export type NominationStatus = 'idle' | 'countdown' | 'running' | 'paused' | 'done';

export interface Nomination {
  nominatorId: string | null;
  nomineeId: string;
  /** Seats with a hand raised. */
  votes: string[];
  /** Seats the clock hand has moved past, whose vote is final. */
  locked: string[];
  /** Dead players whose ghost vote this nomination used. */
  spentGhosts: string[];
  /** Voting order: the player after the nominee, clockwise, ending with the nominee. */
  order: string[];
  /** The seat the hand is on: 0 is the nominee before voting starts, then order[step - 1]. */
  step: number;
  status: NominationStatus;
  countdown: number;
  secondsPerPlayer: number;
}

export interface VoteRecord {
  id: string;
  day: number;
  nominatorId: string | null;
  nomineeId: string;
  nominatorName: string;
  nomineeName: string;
  voters: string[];
  votes: number;
  majority: number;
}

export type InfoCard =
  | 'useAbility'
  | 'makeChoice'
  | 'notInPlay'
  | 'thisIsDemon'
  | 'theseAreMinions'
  | 'youAre'
  | 'thisPlayerIs'
  | 'selectedYou';

/** gotIt, yes, no, good, evil, or a number written as n0, n1, … */
export type Sign = string;

export interface WakePanel {
  card: InfoCard | null;
  signs: Sign[];
  roleIds: string[];
  seatIds: string[];
  text: string;
}

export type Ask = { kind: 'players'; count: number } | { kind: 'character'; count: number } | { kind: 'yesno' } | null;

export interface WakeMessage {
  id: string;
  to: string[];
  panels: WakePanel[];
  ask: Ask;
  at: number;
  when: string;
}

export interface WakeReply {
  wakeId: string;
  seatId: string;
  seatIds?: string[];
  roleIds?: string[];
  answer?: boolean;
  at: number;
}

export interface AwakeState {
  wakeId: string;
  seen: boolean;
}

/** The Storyteller calling everyone back from their private chats. */
export interface TownHall {
  id: string;
  at: number;
  /** Bumped by "ring again", which only alerts players who aren't back yet. */
  ring: number;
  /** Seats whose player has pressed "I'm back". */
  back: string[];
}

export interface GameState {
  v: 1;
  room: string;
  phase: Phase;
  day: number;
  script: Script;
  seats: Seat[];
  bag: string[];
  bluffs: (string | null)[];
  fabled: string[];
  revealed: boolean;
  grimoireRevealed: boolean;
  nomination: Nomination | null;
  marked: { seatId: string; votes: number } | null;
  history: VoteRecord[];
  townHall: TownHall | null;
  awake: Record<string, AwakeState>;
  wakes: WakeMessage[];
  replies: WakeReply[];
  nightDone: string[];
}

// ---------------------------------------------------------------- what players receive

export interface PublicSeat {
  id: string;
  name: string;
  claimed: boolean;
  connected: boolean;
  dead: boolean;
  ghostVote: boolean;
  /** Only travellers' characters are public, until the grimoire is revealed at the end. */
  roleId: string | null;
  alignment: Alignment | null;
}

export interface PublicState {
  room: string;
  phase: Phase;
  day: number;
  script: Script;
  seats: PublicSeat[];
  fabled: string[];
  revealed: boolean;
  grimoireRevealed: boolean;
  nomination: Nomination | null;
  marked: { seatId: string; votes: number } | null;
  history: VoteRecord[];
  townHall: TownHall | null;
}

export interface PrivateState {
  seatId: string | null;
  roleId: string | null;
  alignment: Alignment | null;
  wake: WakeMessage | null;
  wakeSeen: boolean;
  /** Everything the Storyteller has shown this seat, oldest first. */
  log: WakeMessage[];
  /** Replies this seat has sent. */
  replies: WakeReply[];
}

// ---------------------------------------------------------------- messages

export type HostMessage =
  | { t: 'state'; s: PublicState }
  | { t: 'private'; p: PrivateState }
  | { t: 'pong' }
  | { t: 'host' }
  | { t: 'error'; message: string };

export type ClientMessage =
  | { t: 'hello'; playerId: string }
  | { t: 'claim'; seatId: string; name: string }
  | { t: 'leave' }
  | { t: 'rename'; name: string }
  | { t: 'vote'; up: boolean }
  | { t: 'ack'; wakeId: string }
  | { t: 'reply'; wakeId: string; seatIds?: string[]; roleIds?: string[]; answer?: boolean }
  | { t: 'sleep' }
  | { t: 'back'; id: string }
  | { t: 'ping' };
