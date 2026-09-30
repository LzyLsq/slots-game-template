/** Original, scene-specific scores. Build-time tool; no runtime MIDI synthesizer. */
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

type Instrument = { name: string; program: number; volume: number; pan: number; percussion: boolean };
type Note = { instrument: number; note: number; time: number; duration: number; velocity: number };
type Score = { id: string; title: string; description: string; bpm: number; loop: boolean; duration: number; instruments: Instrument[]; notes: Note[] };
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'build-templates/web-mobile/audio');
const temporary = mkdtempSync(join(tmpdir(), 'f20-composed-music.'));
mkdirSync(output, { recursive: true });
let seed = 0x20ca90;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
function instrument(name: string, program: number, volume: number, pan = 0, percussion = false): Instrument {
  return { name, program, volume, pan, percussion };
}
function score(id: string, title: string, description: string, bpm: number, beats: number, loop: boolean, instruments: Instrument[]): Score {
  return { id, title, description, bpm, duration: beats * 60 / bpm, loop, instruments, notes: [] };
}
function note(s: Score, instrument: number, pitch: number, beat: number, length: number, velocity = 75, human = true) {
  if (!pitch) return;
  const jitter = human ? (random() - .5) * .012 : 0;
  s.notes.push({ instrument, note: pitch, time: Math.max(0, beat * 60 / s.bpm + jitter),
    duration: length * 60 / s.bpm, velocity: Math.max(1, Math.min(127, Math.round(velocity + (human ? (random() - .5) * 8 : 0)))) });
}
function chord(s: Score, instrument: number, pitches: number[], beat: number, length: number, velocity = 60, strum = .024) {
  pitches.forEach((p, i) => note(s, instrument, p, beat + i * strum, length, velocity));
}
function phrase(s: Score, instrument: number, bar: number, entries: number[][], velocity = 78) {
  entries.forEach(([offset, pitch, length], i) => note(s, instrument, pitch, bar * 4 + offset, length, velocity + (i === 0 ? 3 : -2)));
}

