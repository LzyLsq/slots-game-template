import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RewardAudio, REWARD_CHANNELS, REWARD_SOUNDS, COUNTER_INTERVAL_MS, COIN_INTERVAL_MS, type RewardChannel, type RewardSound, type RewardVoice } from '../assets/scripts/ui/RewardAudio';

class Voice implements RewardVoice<string> {
  clip: string | null = null;
  loop = true;
  volume = 1;
  playing = false;
  plays: string[] = [];
  stops = 0;
  play(): void { this.playing = true; this.plays.push(this.clip!); }
  stop(): void { this.playing = false; this.stops++; }
}
function fixture(clips: Partial<Record<RewardSound, string>> = { ...REWARD_SOUNDS }) {
  const audio = new RewardAudio<string>();
  const voices = Object.fromEntries(REWARD_CHANNELS.map(channel => [channel, new Voice()])) as Record<RewardChannel, Voice>;
  audio.bind(clips, voices);
  return { audio, voices };
}
const { audio, voices } = fixture();
assert.equal(audio.play('super'), false, 'No playback before browser gesture unlock');
audio.setAudible(true);
for (const tier of ['ordinary', 'big', 'super'] as const) {
  const before = voices.score.stops;
  assert.equal(audio.play(tier), true);
  assert.equal(voices.score.clip, REWARD_SOUNDS[tier]);
  assert.equal(voices.score.loop, false);
  assert.equal(voices.score.stops, before + 1, 'Reuse the same score voice, stop previous tier');
}
assert.equal(new Set(voices.score.plays).size, 3, 'Distinct prepared fanfares for each award tier');
assert.equal(audio.play('counter', 0), true);
assert.equal(audio.play('counter', 33), false);
assert.equal(audio.play('counter', COUNTER_INTERVAL_MS - 1), false);
assert.equal(audio.play('counter', COUNTER_INTERVAL_MS), true);
assert.equal(audio.play('coins', 1000), true);
assert.equal(audio.play('coins', 1000 + COIN_INTERVAL_MS - 1), false, 'Duplicate coin wave cannot truncate its own tail');
assert.equal(audio.play('coins', 1000 + COIN_INTERVAL_MS), true);
assert.equal(audio.play('complete'), true, 'Completion replaces the final counter tick');
assert.equal(voices.counter.clip, REWARD_SOUNDS.complete);
assert.equal(audio.play('counter', 5000), false, 'A late count tick never chops off the resolving cadence');
assert.equal(audio.play('collect'), true);
assert.equal(Object.values(voices).filter(voice => voice.playing).length, 4, 'At most four fixed reward voices');
for (const voice of Object.values(voices)) assert.ok(voice.volume > 0 && voice.volume < .6);
audio.stopPresentation();
assert.equal(voices.score.playing || voices.coins.playing || voices.counter.playing, false);
assert.equal(voices.collect.playing, true, 'Closing the visual show must preserve collection confirmation');
assert.equal(audio.play('counter', 116), true, 'Cancellation resets the counter limiter for the next presentation');
audio.setAudible(false);
assert.ok(Object.values(voices).every(voice => !voice.playing), 'Mute or background stops every owned voice');
assert.equal(audio.play('super'), false);
const plays = Object.values(voices).reduce((n, voice) => n + voice.plays.length, 0);
audio.setAudible(true);
assert.equal(Object.values(voices).reduce((n, voice) => n + voice.plays.length, 0), plays, 'Unmute does not replay old awards');
assert.ok(Object.values(voices).every(voice => !voice.playing));
audio.play('open');
audio.stopAll();
assert.ok(Object.values(voices).every(voice => !voice.playing), 'Destroy/exit leaves no reward audio');
const missing = fixture({ collect: REWARD_SOUNDS.collect });
missing.audio.setAudible(true);
assert.equal(missing.audio.play('big'), false, 'Missing optional sound is a no-op');
assert.equal(missing.audio.play('collect'), true, 'One missing resource does not disable other channels');
const replacement = fixture();
audio.play('super');
audio.bind({ ...REWARD_SOUNDS }, replacement.voices);
assert.ok(Object.values(voices).every(voice => !voice.playing), 'Rebinding cleans previous sources');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uuids = new Set<string>();
const expectedDurations: Record<RewardSound, number> = { ordinary: 1.72, big: 6.50, super: 8.35, open: .91, coins: .78, counter: .072, complete: .54, collect: .69 };
for (const [kind, name] of Object.entries(REWARD_SOUNDS)) {
  const path = resolve(root, 'assets/resources/audio', `${name}.wav`);
  assert.ok(existsSync(path), `Missing reward asset ${name}`);
  const meta = JSON.parse(readFileSync(`${path}.meta`, 'utf8'));
  assert.equal(meta.importer, 'audio-clip');
  assert.ok(meta.uuid && !uuids.has(meta.uuid), 'Audio meta UUIDs must be unique'); uuids.add(meta.uuid);
  const wav = readFileSync(path);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt16LE(20), 1); // PCM
  assert.equal(wav.readUInt16LE(22), 1); // mono
  assert.equal(wav.readUInt32LE(24), 32000);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.toString('ascii', 36, 40), 'data');
  const duration = wav.readUInt32LE(40) / (32000 * 2);
  assert.ok(Math.abs(duration - expectedDurations[kind as RewardSound]) < .001);
  let peak = 0, energy = 0;
  for (let i = 44; i < wav.length; i += 2) { const v = wav.readInt16LE(i) / 32768; peak = Math.max(peak, Math.abs(v)); energy += v * v; }
  // Repeated coin/counter transients intentionally sit below the melody.
  const floor = kind === 'coins' || kind === 'counter' ? .12 : .2;
  assert.ok(peak >= floor && peak < .73, `${name} must be audible, with headroom (${peak})`);
  assert.ok(Math.sqrt(energy / ((wav.length - 44) / 2)) > .015, `${name} is not silent`);
  assert.equal(wav.readInt16LE(wav.length - 2), 0, 'Faded ending avoids a cut-off click');
}
console.log('PASS reward audio: 3 tier scores, 4 bounded voices, counter limiter, mute/background/cancel, missing clips and 8 valid WAV resources');

const themed = fixture();
const rooms = [0,1,2,3].map(mode => ({ordinary:`room-${mode}-small`,big:`room-${mode}-big`,super:`room-${mode}-super`}));
themed.audio.bind({...REWARD_SOUNDS},themed.voices,rooms);themed.audio.setAudible(true);
for(const mode of [0,1,2,3])for(const tier of ['ordinary','big','super'] as const){assert.equal(themed.audio.play(tier,0,mode),true);assert.equal(themed.voices.score.clip,rooms[mode][tier]);}
assert.equal(new Set(themed.voices.score.plays).size,12,'Four instrument/phrase identities × three tiers');
themed.audio.play('big',0,99);assert.equal(themed.voices.score.clip,REWARD_SOUNDS.big,'Missing room phrase falls back');
themed.audio.setAudible(false);assert.ok(Object.values(themed.voices).every(v=>!v.playing));
console.log('PASS theme reward routing: 12 room/tier cues, fallback, same four bounded cancellable voices');
