import { getRole, nightReminder } from '../data';
import { hostGame, st } from '../state/host';
import type { Ask, InfoCard, WakePanel } from '../state/types';
import { emptyPanel, ui } from '../state/ui';

const WORDS: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, '1': 1, '2': 2, '3': 3 };

/** Guesses the cards and question a night-sheet entry calls for, so waking someone is one click. */
export function presetFor(roleId: string, kind: 'first' | 'other'): { panels: WakePanel[]; ask: Ask } {
  const text = nightReminder(roleId, kind);
  const panels: WakePanel[] = [];
  const cardFor: [RegExp, InfoCard][] = [
    [/\*YOU ARE\*/i, 'youAre'],
    [/\*THIS PLAYER IS\*/i, 'thisPlayerIs'],
    [/\*THIS CHARACTER SELECTED YOU\*/i, 'selectedYou'],
    [/\*THESE CHARACTERS ARE NOT IN PLAY\*/i, 'notInPlay'],
    [/\*THIS IS THE DEMON\*/i, 'thisIsDemon'],
    [/\*THESE ARE YOUR MINIONS\*/i, 'theseAreMinions'],
  ];
  for (const [re, card] of cardFor) if (re.test(text)) panels.push({ ...emptyPanel(), card });

  let ask: Ask = null;
  const players = text.match(/chooses? (a|one|two|three|1|2|3) (?:\w+ )?players?/i);
  const character = /chooses? (?:a|an) (?:\w+ )?character/i.test(text);
  if (players) ask = { kind: 'players', count: WORDS[players[1].toLowerCase()] ?? 1 };
  else if (character) ask = { kind: 'character', count: 1 };
  else if (/might choose|may choose|chooses whether|uses? (?:their|its) ability/i.test(text)) ask = { kind: 'yesno' };

  if (ask && ask.kind !== 'yesno' && !panels.some((p) => p.card === 'makeChoice')) panels.unshift({ ...emptyPanel(), card: 'makeChoice' });
  if (ask?.kind === 'yesno' && !panels.length) panels.unshift({ ...emptyPanel(), card: 'useAbility' });
  if (!panels.length) panels.push(emptyPanel());
  return { panels, ask };
}

export function evilTeam() {
  const g = hostGame();
  const demons = g.seats.filter((s) => getRole(s.roleId)?.team === 'demon').map((s) => s.id);
  const minions = g.seats.filter((s) => getRole(s.roleId)?.team === 'minion').map((s) => s.id);
  const bluffs = g.bluffs.filter(Boolean) as string[];
  return { demons, minions, bluffs };
}

export function minionInfo(): { to: string[]; panels: WakePanel[] } {
  const { demons, minions } = evilTeam();
  return {
    to: minions,
    panels: [
      { ...emptyPanel(), card: 'thisIsDemon', seatIds: demons },
      { ...emptyPanel(), card: 'theseAreMinions', seatIds: minions },
    ],
  };
}

export function demonInfo(): { to: string[]; panels: WakePanel[] } {
  let { demons, minions, bluffs } = evilTeam();
  if (!bluffs.length) {
    // Never wake the Demon without bluffs to show them.
    st.randomBluffs();
    ({ demons, minions, bluffs } = evilTeam());
    ui.toast('Picked three bluffs for you. Change them at the bottom left before you show them.', 'info');
  }
  return {
    to: demons,
    panels: [
      { ...emptyPanel(), card: 'theseAreMinions', seatIds: minions },
      { ...emptyPanel(), card: 'notInPlay', roleIds: bluffs },
    ],
  };
}

/** Wakes the Demon and Minions together so they all see each other. */
export function wholeEvilTeam(): { to: string[]; panels: WakePanel[] } {
  const { demons, minions } = evilTeam();
  return {
    to: [...demons, ...minions],
    panels: [
      { ...emptyPanel(), card: 'thisIsDemon', seatIds: demons },
      { ...emptyPanel(), card: 'theseAreMinions', seatIds: minions },
    ],
  };
}
