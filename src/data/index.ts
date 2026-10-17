import rolesJson from './roles.json';
import iconsJson from './icons.json';
import nightsheetJson from './nightsheet.json';
import jinxesJson from './jinxes.json';

export type Team = 'townsfolk' | 'outsider' | 'minion' | 'demon' | 'traveller' | 'fabled' | 'loric';
export type Alignment = 'good' | 'evil';

export interface Role {
  id: string;
  name: string;
  team: Team;
  edition: string;
  ability: string;
  firstNightReminder?: string;
  otherNightReminder?: string;
  reminders?: string[];
  remindersGlobal?: string[];
  setup?: boolean;
  special?: string[];
  flavor?: string;
  /** Homebrew characters from a custom script carry their own picture. */
  image?: string;
  custom?: boolean;
  /** Homebrew night positions (the old numeric system), used when a script has no night order. */
  firstNight?: number;
  otherNight?: number;
}

export interface Script {
  id: string;
  name: string;
  author?: string;
  logo?: string;
  roles: string[];
  custom?: Role[];
  firstNight?: string[];
  otherNight?: string[];
}

export const TEAMS: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled', 'loric'];
export const CORE_TEAMS: Team[] = ['townsfolk', 'outsider', 'minion', 'demon'];

export const TEAM_LABEL: Record<Team, string> = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsiders',
  minion: 'Minions',
  demon: 'Demons',
  traveller: 'Travellers',
  fabled: 'Fabled',
  loric: 'Loric',
};
export const TEAM_SINGULAR: Record<Team, string> = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsider',
  minion: 'Minion',
  demon: 'Demon',
  traveller: 'Traveller',
  fabled: 'Fabled',
  loric: 'Loric',
};

const BASE = import.meta.env.BASE_URL;
const icons = iconsJson as Record<string, { edition: string; variants: string[] }>;
const official = new Map<string, Role>((rolesJson as Role[]).map((r) => [r.id, r]));
const registry = new Map<string, Role>(official);

export const ALL_ROLES: Role[] = rolesJson as Role[];

/** Script ids come in a few spellings ("scarlet_woman", "Scarlet Woman"); this matches the data files. */
export function normaliseId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getRole(id: string | null | undefined): Role | undefined {
  if (!id) return undefined;
  return registry.get(id);
}

export function setCustomRoles(roles: Role[] | undefined) {
  for (const [id, r] of registry) if (r.custom) registry.delete(id);
  for (const r of roles ?? []) registry.set(r.id, { ...r, custom: true });
}

export function defaultAlignment(team: Team | undefined): Alignment | null {
  if (team === 'townsfolk' || team === 'outsider') return 'good';
  if (team === 'minion' || team === 'demon') return 'evil';
  return null;
}

export function genericIcon(name: string): string {
  const entry = icons[`_${name}`];
  return entry ? `${BASE}assets/characters/generic/${name}.webp` : `${BASE}assets/characters/generic/custom.webp`;
}

export function iconUrl(role: Role | undefined, alignment?: Alignment | null): string {
  if (!role) return genericIcon('custom');
  if (role.image) return role.image;
  const entry = icons[role.id];
  if (!entry) return genericIcon(role.team);
  const v = entry.variants;
  const natural = defaultAlignment(role.team);
  const want = alignment ? alignment[0] : natural ? natural[0] : '';
  const pick = v.includes(want) ? want : v.includes('') ? '' : v.includes('g') ? 'g' : v[0];
  return `${BASE}assets/characters/${entry.edition}/${role.id}${pick ? `_${pick}` : ''}.webp`;
}

export function editionLogo(id: string): string {
  return `${BASE}assets/editions/${['tb', 'bmr', 'snv'].includes(id) ? id : 'custom'}.webp`;
}

export interface Edition {
  id: string;
  name: string;
  blurb: string;
}

export const EDITIONS: Edition[] = [
  { id: 'tb', name: 'Trouble Brewing', blurb: 'The place to start. Clear information, a single Demon, and plenty of bluffing.' },
  { id: 'bmr', name: 'Bad Moon Rising', blurb: 'Death comes thick and fast. Protection, resurrection and Demons that kill many.' },
  { id: 'snv', name: 'Sects & Violets', blurb: 'Madness, misinformation and characters that change. For experienced towns.' },
];

export function editionScript(id: string): Script {
  const ed = EDITIONS.find((e) => e.id === id)!;
  const roles = ALL_ROLES.filter((r) => r.edition === id && ['townsfolk', 'outsider', 'minion', 'demon'].includes(r.team)).map((r) => r.id);
  return { id, name: ed.name, author: 'The Pandemonium Institute', roles };
}

