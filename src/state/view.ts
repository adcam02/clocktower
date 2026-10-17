import { createContext, useContext, useMemo } from 'react';
import { defaultAlignment, getRole, type Alignment, type Script } from '../data';
import { useClient } from '../net/client';
import { useHostNet } from '../net/host';
import { isTraveller, seatAlignment, useHost } from './host';
import type { AwakeState, Nomination, Phase, Reminder, TownHall, VoteRecord } from './types';
import { useUI } from './ui';

export type Mode = 'st' | 'player';
export const ModeContext = createContext<Mode>('player');
export const useMode = () => useContext(ModeContext);

export interface SeatView {
  id: string;
  index: number;
  name: string;
  label: string;
  claimed: boolean;
  connected: boolean;
  dead: boolean;
  ghostVote: boolean;
  /** The character this viewer can see on the token. */
  roleId: string | null;
  /** Storyteller only: what the player believes they are, when it differs. */
  shownRoleId: string | null;
  alignment: Alignment | null;
  reminders: Reminder[];
  isMe: boolean;
  awake: AwakeState | null;
  traveller: boolean;
}

export interface View {
  mode: Mode;
  room: string;
  phase: Phase;
  day: number;
  script: Script;
  seats: SeatView[];
  fabled: string[];
  nomination: Nomination | null;
  marked: { seatId: string; votes: number } | null;
  history: VoteRecord[];
  townHall: TownHall | null;
  revealed: boolean;
  grimoireRevealed: boolean;
  mySeatId: string | null;
}

const label = (name: string, i: number) => name || `Seat ${i + 1}`;

export function useStorytellerView(): View {
  const g = useHost((s) => s.g);
  const online = useHostNet((s) => s.online);
  const hide = useUI((s) => s.hideGrimoire);
  return useMemo(
    () => ({
      mode: 'st',
      room: g.room,
      phase: g.phase,
      day: g.day,
      script: g.script,
      seats: g.seats.map((s, i) => ({
        id: s.id,
        index: i,
        name: s.name,
        label: label(s.name, i),
        claimed: Boolean(s.playerId),
        connected: Boolean(s.playerId && online[s.playerId]),
        dead: s.dead,
        ghostVote: s.ghostVote,
        roleId: hide && !isTraveller(s.roleId) ? null : s.roleId,
        shownRoleId: hide ? null : s.shownRoleId,
        alignment: hide ? null : seatAlignment(s),
        reminders: hide ? [] : s.reminders,
        isMe: false,
        awake: g.awake[s.id] ?? null,
        traveller: isTraveller(s.roleId),
      })),
      fabled: g.fabled,
      nomination: g.nomination,
      marked: g.marked,
      history: g.history,
      townHall: g.townHall,
      revealed: g.revealed,
      grimoireRevealed: g.grimoireRevealed,
      mySeatId: null,
    }),
    [g, online, hide],
  );
}

export function usePlayerView(): View | null {
  const pub = useClient((s) => s.pub);
  const priv = useClient((s) => s.priv);
  return useMemo(() => {
    if (!pub) return null;
    return {
      mode: 'player',
      room: pub.room,
      phase: pub.phase,
      day: pub.day,
      script: pub.script,
      seats: pub.seats.map((s, i) => {
        const isMe = priv?.seatId === s.id;
        const roleId = isMe && priv?.roleId ? priv.roleId : s.roleId;
        return {
          id: s.id,
          index: i,
          name: s.name,
          label: label(s.name, i),
          claimed: s.claimed,
          connected: s.connected,
          dead: s.dead,
          ghostVote: s.ghostVote,
          roleId,
          shownRoleId: null,
          alignment: isMe && priv?.roleId ? priv.alignment : s.alignment ?? defaultAlignment(getRole(roleId)?.team),
          reminders: [],
          isMe,
          awake: null,
          traveller: isTraveller(s.roleId),
        };
      }),
      fabled: pub.fabled,
      nomination: pub.nomination,
      marked: pub.marked,
      history: pub.history,
      townHall: pub.townHall ?? null,
      revealed: pub.revealed,
      grimoireRevealed: pub.grimoireRevealed,
      mySeatId: priv?.seatId ?? null,
    };
  }, [pub, priv]);
}

export const ViewContext = createContext<View | null>(null);
export function useView(): View {
  const v = useContext(ViewContext);
  if (!v) throw new Error('No view');
  return v;
}
