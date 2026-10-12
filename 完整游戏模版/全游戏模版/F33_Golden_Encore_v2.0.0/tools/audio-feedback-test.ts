import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { InteractionAudio, INTERACTION_SOUNDS, type InteractionVoice } from '../assets/scripts/ui/InteractionAudio';
import { GameplayAudio, GAMEPLAY_SOUNDS, ROOM_GAMEPLAY_SOUNDS } from '../assets/scripts/ui/GameplayAudio';
import { restoreAudioPreferences, audibleAudio } from '../assets/scripts/ui/AudioPreferences';
import { SceneMusic, MUSIC_TRACKS, type MusicScene } from '../assets/scripts/ui/SceneMusic';
import { LANGUAGES, setLanguage, tr } from '../assets/scripts/ui/Language';
class Voice implements InteractionVoice<string> {
  clip: string | null = null; loop = false; volume = 0; playing = false;
  starts: string[] = []; stops = 0;
  play() { this.playing = true; this.starts.push(this.clip!); }
  stop() { this.playing = false; this.stops++; }
  pause() { this.playing = false; }
}
const count = (voices: Voice[]) => voices.reduce((sum, voice) => sum + voice.starts.length, 0);
const contact = new InteractionAudio<string>(), contacts = [new Voice(), new Voice(), new Voice()];
contact.bind(INTERACTION_SOUNDS, contacts);
assert.equal(contact.play('tap', 0), false, 'No UI sound before gesture unlock');
contact.setAudible(true);
assert.equal(contact.play('betUp', 0), true); assert.equal(contact.play('betUp', 74), false);
assert.equal(contact.play('betUp', 75), true);
assert.ok(contacts[0].playing && contacts[1].playing, 'Two contacts keep short tails instead of cutting every tap');
assert.equal(contact.play('betDown', 120), true);
assert.equal(contacts[0].clip, INTERACTION_SOUNDS.betDown);
assert.equal(contact.play('settle', 220), true); assert.equal(contact.play('blocked', 320), true);
assert.equal(contacts[0].volume, .18, 'Boundary feedback is not a success flourish');
assert.equal(contacts[2].starts.length, 0, 'Owned voice count never grows');
assert.equal(contact.play('tap', NaN), false); assert.equal(contact.play('tap', Infinity), false);
contact.setAudible(false); assert.ok(contacts.every(v => !v.playing));
const before = count(contacts); contact.setAudible(true); assert.equal(count(contacts), before, 'Unmute never replays input');
const missing = new InteractionAudio<string>(); missing.bind({}, [new Voice()]); missing.setAudible(true);
assert.equal(missing.play('enter', 0), false, 'Missing optional cue never blocks an accepted action');
const rooms = ROOM_GAMEPLAY_SOUNDS.map(names => ({ ...names }));
const machine = new GameplayAudio<string>(), mechanics = [new Voice(), new Voice(), new Voice()];
machine.bind({ ...GAMEPLAY_SOUNDS }, mechanics, rooms); machine.setAudible(true);
for (const mode of [0,1,2,3]) {
  machine.begin(true, mode, true); assert.equal(mechanics[2].clip, rooms[mode].launch);
  assert.equal(mechanics[0].clip, rooms[mode].roll); assert.equal(mechanics[0].loop, true);
  for (let column = 0; column < 5; column++) {
    machine.columnStop(column, mode * 1000 + column * 100);
    assert.equal(mechanics[1].clip, rooms[mode][`stop${column}` as keyof typeof GAMEPLAY_SOUNDS]);
  }
  assert.equal(mechanics[0].playing, false); machine.feature(); assert.equal(mechanics[2].clip, rooms[mode].feature);
  const launches = mechanics[2].starts.length;
  machine.begin(true, mode); assert.equal(mechanics[2].starts.length, launches, 'Held re-spin does not charge or launch twice');
  machine.stopAll(); assert.ok(mechanics.every(v => !v.playing));
}
assert.equal(new Set(rooms.map(room => room.roll)).size, 4); assert.equal(new Set(rooms.map(room => room.launch)).size, 4);
assert.equal(new Set(rooms.map(room => room.feature)).size, 4);
for (let column = 0; column < 5; column++) assert.equal(new Set(rooms.map(room => room[`stop${column}` as keyof typeof GAMEPLAY_SOUNDS])).size, 4);
assert.deepEqual(restoreAudioPreferences({ musicEnabled: false }), { musicEnabled: false, bgmEnabled: true, effectsEnabled: true }, 'Legacy master mute is preserved');
assert.deepEqual(restoreAudioPreferences(undefined), { musicEnabled: true, bgmEnabled: true, effectsEnabled: true });
for (const master of [false,true]) for (const music of [false,true]) for (const effects of [false,true]) {
  const settings = { musicEnabled: master, bgmEnabled: music, effectsEnabled: effects };
  assert.deepEqual(audibleAudio(settings, true, false), { music: master && music, effects: master && effects });
  assert.deepEqual(audibleAudio(settings, false, false), { music: false, effects: false });
  assert.deepEqual(audibleAudio(settings, true, true), { music: false, effects: false });
}
for (const choice of LANGUAGES) {
  setLanguage(choice.code);
  for (const key of ['AUDIO SETTINGS','MASTER SOUND','BACKGROUND MUSIC','SOUND EFFECTS','ON','OFF','DONE'])
    assert.ok(tr(key).length > 0 && (choice.code === 'en' || tr(key) !== key));
  assert.ok(!tr('{setting} · {state}', { setting: tr('MASTER SOUND'), state: tr('ON') }).includes('{'));
}
setLanguage('en');
const manifest = JSON.parse(readFileSync('docs/audio-score-manifest.json','utf8'));
for (const scene of Object.keys(MUSIC_TRACKS) as MusicScene[])
  assert.equal(MUSIC_TRACKS[scene].bpm, manifest.tracks.find((item: any) => item.asset === MUSIC_TRACKS[scene].asset).bpm, 'Playback beat clock matches the delivered arrangement');
