import { getRole } from '../data';
import { isTraveller } from '../state/host';
import type { GameState, WakePanel } from '../state/types';

/**
 * On the first night of a 7+ player game the Minions learn the Demon, and the Demon learns the
 * Minions and gets three bluffs. This works out what has and hasn't been shown yet.
 */
export function evilInfoStatus(g: GameState) {
  const demons = g.seats.filter((s) => getRole(s.roleId)?.team === 'demon');
  const minions = g.seats.filter((s) => getRole(s.roleId)?.team === 'minion');
  const players = g.seats.filter((s) => !isTraveller(s.roleId)).length;
  const applies = g.revealed && g.phase === 'night' && g.day === 1 && players >= 7 && demons.length > 0;
  const shown = (seatId: string, test: (p: WakePanel) => boolean) =>
    g.wakes.some((w) => w.to.includes(seatId) && [...w.panels, ...(w.extra?.[seatId] ?? [])].some(test));
  const bluffsShown = demons.every((d) => shown(d.id, (p) => p.card === 'notInPlay' && p.roleIds.length > 0));
  const minionsShown = minions.every((m) => shown(m.id, (p) => p.card === 'thisIsDemon'));
  return {
    applies,
    demons,
    minions,
    bluffsShown,
    minionsShown,
    bluffsChosen: g.bluffs.filter(Boolean).length,
    missing: applies && (!bluffsShown || !minionsShown),
  };
}