// A festive 16-bar welcome: call/answer phrases, a dancing rhythm section,
// and four-bar fills. Leave room for UI sounds instead of just raising gain.
const home = score('music-home', '金叶嘉年华', 'Festive woodland welcome: marimba/flute call-and-response, bright piano, guitar offbeats, hand percussion and short muted-brass answers; four contrasting phrases.', 116, 64, true, [
  instrument('Marimba', 12, .7, -.13), instrument('Nylon guitar', 24, .5, .3),
  instrument('Pizzicato strings', 45, .32, -.35), instrument('Flute', 73, .5, .16),
  instrument('Acoustic bass', 32, .7), instrument('Warm strings', 48, .15, .08),
  instrument('Festive hand percussion', 0, .5, -.08, true),
  instrument('Bright piano', 1, .32, -.22), instrument('Muted trumpet answers', 59, .29, .22),
  instrument('Glockenspiel accents', 9, .17, .1),
]);
const homeHarmony = [
  [48, 60, 64, 67, 69], [48, 60, 64, 67, 69], [41, 57, 60, 64, 65], [41, 57, 60, 64, 65],
  [45, 57, 60, 64, 67], [38, 57, 60, 62, 65], [43, 55, 59, 62, 65], [43, 55, 59, 62, 65],
  [48, 60, 64, 67, 69], [40, 55, 59, 62, 64], [41, 57, 60, 62, 65], [41, 57, 60, 62, 65],
  [38, 57, 60, 62, 65], [43, 55, 59, 62, 65], [48, 60, 64, 67, 69], [43, 55, 59, 62, 65],
];
const homeMelody = [
  [[0, 76, .8], [1, 79, .4], [1.5, 81, .4], [2, 79, 1.45]],
  [[.5, 76, .45], [1, 74, .45], [1.5, 72, .8], [3, 76, .75]],
  [[0, 77, .85], [1, 81, .45], [1.5, 84, .9], [3, 81, .75]],
  [[0, 79, .85], [1, 77, .85], [2.5, 76, .45], [3, 72, .75]],
  [[0, 76, .85], [1, 79, .4], [1.5, 81, 1.2], [3, 79, .75]],
  [[0, 77, .85], [1.5, 76, .4], [2, 74, 1.25]],
  [[0, 74, .4], [ .5, 79, .8], [1.5, 77, .4], [2, 76, .4], [2.5, 74, .9]],
  [[0, 71, .85], [1.5, 74, .45], [2, 79, 1.05]],
  [[0, 84, .85], [1, 81, .45], [1.5, 79, 1.3], [3, 76, .7]],
  [[0, 79, .8], [1.5, 83, .45], [2, 81, .45], [2.5, 79, .9]],
  [[0, 81, .85], [1, 84, .45], [1.5, 86, .85], [3, 84, .7]],
  [[0, 81, .85], [1.5, 79, .45], [2, 77, 1.4]],
  [[0, 77, .85], [1, 81, .45], [1.5, 79, .85], [3, 77, .7]],
  [[0, 79, .8], [1.5, 77, .4], [2, 76, .4], [2.5, 74, 1]],
  [[0, 76, .8], [1, 79, .4], [1.5, 84, 1.6]],
  [[0, 79, .85], [1, 74, .8], [2.5, 71, .75]],
];
homeHarmony.forEach(([bass, ...voicing], bar) => {
  const b = bar * 4;
  const energy = [.9, 1, .84, 1.04][Math.floor(bar / 4)];
  phrase(home, bar < 8 ? 0 : 3, bar, homeMelody[bar], bar < 8 ? 79 : 71);
  if (bar >= 8) phrase(home, 0, bar, [[.5, voicing[2] + 12, .28], [2.5, voicing[1] + 12, .32]], 55);
  else if (bar % 2 === 1) phrase(home, 3, bar, [[2, voicing[2] + 12, .35], [2.5, voicing[1] + 12, .3], [3.5, voicing[0] + 12, .3]], 66);
  for (const offset of [0, 1.5, 2, 3.5]) chord(home, 1, voicing, b + offset, .42, 62 * energy, .014);
  chord(home, 5, voicing.map(n => n - 12), b, 3.6, 48, .008);
  [0, 1.5, 2.5, 3.5].forEach((offset, i) => note(home, 2, voicing[i] + (i === 1 ? 12 : 0), b + offset, .24, 60 * energy));
  [bass, bass + 7, bass + 12, bass + 7].forEach((pitch, i) => note(home, 4, pitch, b + i, i % 2 ? .5 : .7, i % 2 ? 71 : 82));
  for (const offset of [.5, 2.5]) chord(home, 7, voicing, b + offset, .3, 58 * energy, .01);
  if (bar % 2 === 1) {
    chord(home, 8, [voicing[0], voicing[2]], b + 1, .24, 67 * energy, .004);
    chord(home, 8, [voicing[1], voicing[3]], b + 3, .3, 72 * energy, .004);
  }
  if (bar % 4 === 0) [0, .5, 1].forEach((offset, i) => note(home, 9, voicing[i] + 24, b + offset, .38, 53));
  for (const offset of [0, 2]) note(home, 6, 36, b + offset, .11, (offset ? 68 : 76) * energy);
  for (const offset of [1, 3]) {
    note(home, 6, 37, b + offset, .08, 63 * energy);
    note(home, 6, 54, b + offset, .06, 52 * energy);
  }
  for (let i = 0; i < 8; i++) note(home, 6, 69, b + i * .5, .05, (i % 2 ? 55 : 40) * energy);
  for (const [i, offset] of [.75, 1.5, 2.75, 3.5].entries()) note(home, 6, i % 2 ? 61 : 60, b + offset, .08, 56 * energy);
  // A brief answer at the end of each four-bar phrase, not constant cymbal noise.
  if (bar % 4 === 3) {
    [50, 48, 47, 45].forEach((pitch, i) => note(home, 6, pitch, b + 3 + i * .25, .09, 57 + i * 3));
    note(home, 6, 55, b + 3.75, .1, 43);
  }
});

