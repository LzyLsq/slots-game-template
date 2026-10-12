import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'assets/scripts/ui/GoldenEncoreApp.ts'), 'utf8');
const loadingPlan = readFileSync(resolve(root, 'assets/scripts/ui/ArtLoadingPlan.ts'), 'utf8');
const themes = readFileSync(resolve(root, 'assets/scripts/ui/ThemeArt.ts'), 'utf8');
const sequence = readFileSync(resolve(root, 'assets/scripts/ui/KeeperSequence.ts'), 'utf8');
const cast = readFileSync(resolve(root, 'assets/scripts/ui/CastArt.ts'), 'utf8');
const hallKeeper = readFileSync(resolve(root, 'assets/scripts/ui/HallKeeperArt.ts'), 'utf8');
const math = readFileSync(resolve(root, 'assets/scripts/domain/VaultMath.ts'), 'utf8');
const strings = text => [...text.matchAll(/'([a-z][a-z0-9-]+)'/g)].map(match => match[1]);
const section = (text, start, end) => {
  const a = text.indexOf(start);
  assert.ok(a >= 0, `Missing art manifest section ${start}`);
  const b = text.indexOf(end, a + start.length);
  assert.ok(b > a, `Unterminated art manifest section ${start}`);
  return text.slice(a, b);
};
const preload = strings(section(source, 'private allArt(): string[]', 'private async boot()'))
  .concat(strings(section(source, 'const openingArt = [', '];')));
const blink = readFileSync(resolve(root, 'assets/scripts/ui/BlinkArt.ts'), 'utf8');
const referenced = new Set([
  ...[...blink.matchAll(/"art":\s*"([^"]+)"/g)].map(m => m[1]),
  ...preload,
  ...strings(section(cast, 'export const CABINET_CAST_ART =', 'export const CAST_ATLAS')),
  ...strings(section(hallKeeper, 'export const HALL_KEEPER_ART =', 'export const HALL_KEEPER_ATLAS')),
  ...strings(section(sequence, 'export const MASCOT_ART =', 'export const MASCOT_ATLAS')),
  ...strings(section(themes, 'export const REEL_ART =', 'export const PRIMARY_SYMBOL')),
  ...[...themes.matchAll(/art:\s*'([^']+)'/g)].map(m => m[1]),
  ...strings(section(themes, 'export const PRIZE_TITLES =', 'export function reelArt')),
  ...strings(section(source, 'const PAGE_TITLE_ART:', 'const MODE_TITLE_ART:')),
  ...strings(section(loadingPlan, 'export const GAME_BACKDROPS =', 'const ROOMS =')),
  ...strings(section(source, 'const MODE_TITLE_ART:', 'const KEY =')),
  ...strings(section(math, 'export const SYMBOLS:', 'export const STAKES =')),
  ...[...source.matchAll(/\bart:\s*'([^']+)'/g)].map(m => m[1]),
]);
for (const mode of [0, 1, 2, 3]) {
  referenced.add(`hud-inlay-${mode}`);
  for (const part of [0, 1, 2, 3]) referenced.add(`prize-ornament-${mode}-${part}`);
  for (const role of ['home', 'auto', 'rules']) referenced.add(`utility-${role}-${mode}`);
  for (const direction of ['plus', 'minus']) referenced.add(`bet-${direction}-${mode}`);
}
for (const name of referenced) {
  assert.ok(existsSync(resolve(root, 'assets/resources/art', `${name}.png`)), `Missing generated art: ${name}.png`);
}
for (const name of strings(section(sequence, 'export const MASCOT_ART =', 'export const MASCOT_ATLAS'))) {
  const png = readFileSync(resolve(root, 'assets/resources/art', `${name}.png`));
  assert.equal(png.readUInt32BE(16), 2048, `${name}: 8 full-width cells`);
  assert.equal(png.readUInt32BE(20), 2560, `${name}: 8 full-height cells`);
  assert.equal(png[25], 6, `${name}: true RGBA, no matte background`);
}
const hallDimensions = Object.fromEntries([...section(hallKeeper, 'export const HALL_KEEPER_ATLAS =', 'export const HALL_KEEPER_PATCHES').matchAll(/(columns|rows|width|height|gutter):\s*(\d+)/g)].map(m => [m[1], Number(m[2])]));
for (const name of strings(section(hallKeeper, 'export const HALL_KEEPER_ART =', 'export const HALL_KEEPER_ATLAS'))) {
  const png = readFileSync(resolve(root, 'assets/resources/art', `${name}.png`));
  assert.equal(png.readUInt32BE(16), hallDimensions.columns * (hallDimensions.width + hallDimensions.gutter * 2), `${name}: source-space width and sample gutters`);
  assert.equal(png.readUInt32BE(20), hallDimensions.rows * (hallDimensions.height + hallDimensions.gutter * 2), `${name}: source-space height and sample gutters`);
  assert.equal(png[25], 6, `${name}: RGBA source patches`);
}
console.log(`PASS ${referenced.size} explicitly named generated-art assets exist`);

const provenance = JSON.parse(readFileSync(resolve(root, 'docs/ART_PROVENANCE.json'), 'utf8'));
const palaceArt = ['fx-prize-firework', 'fx-prize-aureole', 'fx-prize-jet', 'fx-prize-streamer', 'prize-ingot', 'prize-jewel-0', 'prize-jewel-1', 'prize-jewel-2', 'prize-jewel-3'];
for(const room of [0,1,2,3])for(const part of [0,1,2,3])palaceArt.push(`prize-ornament-${room}-${part}`);
for(const name of palaceArt){
  const png=readFileSync(resolve(root,'assets/resources/art',`${name}.png`));
  const entry=provenance.assets.find(a=>a.asset===`${name}.png`);
  assert.ok(entry?.source && entry?.source_sha256 && entry?.response_id, `${name}: generated source/crop provenance`);
  assert.equal(entry.sha256,createHash('sha256').update(png).digest('hex'), `${name}: current production image hash`);
  assert.equal(entry.source_sha256,createHash('sha256').update(readFileSync(resolve(root,entry.source))).digest('hex'), `${name}: retained original generated source hash`);
  assert.ok(existsSync(resolve(root,'assets/resources/art',`${name}.png.meta`)), `${name}: imported texture UUID`);
  assert.equal(png[25],6, `${name}: real RGBA source`);
}
console.log(`PASS ${palaceArt.length} palace/light PNGs with source provenance, real alpha, metadata and exact current hashes`);
