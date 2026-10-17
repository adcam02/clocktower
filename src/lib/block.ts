import { majorityOf } from '../state/host';
import type { View } from '../state/view';

export type BlockOutlook =
  | { state: 'locked'; text: string }
  | { state: 'tie-only'; text: string; tie: number }
  | { state: 'open'; text: string; tie: number | null; beat: number };

/**
 * Whether anyone can still tie or beat the player on the block today. The most votes a nomination
 * can get is every living player plus every dead player who still has their ghost vote.
 */
export function blockOutlook(view: View): BlockOutlook | null {
  const marked = view.marked;
  if (!marked) return null;
  const seats = view.seats;
  const votesLeft = seats.filter((s) => !s.dead || s.ghostVote).length;
  const majority = majorityOf(seats);

  const today = view.history.filter((h) => h.day === view.day);
  const nominators = new Set(today.map((h) => h.nominatorId).filter(Boolean) as string[]);
  const nominees = new Set(today.map((h) => h.nomineeId));
  const n = view.nomination;
  if (n && n.status === 'done') {
    if (n.nominatorId) nominators.add(n.nominatorId);
    nominees.add(n.nomineeId);
  }
  const canNominate = seats.some((s) => !s.dead && !nominators.has(s.id));
  const canBeNominated = seats.some((s) => s.id !== marked.seatId && !nominees.has(s.id));
  if (!canNominate || !canBeNominated) return { state: 'locked', text: 'Execution is locked in: there’s no one left to nominate today.' };

  // A tie only saves them if it also reaches a majority.
  const tie = marked.votes >= majority ? marked.votes : null;
  const beat = Math.max(marked.votes + 1, majority);
  if (votesLeft < (tie ?? beat)) {
    return { state: 'locked', text: `Execution is locked in: only ${votesLeft} votes are left, so no one can reach ${tie ?? beat}.` };
  }
  if (votesLeft < beat && tie) {
    return { state: 'tie-only', tie, text: `Only a tie can save them: ${tie} votes, which is every vote left.` };
  }
  return { state: 'open', tie, beat, text: tie ? `${beat} to beat, ${tie} to tie.` : `${beat} to replace them.` };
}
