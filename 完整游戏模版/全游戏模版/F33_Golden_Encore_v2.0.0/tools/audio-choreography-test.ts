import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CabinetWinMotion } from '../assets/scripts/ui/CabinetWinMotion';
import { COIN_INTERVAL_MS, REWARD_CHANNELS, REWARD_SOUNDS, RewardAudio, type RewardVoice } from '../assets/scripts/ui/RewardAudio';
import { readPcm } from './audio-pcm';

const manifest = JSON.parse(readFileSync('docs/audio-score-manifest.json', 'utf8'));
const app = readFileSync('assets/scripts/ui/GoldenEncoreApp.ts', 'utf8');
const scoreDelay = .26;
assert.match(app, /this\.winCue\(overlay, \.26, \(\) => this\.rewardAudio\.play\(tier, Date\.now\(\), mode\)\)/,
  'Asset-relative musical anchors must start on the actual cabinet reveal');
const rmsBetween = (samples: Float64Array, start: number, end: number, rate: number) => {
  let energy = 0;
  const a = Math.round(start * rate), b = Math.min(samples.length, Math.round(end * rate));
  for (let i = a; i < b; i++) energy += samples[i] ** 2;
  return Math.sqrt(energy / Math.max(1, b - a));
};
for (const mode of [0, 1, 2, 3]) for (const tier of ['big', 'super'] as const) {
  const motion = new CabinetWinMotion(tier, false, mode);
  const item = manifest.foley.find((row: any) => row.asset === `reward-${mode}-${tier}`);
  assert.ok(item, 'All four rooms retain separately arranged scores');
  const pcm = readPcm(readFileSync(`assets/resources/audio/${item.asset}.wav`));
  assert.equal(item.anchors.scoreDelay, scoreDelay);
  assert.ok(Math.abs(item.anchors.counting + scoreDelay - motion.counterDelay) < 1e-6);
  assert.ok(Math.abs(item.anchors.finale + scoreDelay - motion.finaleTime) < 1e-6);
  if (tier === 'super') assert.ok(Math.abs(item.anchors.encore + scoreDelay - motion.encoreTime) < 1e-6);
  else assert.equal(item.anchors.encore, null);
  assert.ok(pcm.duration + scoreDelay > motion.finaleTime + .9, 'Final amount has a complete musical release');
  assert.ok(pcm.duration + scoreDelay < motion.holdTime, 'No runaway score after quiet cabinet hold');
  assert.ok(item.noteEvents.some((note: any) => note.channel === 0 && Math.abs(note.at - item.anchors.finale) < .0001),
    'The lead resolves on the original cabinet finale, not in a short opening sting');
  for (let at = 1; at < item.anchors.finale; at += 1) {
    assert.ok(rmsBetween(pcm.samples[0], at, at + 1, 32000) > .008, `${item.asset}: counting remains musically supported at ${at}s`);
  }
  assert.ok(rmsBetween(pcm.samples[0], item.anchors.finale, item.anchors.finale + .5, 32000) > .025,
    'Final chord is present in delivered PCM, not just claimed in the manifest');
}
// Grandeur must come from actual written parts, harmonic travel and a second
// phrase, not from just faster playback, a bigger gain or a new description.
const openingSignatures = new Set<string>(), encoreSignatures = new Set<string>();
for (const mode of [0, 1, 2, 3]) {
  const big = manifest.foley.find((row: any) => row.asset === `reward-${mode}-big`);
  const superWin = manifest.foley.find((row: any) => row.asset === `reward-${mode}-super`);
  for (const item of [big, superWin]) {
    assert.equal(item.arrangementVersion, 'orchestral-awards-20261012');
    const roles = item.orchestration;
    for (const [role, instrument] of [['horn', 'French Horns'], ['strings', 'Strings'], ['harp', 'Harp'], ['bass', 'Contrabass'], ['timpani', 'Timpani']] as const) {
      assert.equal(item.instruments[roles[role]], instrument);
      const notes = item.noteEvents.filter((note: any) => note.channel === roles[role]);
      assert.ok(notes.length >= 8, `${item.asset}: ${role} is written throughout, not an unused preset`);
      assert.ok(notes.some((note: any) => note.at < 1.2));
      assert.ok(notes.some((note: any) => Math.abs(note.at - item.anchors.finale) < .10));
    }
    assert.ok(item.noteEvents.every((note: any) => note.channel < 16 && note.key >= 0 && note.key <= 127 && note.velocity > 0 && note.velocity < .81));
    assert.deepEqual(item.harmonicSections.slice(0, 3).map((section: any) => section.root), [0, 0, 5]);
    assert.equal(item.harmonicSections.at(-2).root, 7, 'Dominant tension precedes resolution');
    assert.equal(item.harmonicSections.at(-1).root, 0, 'The displayed final amount lands on the tonic');
    const pcm = readPcm(readFileSync(`assets/resources/audio/${item.asset}.wav`));
    for (const [start, end] of [[.05, .65], [.95, 2.2], [2.4, 3.7]]) {
      assert.ok(rmsBetween(pcm.samples[0], start, end, pcm.rate) > .025, `${item.asset}: the salute and answers must reach actual PCM`);
    }
    assert.ok(Math.abs(item.peak - (item === big ? .50 : .54)) < .0001, 'Old peak ceilings stay put: not a loudness-only upgrade');
  }
  assert.equal(big.orchestration.encoreBrass, null);
  assert.ok(!big.form.includes('independent-brass-encore'));
  assert.equal(superWin.instruments[superWin.orchestration.encoreBrass], 'Brass Section');
  assert.ok(superWin.form.includes('contrasting-string-bridge') && superWin.form.includes('independent-brass-encore'));
  assert.ok(superWin.harmonicSections.some((section: any) => section.root === 9), 'SUPER has a contrasting vi bridge, not stretched BIG audio');
  const encoreNotes = superWin.noteEvents.filter((note: any) => note.channel === superWin.orchestration.encoreBrass && note.at >= superWin.anchors.encore && note.at < superWin.anchors.finale);
  assert.ok(encoreNotes.length >= 3 && encoreNotes.at(-1).at - encoreNotes[0].at >= .6, 'Second act is a written brass answer');
  const superPcm = readPcm(readFileSync(`assets/resources/audio/${superWin.asset}.wav`));
  assert.ok(rmsBetween(superPcm.samples[0], superWin.anchors.encore, superWin.anchors.encore + .75, superPcm.rate) > .03);
  const tonic = [62, 65, 60, 62][mode];
  openingSignatures.add(JSON.stringify(big.noteEvents.filter((note: any) => note.channel === 0 && note.at < .8).map((note: any) => [note.at, note.key - tonic, note.hold])));
  encoreSignatures.add(JSON.stringify(encoreNotes.map((note: any) => [+(note.at-superWin.anchors.encore).toFixed(3), note.key-tonic, note.hold])));
}
assert.equal(openingSignatures.size, 4, 'Four musical greetings, not identical transpositions');
assert.equal(encoreSignatures.size, 4, 'Four independently written encore responses');
const shower = manifest.foley.find((row: any) => row.asset === REWARD_SOUNDS.coins);
assert.ok(COIN_INTERVAL_MS >= shower.duration * 1000 + 10, 'Do not retrigger/truncate an unfinished gold shower');
class Voice implements RewardVoice<string> {
  clip: string | null = null; loop = false; volume = 0; starts = 0;
  play() { this.starts++; } stop() {}
}
for (const tier of ['big', 'super'] as const) {
  const audio = new RewardAudio<string>();
  const voices = Object.fromEntries(REWARD_CHANNELS.map(channel => [channel, new Voice()]));
  audio.bind({ ...REWARD_SOUNDS }, voices as Record<typeof REWARD_CHANNELS[number], Voice>); audio.setAudible(true);
  const motion = new CabinetWinMotion(tier);
  let last = -Infinity, accepted = 0;
  for (const seconds of [...motion.waveTimes, motion.finaleTime]) if (audio.play('coins', seconds * 1000)) {
    assert.ok(seconds * 1000 - last >= shower.duration * 1000);
    last = seconds * 1000; accepted++;
  }
  assert.ok(accepted >= 3, 'Gold remains lively with bounded complete showers, not one cue per particle');
  assert.equal(voices.coins.starts, accepted);
  audio.stopPresentation(); assert.equal(audio.play('coins', 0), true, 'Fresh show resets the release limiter');
}
for (const asset of ['ui-jade-tap', 'ui-gold-step', 'reward-count-complete', 'reward-collect', ...[0, 1, 2, 3, 4].map(i => `reel-stop-${i}`)]) {
  const item = manifest.foley.find((row: any) => row.asset === asset);
  assert.match(item.source, /no fixed musical key/, 'Repeated tactile sounds leave the actual room harmony intact');
}
const quiet = manifest.tracks.find((row: any) => row.asset === 'ledger-interlude');
assert.equal(quiet.bpm, 98, 'The account/ledger scene has an unhurried identity');
for (const item of manifest.tracks) {
  assert.deepEqual(item.phraseDynamics, [.90, .79, .97, .86]);
  assert.match(item.cadenceBacking, /current-bar harmonic bed/);
}
console.log('PASS music/art choreography: 8 orchestrated room/tier scores, actual PCM phrases, 4 distinct salutes/encores, unchanged headroom, full counter/finale, complete coin tails and breathing backing');