export function rolesByTeam(ids: string[]): Record<Team, Role[]> {
  const out = Object.fromEntries(TEAMS.map((t) => [t, [] as Role[]])) as unknown as Record<Team, Role[]>;
  for (const id of ids) {
    const r = getRole(id);
    if (r) out[r.team].push(r);
  }
  return out;
}

export function rolesOfTeam(team: Team): Role[] {
  return ALL_ROLES.filter((r) => r.team === team);
}

/** Parse a script exported from the official script tool (or a homebrew script). */
export function parseScript(text: string): Script {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That isn’t valid JSON. Paste the whole script file, starting with [ and ending with ].');
  }
  if (!Array.isArray(data)) throw new Error('A script should be a list of characters, starting with [.');
  let name = 'Custom script';
  let author: string | undefined;
  let logo: string | undefined;
  let firstNight: string[] | undefined;
  let otherNight: string[] | undefined;
  const roles: string[] = [];
  const custom: Role[] = [];
  for (const entry of data) {
    if (typeof entry === 'string') {
      const id = normaliseId(entry);
      if (official.has(id)) roles.push(id);
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const rawId = String(e.id ?? '');
    if (rawId === '_meta') {
      if (typeof e.name === 'string') name = e.name;
      if (typeof e.author === 'string') author = e.author;
      if (typeof e.logo === 'string') logo = e.logo;
      if (Array.isArray(e.firstNight)) firstNight = e.firstNight.map((x) => normaliseId(String(x)));
      if (Array.isArray(e.otherNight)) otherNight = e.otherNight.map((x) => normaliseId(String(x)));
      continue;
    }
    const id = normaliseId(rawId);
    if (!id) continue;
    if (official.has(id) && !e.ability) {
      roles.push(id);
      continue;
    }
    if (typeof e.team === 'string' && typeof e.name === 'string') {
      const team = (e.team === 'traveler' ? 'traveller' : e.team) as Team;
      if (!TEAMS.includes(team)) continue;
      const image = Array.isArray(e.image) ? String(e.image[0] ?? '') : typeof e.image === 'string' ? e.image : undefined;
      custom.push({
        id,
        name: e.name,
        team,
        edition: 'custom',
        ability: String(e.ability ?? ''),
        firstNightReminder: typeof e.firstNightReminder === 'string' ? e.firstNightReminder : undefined,
        otherNightReminder: typeof e.otherNightReminder === 'string' ? e.otherNightReminder : undefined,
        reminders: Array.isArray(e.reminders) ? e.reminders.map(String) : [],
        remindersGlobal: Array.isArray(e.remindersGlobal) ? e.remindersGlobal.map(String) : undefined,
        setup: Boolean(e.setup),
        flavor: typeof e.flavor === 'string' ? e.flavor : undefined,
        image: image || undefined,
        firstNight: Number(e.firstNight) || 0,
        otherNight: Number(e.otherNight) || 0,
        custom: true,
      });
      roles.push(id);
    }
  }
  if (!roles.length) throw new Error('No characters found in that script.');
  const sig = roles.join(',');
  let h = 0;
  for (let i = 0; i < sig.length; i++) h = (h * 31 + sig.charCodeAt(i)) | 0;
  return {
    id: `custom-${(h >>> 0).toString(36)}`,
    name,
    author,
    logo,
    roles: [...new Set(roles)],
    custom: custom.length ? custom : undefined,
    firstNight,
    otherNight,
  };
}

// ---------------------------------------------------------------- night order

export const NIGHT_SPECIALS: Record<string, { name: string; first: string; other: string; icon: string }> = {
  dusk: {
    name: 'Dusk',
    first: 'Check that all eyes are closed. Some Travellers & Fabled act.',
    other: 'Check that all eyes are closed. Some Travellers & Fabled act.',
    icon: 'dusk',
  },
  eviltogether: {
    name: 'Evil team, together',
    first:
      'Wake the Demon and all Minions at once, so they all see who the Demon and the Minions are. Only the Demon also sees the three bluffs. Use this instead of Minion info and Demon info.',
    other: '',
    icon: 'evil',
  },
  minioninfo: {
    name: 'Minion info',
    first:
      'If there are 7 or more players, wake all Minions: Show the *THIS IS THE DEMON* token. Point to the Demon. Show the *THESE ARE YOUR MINIONS* token. Point to the other Minions.',
    other: '',
    icon: 'minion',
  },
  demoninfo: {
    name: 'Demon info',
    first:
      'If there are 7 or more players, wake the Demon: Show the *THESE ARE YOUR MINIONS* token. Point to all Minions. Show the *THESE CHARACTERS ARE NOT IN PLAY* token. Show 3 not-in-play good character tokens.',
    other: '',
    icon: 'demon',
  },
  dawn: {
    name: 'Dawn',
    first: 'Wait a few seconds. Call for eyes open.',
    other: 'Wait a few seconds. Call for eyes open & immediately say who died.',
    icon: 'dawn',
  },
};