// Different tune, harmony and orchestration, not the lobby tune played faster.
const cabinet = score('music-cabinet', '金橡果巡游', 'Lively treasure-parade swing: clarinet/vibraphone lead, piano and guitar syncopation, walking bass, brass replies, tambourine/claps and four-bar drum turnarounds; a quieter middle phrase.', 124, 64, true, [
  instrument('Vibraphone', 11, .6, -.14), instrument('Clarinet', 71, .55, .18),
  instrument('Pizzicato strings', 45, .33, -.32), instrument('Nylon guitar', 24, .44, .34),
  instrument('Acoustic bass', 32, .7), instrument('Swing piano', 0, .4, .08),
  instrument('Parade percussion', 0, .52, -.06, true),
  instrument('Muted trumpet replies', 59, .34, .22), instrument('Trombone offbeats', 57, .23, -.22),
  instrument('Celesta turnaround', 8, .2, .1),
]);
const cabinetHarmony = [
  [41, 57, 60, 62, 65], [46, 58, 62, 65, 67], [41, 57, 60, 62, 65], [38, 57, 60, 62, 65],
  [43, 58, 62, 65, 67], [36, 58, 62, 64, 67], [45, 57, 60, 64, 67], [38, 54, 60, 62, 69],
  [43, 58, 62, 65, 67], [36, 58, 60, 64, 67], [41, 57, 60, 62, 65], [45, 57, 60, 64, 67],
  [46, 58, 62, 65, 67], [43, 58, 62, 65, 67], [36, 58, 60, 64, 67], [41, 57, 60, 62, 65],
];
const cabinetMelody = [
  [[0, 77, .35], [.65, 81, .3], [1, 84, .7], [2, 86, .35], [2.65, 84, .3], [3, 81, .65]],
  [[0, 82, .7], [1, 79, .35], [1.65, 77, .3], [2.5, 74, .8]],
  [[.5, 77, .45], [1, 81, .4], [1.65, 84, .3], [2.5, 81, .4], [3, 79, .65]],
  [[0, 77, .35], [.65, 74, .3], [1, 72, .75], [2.5, 74, .7]],
  [[0, 79, .7], [1, 82, .35], [1.65, 86, .3], [2, 84, .35], [2.65, 82, .3], [3, 79, .65]],
  [[0, 76, .7], [1.5, 79, .4], [2, 82, .7], [3, 79, .65]],
  [[0, 81, .4], [.65, 79, .3], [1, 76, .7], [2, 72, .35], [2.65, 76, .3], [3, 79, .65]],
  [[0, 78, .65], [1.5, 81, .35], [2, 84, .7]],
  [[0, 82, .7], [1, 86, .35], [1.65, 89, .3], [2.5, 86, .8]],
  [[0, 88, .35], [.65, 86, .3], [1, 84, .7], [2.5, 82, .85]],
  [[0, 81, .35], [.65, 84, .3], [1, 86, .7], [2, 84, .35], [2.65, 81, .3], [3, 77, .65]],
  [[0, 79, .7], [1.5, 76, .35], [2, 72, 1.1]],
  [[0, 74, .35], [.65, 77, .3], [1, 82, .7], [2, 81, .35], [2.65, 79, .3], [3, 77, .65]],
  [[0, 79, .7], [1, 77, .35], [1.65, 74, .3], [2.5, 70, .85]],
  [[0, 72, .35], [.65, 76, .3], [1, 79, .65], [2, 82, .4], [2.65, 79, .3], [3, 76, .65]],
  [[0, 77, .85], [1.5, 81, .4], [2, 84, 1.05]],
];
cabinetHarmony.forEach(([bass, ...voicing], bar) => {
  const b = bar * 4;
  const energy = [.92, 1.05, .78, 1.08][Math.floor(bar / 4)];
  const lead = Math.floor(bar / 4) % 2 ? 1 : 0;
  phrase(cabinet, lead, bar, cabinetMelody[bar], lead ? 82 : 79);
  for (const offset of [.65, 1.65, 2.65, 3.65]) chord(cabinet, 3, voicing, b + offset, .28, 61 * energy, .012);
  chord(cabinet, 5, voicing, b, .5, 62 * energy, .01);
  chord(cabinet, 5, voicing, b + 2, .5, 56 * energy, .01);
  for (const [i, offset] of [0, 1.65, 2.5, 3.65].entries()) note(cabinet, 2, voicing[i] + 12, b + offset, .25, 56 * energy);
  [bass, bass + 7, bass + 12, bass + 7].forEach((n, i) => note(cabinet, 4, n, b + i, .72, i % 2 ? 62 : 75));
  // Brass answers occupy phrase endings and offbeats, not a competing loud melody.
  if (bar % 2 === 1 && bar !== 9) {
    phrase(cabinet, 7, bar, [[2.65, voicing[2] + 12, .22], [3, voicing[1] + 12, .3], [3.65, voicing[0] + 12, .22]], 71 * energy);
    for (const offset of [1, 3]) chord(cabinet, 8, [voicing[0] - 12, voicing[2] - 12], b + offset, .22, 65 * energy, .004);
  }
  for (const offset of [0, 2, ...(bar % 2 ? [2.65] : [])]) note(cabinet, 6, 36, b + offset, .1, (offset === 0 ? 78 : 65) * energy);
  for (const offset of [1, 3]) {
    note(cabinet, 6, 38, b + offset, .09, 60 * energy);
    note(cabinet, 6, 54, b + offset, .06, 53 * energy);
    if (bar >= 12) note(cabinet, 6, 39, b + offset, .08, 44);
  }
  for (let i = 0; i < 8; i++) note(cabinet, 6, 42, b + Math.floor(i / 2) + (i % 2 ? .65 : 0), .05, (i % 2 ? 57 : 39) * energy);
  for (const [i, offset] of [.65, 1.5, 2.65, 3.5].entries()) note(cabinet, 6, i % 2 ? 64 : 63, b + offset, .07, 51 * energy);
  if (bar % 4 === 3) {
    [38, 50, 47, 38].forEach((pitch, i) => note(cabinet, 6, pitch, b + 3 + i * .25, .08, 53 + i * 5));
    [voicing[0], voicing[1], voicing[2]].forEach((pitch, i) => note(cabinet, 9, pitch + 24, b + 3 + i / 3, .3, 58));
    note(cabinet, 6, 55, b + 3.75, .1, 42);
  }
});