const music = new SceneMusic<string>(), voices = [new Voice(),new Voice()];
music.bind(voices); for (const scene of Object.keys(MUSIC_TRACKS) as MusicScene[]) music.setClip(scene, scene);
music.setAudible(true); music.update(.1);
const started = count(voices); music.select('hall'); assert.equal(count(voices), started, 'Only music waits for its subdivision; UI is not delayed');
assert.equal(music.snapshot.pending, 'hall'); music.update(.1); assert.equal(count(voices), started);
music.select('welcome'); assert.equal(music.snapshot.pending, null, 'Returning cancels a stale planned transition');
music.select('dragon'); music.select('pearl'); music.update(.4);
assert.equal(voices.flatMap(v => v.starts).includes('dragon'), false, 'Rapid switches never start the obsolete room');
assert.ok(voices.some(v => v.clip === 'pearl' && v.playing));
music.setAudible(false); music.update(30); assert.ok(voices.every(v => !v.playing));
music.setAudible(true); music.update(1); assert.equal(voices.filter(v => v.playing).length, 1);
music.stopAll();
const lazy = new SceneMusic<string>(), lv = [new Voice(),new Voice()]; lazy.bind(lv); lazy.setClip('welcome','welcome'); lazy.setClip('hall','hall'); lazy.setAudible(true); lazy.update(.1);
lazy.select('hall'); lazy.select('dragon'); lazy.update(1);
assert.ok(!lv.flatMap(v => v.starts).includes('hall'), 'Unloaded desired scene cancels previous pending transition');
lazy.setClip('dragon','dragon'); lazy.update(1.5); assert.ok(lv.some(v => v.clip === 'dragon' && v.playing)); lazy.stopAll();
const app = readFileSync('assets/scripts/ui/GoldenEncoreApp.ts','utf8');
const spin = app.slice(app.indexOf('  private async spin():'), app.indexOf('  private settleCurrentRound('));
assert.ok(spin.indexOf('this.persist(); this.refreshMeters();') < spin.indexOf('this.machineAudio.begin(!this.reduced, this.save.selectedMode, true)'), 'Launch follows accepted persisted debit');
assert.ok(spin.indexOf("this.save.coins < stake") < spin.indexOf('this.machineAudio.begin('), 'Insufficient balance exits before launch');
const spinButton = app.slice(app.indexOf('  private cabinetSpinButton('), app.indexOf('  private header('));
assert.ok(!spinButton.includes('playClick('), 'A hit box does not assume debit acceptance');
const betButton = app.slice(app.indexOf('  private cabinetBetButton('), app.indexOf('  private cabinetUtilityButton('));
assert.ok(!betButton.includes('playClick('), 'Rejected/accepted adjustments own separate sounds');
assert.match(app, /this\.save\.bet = next; this\.persist\(\); this\.playClick\(direction > 0 \? 'betUp' : 'betDown'\)/);
assert.match(app, /this\.persist\(\); this\.beginModeEntry\(room\); this\.playClick\('enter'\)/);
assert.match(app, /\.\.\.restoreAudioPreferences\(raw\)/);
assert.ok(app.includes('bindRoomGesture(arrow, () => stepRoom(direction))'), 'Arrows and swipes share the accepted-room-settle feedback');
assert.ok(readFileSync('assets/scripts/ui/GameplayAudio.ts','utf8').includes('stopped: Array.from(this.stopped)'), 'Creator loose-spread lowering must not turn an empty Set into one opaque QA entry');
console.log('PASS feedback: accepted/rejected semantics, two contact voices, 4×8 cabinet cues, direction/rate/missing/mute, 8 setting combinations, five languages, cancellable beat routing and persisted-debit integration');