const sheet = nightsheetJson as { firstNight: string[]; otherNight: string[] };

export function nightOrderList(kind: 'first' | 'other', script: Script): string[] {
  const fromScript = kind === 'first' ? script.firstNight : script.otherNight;
  if (fromScript?.length) {
    const list = [...fromScript];
    if (!list.includes('dusk')) list.unshift('dusk');
    if (!list.includes('dawn')) list.push('dawn');
    return list;
  }
  const list = [...(kind === 'first' ? sheet.firstNight : sheet.otherNight)];
  // Homebrew characters without a script night order slot in by their old numeric position, before dawn.
  const extra = (script.custom ?? [])
    .filter((r) => (kind === 'first' ? r.firstNight : r.otherNight) && !list.includes(r.id))
    .sort((a, b) => (kind === 'first' ? a.firstNight! - b.firstNight! : a.otherNight! - b.otherNight!));
  if (extra.length) list.splice(list.indexOf('dawn'), 0, ...extra.map((r) => r.id));
  return list;
}

export function nightReminder(id: string, kind: 'first' | 'other'): string {
  const special = NIGHT_SPECIALS[id];
  if (special) return kind === 'first' ? special.first : special.other;
  const r = getRole(id);
  return (kind === 'first' ? r?.firstNightReminder : r?.otherNightReminder) ?? '';
}

// ---------------------------------------------------------------- setup

/** Townsfolk, Outsiders, Minions, Demons for each player count. */
const COUNTS: Record<number, [number, number, number, number]> = {
  5: [3, 0, 1, 1],
  6: [3, 1, 1, 1],
  7: [5, 0, 1, 1],
  8: [5, 1, 1, 1],
  9: [5, 2, 1, 1],
  10: [7, 0, 2, 1],
  11: [7, 1, 2, 1],
  12: [7, 2, 2, 1],
  13: [9, 0, 3, 1],
  14: [9, 1, 3, 1],
  15: [9, 2, 3, 1],
};

export interface Composition {
  townsfolk: number;
  outsider: number;
  minion: number;
  demon: number;
}

export function composition(players: number): Composition | null {
  if (players < 5) return null;
  const [townsfolk, outsider, minion, demon] = COUNTS[Math.min(players, 15)];
  return { townsfolk, outsider, minion, demon };
}

export function setupNote(role: Role): string | null {
  if (!role.setup) return null;
  const m = role.ability.match(/\[([^\]]+)\]\s*$/);
  return m ? m[1] : null;
}

/** Applies setup brackets that are unambiguous, like the Baron's [+2 Outsiders]. */
export function adjustedComposition(base: Composition, roleIds: string[]): Composition {
  const out = { ...base };
  for (const id of new Set(roleIds)) {
    const role = getRole(id);
    if (!role) continue;
    const note = setupNote(role);
    if (!note) continue;
    const m = note.match(/^([+\-−–])(\d+) (Outsiders?|Minions?|Townsfolk)$/i);
    if (!m) continue;
    const delta = (m[1] === '+' ? 1 : -1) * Number(m[2]);
    const team = m[3].toLowerCase().startsWith('outsider') ? 'outsider' : m[3].toLowerCase().startsWith('minion') ? 'minion' : 'townsfolk';
    out[team] += delta;
    if (team !== 'townsfolk') out.townsfolk -= delta;
  }
  return out;
}

export function canDuplicate(role: Role | undefined): boolean {
  return Boolean(role?.special?.includes('selection:bag-duplicate'));
}

// ---------------------------------------------------------------- jinxes

const jinxMap = new Map<string, { id: string; reason: string }[]>();
for (const entry of jinxesJson as { id: string; jinx: { id: string; reason: string }[] }[]) {
  for (const j of entry.jinx) {
    const a = normaliseId(entry.id);
    const b = normaliseId(j.id);
    if (!jinxMap.has(a)) jinxMap.set(a, []);
    jinxMap.get(a)!.push({ id: b, reason: j.reason });
  }
}

export function jinxesFor(ids: string[]): { a: string; b: string; reason: string }[] {
  const set = new Set(ids);
  const out: { a: string; b: string; reason: string }[] = [];
  for (const id of ids) {
    for (const j of jinxMap.get(id) ?? []) if (set.has(j.id)) out.push({ a: id, b: j.id, reason: j.reason });
  }
  return out;
}
