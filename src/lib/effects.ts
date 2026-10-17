import { useEffect, useRef } from 'react';
import { useClient } from '../net/client';
import { seatName, useHost } from '../state/host';
import { ui } from '../state/ui';
import type { View } from '../state/view';
import { getRole } from '../data';
import { countBeat, dawn, gavel, nightfall, primeAudio, tick, townBells, wakeChime } from './audio';
import { notify } from './notify';

/** Sounds, banners and notices that follow from changes in the game. */
export function useEffects(view: View | null) {
  const prev = useRef<View | null>(null);
  const wakeId = useClient((s) => s.priv?.wake?.id ?? null);
  const wakeSeen = useClient((s) => s.priv?.wakeSeen ?? false);
  const replies = useHost((s) => s.g.replies);
  const seenReplies = useRef(replies.length);
  const lastWake = useRef<string | null>(null);

  useEffect(() => primeAudio(), []);

  useEffect(() => {
    const p = prev.current;
    prev.current = view;
    if (!view || !p) return;
    if (p.phase !== view.phase) {
      if (view.phase === 'night') {
        nightfall();
        ui.banner(`Night ${view.day}`, 'Close your eyes');
      } else {
        dawn();
        ui.banner(`Day ${view.day}`, 'The town wakes');
      }
    }
    const n = view.nomination;
    const pn = p.nomination;
    if (n && pn && n.nomineeId === pn.nomineeId) {
      if (n.status === 'countdown' && n.countdown !== pn.countdown) countBeat();
      if (n.status === 'running' && pn.status === 'countdown') countBeat(true);
      if (n.step !== pn.step && n.step > 0) tick();
      if (n.status === 'done' && pn.status !== 'done') gavel();
    }
    if (n && n.status === 'countdown' && (!pn || pn.status !== 'countdown')) countBeat();
    if (view.mode === 'st') {
      for (const s of view.seats) {
        const before = p.seats.find((x) => x.id === s.id);
        if (before && s.claimed && !before.claimed) ui.toast(`${s.label} sat down in seat ${s.index + 1}`, 'info');
      }
    }
    if (view.grimoireRevealed && !p.grimoireRevealed) ui.banner('The grimoire is revealed', 'Every character, face up');
  }, [view]);

  // A player being woken.
  useEffect(() => {
    if (view?.mode !== 'player') return;
    if (wakeId && wakeId !== lastWake.current) {
      wakeChime();
      notify('You are awake', 'The Storyteller is showing you something. Open the Grimoire.', 'wake');
    }
    lastWake.current = wakeId;
  }, [wakeId, view?.mode]);

  // A player being called back to the town hall. The bells ring again a couple of times if they don't answer.
  const me = view?.seats.find((s) => s.isMe);
  const call = view?.mode === 'player' ? view.townHall : null;
  const called = Boolean(call && me && !call.back.includes(me.id));
  const callKey = called && call ? `${call.id}:${call.ring}` : null;
  useEffect(() => {
    if (!callKey) return;
    townBells();
    notify('Back to the town hall!', 'The Storyteller is calling everyone back to the main channel.', 'hall');
    let rings = 0;
    const t = setInterval(() => {
      if (++rings > 2) return clearInterval(t);
      townBells();
    }, 15000);
    return () => clearInterval(t);
  }, [callKey]);

  useEffect(() => {
    if (view?.mode !== 'player') return;
    const base = `Room ${view.room} · The Grimoire`;
    const alert = called ? '🔔 Back to the town hall!' : wakeId && !wakeSeen ? '👁 You are awake' : null;
    if (!alert) {
      document.title = base;
      return;
    }
    let on = true;
    const t = setInterval(() => {
      document.title = on ? alert : base;
      on = !on;
    }, 900);
    return () => {
      clearInterval(t);
      document.title = base;
    };
  }, [wakeId, wakeSeen, called, view?.mode, view?.room]);

  // The Storyteller hearing back from a player.
  useEffect(() => {
    if (view?.mode !== 'st') return;
    const fresh = replies.slice(seenReplies.current);
    seenReplies.current = replies.length;
    const g = useHost.getState().g;
    for (const r of fresh) {
      const who = seatName(g, r.seatId);
      const parts: string[] = [];
      if (r.seatIds?.length) parts.push(r.seatIds.map((id) => seatName(g, id)).join(', '));
      if (r.roleIds?.length) parts.push(r.roleIds.map((id) => getRole(id)?.name ?? id).join(', '));
      if (r.answer !== undefined) parts.push(r.answer ? 'yes' : 'no');
      ui.toast(`${who} answered: ${parts.join(' · ') || 'nothing'}`, 'good');
    }
  }, [replies, view?.mode]);
}