const small = score('win-small', '一袋小金币', 'Brief marimba and harp smile; a small win, not a victory alarm.', 120, 3.1, false, [
  instrument('Marimba', 12, .78, -.1), instrument('Harp', 46, .42, .2), instrument('Pizzicato strings', 45, .3, -.2),
]);
[[0, 76, .35], [.4, 79, .35], [.85, 84, .8]].forEach(([b, p, l]) => note(small, 0, p, b, l, 85));
chord(small, 1, [60, 64, 67, 72], .85, 1.15, 72, .06);
note(small, 2, 48, 0, .25, 65); note(small, 2, 60, .85, .4, 69);

const big = score('win-big', '金币开箱', 'Rounded horn answer over a harp ascent; bright, compact treasure-opening phrase.', 120, 6.8, false, [
  instrument('French horn', 60, .66, -.12), instrument('Harp', 46, .52, .2),
  instrument('Strings', 48, .3, -.2), instrument('Timpani', 47, .52), instrument('Celesta', 8, .42, .13),
]);
phrase(big, 0, 0, [[0, 67, .65], [.75, 72, .6], [1.5, 76, .8], [2.5, 79, 1]], 92);
phrase(big, 0, 1, [[0, 76, 1.2]], 87);
[[0, [48, 60, 64, 67]], [1.5, [53, 60, 65, 69]], [3, [55, 62, 67, 71]], [4, [48, 60, 64, 67]]].forEach(([b, p]: any) => chord(big, 2, p, b, b === 4 ? 1.65 : 1.25, 68));
[60, 64, 67, 72, 76, 79].forEach((p, i) => note(big, 1, p, .15 + i * .27, .8, 82));
[0, 2.5, 4].forEach(b => note(big, 3, b === 2.5 ? 43 : 48, b, .6, 76));
chord(big, 4, [84, 88, 91], 4.05, 1.1, 69, .12);

const mega = score('win-mega', '金叶盛放', 'Piano/celesta sparkle answered by strings and warm brass; a separate two-part melody.', 132, 9.4, false, [
  instrument('Grand piano', 0, .6, -.2), instrument('Celesta', 8, .42, .25), instrument('Strings', 48, .38, -.1),
  instrument('French horn', 60, .56, .12), instrument('Timpani', 47, .56),
]);
phrase(mega, 0, 0, [[0, 72, .35], [.5, 76, .35], [1, 79, .7], [2, 77, .35], [2.5, 81, .35], [3, 84, .8]], 92);
phrase(mega, 3, 1, [[0, 83, .8], [1, 79, .6], [2, 84, 1.3]], 98);
[[0, [60, 64, 67, 72]], [2, [60, 65, 69, 72]], [4, [59, 62, 67, 71]], [6, [60, 64, 67, 72]]].forEach(([b, p]: any) => chord(mega, 2, p, b, 1.75, 77, .01));
[72, 76, 79, 84, 81, 84, 88, 91].forEach((p, i) => note(mega, 1, p, .2 + i * .5, .65, 72));
[0, 2, 4, 5.5, 6].forEach(b => note(mega, 4, b === 4 ? 43 : 48, b, .65, 75));
chord(mega, 0, [48, 60, 64, 67, 72], 6, 1.7, 93);
chord(mega, 1, [84, 88, 91], 6.1, 1.5, 76, .16);

