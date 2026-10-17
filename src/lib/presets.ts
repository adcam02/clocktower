import { getRole, nightReminder } from '../data';
import { hostGame, st } from '../state/host';
import type { Ask, InfoCard, WakePanel } from '../state/types';
import { emptyPanel, ui } from '../state/ui';

const WORDS: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, '1': 1, '2': 2, '3': 3 };

const QUESTIONS: Record<string, string> = {
  poisoner: 'Who do you want to poison?',
  monk: 'Who do you want to protect?',
  innkeeper: 'Who do you want to protect?',
  butler: 'Who is your master?',
  fortuneteller: 'Which 2 players do you want to check?',
  ravenkeeper: 'Whose character do you want to learn?',
};

/** The question a character's choice is asking, in plain words. Demons, and anything that kills, ask who dies. */
function questionFor(roleId: string): string | undefined {
  if (QUESTIONS[roleId]) return QUESTIONS[roleId];
  const role = getRole(roleId);
  if (!role) return undefined;
  if (role.team === 'demon' || /they die\b/i.test(role.ability)) return 'Who do you want to kill?';
  return undefined;
}

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
  // The Demon picks a victim every other night, however its sheet entry is worded.
  if (kind === 'other' && getRole(roleId)?.team === 'demon' && (!ask || ask.kind === 'yesno')) ask = { kind: 'players', count: 1 };
  if (ask && ask.kind === 'players') {
    const prompt = questionFor(roleId);
    if (prompt) ask = { ...ask, prompt };
  }

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

/** Never wake the Demon without bluffs to show them. */
function evilTeamWithBluffs() {
  if (!evilTeam().bluffs.length) {
    st.randomBluffs();
    ui.toast('Picked three bluffs for you. Change them at the bottom left before you show them.', 'info');
  }
  return evilTeam();
}

export function demonInfo(): { to: string[]; panels: WakePanel[] } {
  const { demons, minions, bluffs } = evilTeamWithBluffs();
  return {
    to: demons,
    panels: [
      { ...emptyPanel(), card: 'theseAreMinions', seatIds: minions },
      { ...emptyPanel(), card: 'notInPlay', roleIds: bluffs },
    ],
  };
}

/** Wakes the Demon and Minions together so they all see each other; only the Demon also sees the bluffs. */
export function wholeEvilTeam(): { to: string[]; panels: WakePanel[]; extra: Record<string, WakePanel[]> } {
  const { demons, minions, bluffs } = evilTeamWithBluffs();
  return {
    to: [...demons, ...minions],
    panels: [
      { ...emptyPanel(), card: 'thisIsDemon', seatIds: demons },
      { ...emptyPanel(), card: 'theseAreMinions', seatIds: minions },
    ],
    extra: Object.fromEntries(demons.map((id) => [id, [{ ...emptyPanel(), card: 'notInPlay' as const, roleIds: bluffs }]])),
  };
}
