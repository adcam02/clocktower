// Copies the official toolmaker resources (github.com/ThePandemoniumInstitute/botc-release)
// into the app. Usage: node tools/build-data.mjs /path/to/botc-release
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src || !fs.existsSync(path.join(src, 'resources/data/roles.json'))) {
  console.error('Pass the path to a botc-release checkout');
  process.exit(1);
}
const res = path.join(src, 'resources');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dataOut = path.join(root, 'src/data');
const pubOut = path.join(root, 'public/assets');
fs.mkdirSync(dataOut, { recursive: true });
fs.rmSync(path.join(pubOut, 'characters'), { recursive: true, force: true });
fs.mkdirSync(path.join(pubOut, 'characters'), { recursive: true });
fs.mkdirSync(path.join(pubOut, 'editions'), { recursive: true });

const roles = JSON.parse(fs.readFileSync(path.join(res, 'data/roles.json'), 'utf8'));
const icons = {};
for (const edition of fs.readdirSync(path.join(res, 'characters'))) {
  const dir = path.join(res, 'characters', edition);
  fs.mkdirSync(path.join(pubOut, 'characters', edition), { recursive: true });
  for (const file of fs.readdirSync(dir)) {
    const m = file.match(/^([a-z0-9]+?)(?:_(g|e))?\.webp$/);
    if (!m) continue;
    fs.copyFileSync(path.join(dir, file), path.join(pubOut, 'characters', edition, file));
    const [, id, variant = ''] = m;
    const key = edition === 'generic' ? `_${id}` : id;
    icons[key] ??= { edition, variants: [] };
    icons[key].variants.push(variant);
  }
}
for (const ed of fs.readdirSync(path.join(res, 'editions'))) {
  fs.copyFileSync(path.join(res, 'editions', ed, 'logo.webp'), path.join(pubOut, 'editions', `${ed}.webp`));
}
fs.copyFileSync(path.join(res, 'community/ccc-parchment.png'), path.join(pubOut, 'ccc.png'));

const keep = ['id', 'name', 'team', 'edition', 'ability', 'firstNightReminder', 'otherNightReminder', 'reminders', 'remindersGlobal', 'setup', 'special', 'flavor'];
const slim = roles.map((r) => {
  const o = {};
  for (const k of keep) if (r[k] !== undefined && r[k] !== '' && !(Array.isArray(r[k]) && r[k].length === 0)) o[k] = r[k];
  if (o.special) o.special = o.special.map((s) => `${s.type}:${s.name}`);
  return o;
});
const missing = slim.filter((r) => !icons[r.id]).map((r) => r.id);
if (missing.length) console.warn('No icon for', missing.join(', '));

fs.writeFileSync(path.join(dataOut, 'roles.json'), JSON.stringify(slim));
fs.writeFileSync(path.join(dataOut, 'icons.json'), JSON.stringify(icons));
fs.copyFileSync(path.join(res, 'data/nightsheet.json'), path.join(dataOut, 'nightsheet.json'));
fs.copyFileSync(path.join(res, 'data/jinxes.json'), path.join(dataOut, 'jinxes.json'));
console.log(`${slim.length} roles, ${Object.keys(icons).length} icons`);