const epic = score('win-epic', '丰收庆典', 'Dotted trumpet fanfare, answering horns and a timpani cadence; ceremonial rather than sped-up bells.', 126, 10.8, false, [
  instrument('Trumpet', 56, .56, -.16), instrument('French horn', 60, .57, .18), instrument('Strings', 48, .4, -.15),
  instrument('Harp', 46, .44, .28), instrument('Timpani', 47, .66), instrument('Cymbal', 0, .24, .05, true),
]);
phrase(epic, 0, 0, [[0, 67, .6], [.75, 67, .18], [1, 72, .8], [2, 76, .6], [2.75, 74, .18], [3, 72, .75]], 95);
phrase(epic, 0, 1, [[0, 77, .8], [1, 79, .8], [2, 84, 1.75]], 99);
phrase(epic, 1, 0, [[0, 60, 1.5], [2, 65, 1.5]], 91);
phrase(epic, 1, 1, [[0, 67, 1.5], [2, 72, 1.8]], 99);
[[0, [48, 60, 64, 67]], [2, [53, 60, 65, 69]], [4, [55, 62, 67, 71]], [6, [48, 60, 64, 67, 72]]].forEach(([b, p]: any) => chord(epic, 2, p, b, b === 6 ? 2.2 : 1.6, 82, .008));
[60, 64, 67, 72, 76, 79, 84, 88].forEach((p, i) => note(epic, 3, p, 4.4 + i * .2, 1, 78));
[0, 1.5, 2, 3.5, 4, 5.5, 5.75, 6].forEach(b => note(epic, 4, b < 4 ? 48 : b < 6 ? 43 : 48, b, .55, b === 6 ? 101 : 82));
note(epic, 5, 49, 6, 1.2, 66);

const superWin = score('win-super', '金冠大巡游', 'Full celebratory orchestration: a distinct brass call, rising string answer, harp flourish and a grand tonic finale.', 132, 12.3, false, [
  instrument('Brass ensemble', 61, .5, -.14), instrument('Trumpet', 56, .49, .13), instrument('Strings', 48, .48, -.2),
  instrument('Harp', 46, .52, .25), instrument('Glockenspiel', 9, .29, .13), instrument('Timpani', 47, .68),
  instrument('Celebration percussion', 0, .29, -.03, true),
]);
phrase(superWin, 0, 0, [[0, 60, .35], [.5, 67, .35], [1, 72, .8], [2, 69, .35], [2.5, 72, .35], [3, 77, .8]], 101);
phrase(superWin, 1, 1, [[0, 79, .35], [.5, 81, .35], [1, 83, .8], [2, 84, 2.1]], 104);
[[0, [48, 60, 64, 67]], [2, [53, 60, 65, 69]], [4, [55, 62, 67, 71]], [6, [48, 60, 64, 67, 72]]].forEach(([b, p]: any) => {
  chord(superWin, 2, p, b, b === 6 ? 2.6 : 1.75, 88, .006);
  note(superWin, 5, b === 4 ? 43 : b === 2 ? 41 : 48, b, .8, 99);
});
// A rising answering line, not the main melody doubled at a new speed.
[72, 74, 76, 77, 79, 81, 83, 84].forEach((p, i) => note(superWin, 2, p, 2 + i * .5, .46, 90));
[60, 64, 67, 72, 76, 79, 84, 88, 91].forEach((p, i) => note(superWin, 3, p, 4.15 + i * .2, 1.4, 85));
[84, 88, 91, 96].forEach((p, i) => note(superWin, 4, p, 6.1 + i * .22, 1.5, 77));
for (const b of [1, 3, 4.5, 5, 5.5, 5.75]) note(superWin, 6, 38, b, .12, 54);
note(superWin, 6, 49, 6, 2, 80);
chord(superWin, 0, [60, 64, 67, 72], 6, 2.4, 106, .006);

const scores = [home, cabinet, small, big, mega, epic, superWin];
// Rework BGM without regenerating any established award cue.
const backgroundOnly = process.argv.includes('--background-only');
const preserved = new Map<string, any>();
if (backgroundOnly) {
  const previous = JSON.parse(readFileSync(join(output, 'music-manifest.json'), 'utf8'));
  for (const s of scores.filter(s => !s.loop)) {
    const entry = previous.tracks.find((t: any) => t.id === s.id);
    if (!entry || createHash('sha256').update(readFileSync(join(output, entry.file))).digest('hex') !== entry.sha256) {
      throw new Error(`Cannot preserve ${s.id}: render all tracks once before --background-only`);
    }
    preserved.set(s.id, entry);
  }
}
const binary = join(temporary, 'render-music');
execFileSync('swiftc', [join(root, 'tools/render-music.swift'), '-o', binary], { stdio: 'inherit' });
const report: object[] = [];
for (const s of scores) {
  if (preserved.has(s.id)) { report.push(preserved.get(s.id)); continue; }
  s.notes.sort((a, b) => a.time - b.time);
  const scorePath = join(temporary, `${s.id}.json`), rawPath = join(temporary, `${s.id}.f32`), wavPath = join(temporary, `${s.id}.wav`);
  writeFileSync(scorePath, JSON.stringify(s));
  execFileSync(binary, [scorePath, rawPath], { stdio: 'inherit' });
  const raw = readFileSync(rawPath), frames = raw.length / 8;
  const samples = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  let mean = 0; for (const sample of samples) { if (!Number.isFinite(sample)) throw new Error('Invalid audio'); mean += sample; }
  mean /= samples.length;
  let rms = 0, peak = 0;
  for (const sample of samples) { const x = sample - mean; rms += x * x; peak = Math.max(peak, Math.abs(x)); }
  rms = Math.sqrt(rms / samples.length);
  if (rms < .0001) throw new Error(`${s.id}: silent rendering`);
  // Consistent loudness across scenes; leave substantial headroom for UI/coin sounds.
  const gain = Math.min((s.loop ? .105 : .16) / rms, .79 / peak);
  const wave = Buffer.alloc(44 + frames * 4);
  wave.write('RIFF', 0); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8); wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20); wave.writeUInt16LE(2, 22); wave.writeUInt32LE(44100, 24); wave.writeUInt32LE(176400, 28);
  wave.writeUInt16LE(4, 32); wave.writeUInt16LE(16, 34); wave.write('data', 36); wave.writeUInt32LE(frames * 4, 40);
  let renderedRms = 0, renderedPeak = 0;
  for (let i = 0; i < samples.length; i++) {
    const frame = Math.floor(i / 2), t = frame / 44100;
    // Loops retain the previous cycle's reverberation; a 4ms edge taper removes any sample-edge click.
    const fade = s.loop ? Math.min(1, t / .004, (frames - 1 - frame) / (44100 * .004))
      : Math.min(1, t / .006, (frames - 1 - frame) / (44100 * .34));
    const x = (samples[i] - mean) * gain * Math.max(0, fade);
    renderedRms += x * x; renderedPeak = Math.max(renderedPeak, Math.abs(x));
    wave.writeInt16LE(Math.round(x * 32767), 44 + i * 2);
  }
  writeFileSync(wavPath, wave);
  const file = `${s.id}.m4a`, target = join(output, file);
  execFileSync('/usr/bin/afconvert', [wavPath, target, '-f', 'm4af', '-d', 'aac', '-b', '96000', '-q', '127']);
  report.push({ id: s.id, title: s.title, description: s.description, file, duration: frames / 44100, loop: s.loop, bpm: s.bpm,
    instruments: s.instruments.map(i => i.name), notes: s.notes.length, scoreSha256: createHash('sha256').update(JSON.stringify(s)).digest('hex'),
    bytes: statSync(target).size, sha256: createHash('sha256').update(readFileSync(target)).digest('hex'),
    peak: renderedPeak, rms: Math.sqrt(renderedRms / samples.length) });
  console.log(`ENCODED ${file}: ${(statSync(target).size / 1024).toFixed(1)} KiB; peak ${renderedPeak.toFixed(3)}`);
}
writeFileSync(join(output, 'music-manifest.json'), JSON.stringify({ version: 1, format: 'AAC-LC, stereo, 44100Hz, 96kbps',
  creation: 'Original scores arranged in tools/compose-music.ts; offline rendered using the macOS instrument bank. No external recording is bundled.', tracks: report }, null, 2) + '\n');
console.log(`Music written to ${output}. Temporary render files retained at ${temporary}.`);
