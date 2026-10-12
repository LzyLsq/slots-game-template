/** Scene tonality and asset routing shared by all managed audio voices. */
export const AUDIO_SCENES = ['salon', 'golden-phoenix', 'jade-dragon', 'pearl-qilin', 'amber-panda'] as const;
export type AudioScene = typeof AUDIO_SCENES[number];
export type AudioCue = 'tap' | 'spin' | 'reel-stop' | 'win' | 'reward';
export type TonalCue = 'win-normal' | 'coin-collect' | 'feature' | 'award-accent';
export type AwardBase = `win-${'grand'|'super'|'mega'|'epic'}`;
export type ClipName = 'ui-touch' | 'reel-start' | 'reel-roll' | `music-${AudioScene}` |
  `${TonalCue}${''|`-${AudioScene}`}` | `reel-stop${''|`-${AudioScene}`}${''|`-${number}`}` |
  `${AwardBase}${''|'-resolve'}${''|`-${AudioScene}`}`;
export const AWARD_SCORES: AwardBase[] = ['win-grand', 'win-super', 'win-mega', 'win-epic'];
export function tonalName(name: TonalCue, scene: AudioScene): ClipName {
  return `${name}${scene === 'salon' ? '' : `-${scene}`}` as ClipName;
}
export function stopName(scene: AudioScene, column: number): ClipName {
  const index = Math.max(0, Math.min(5, Math.trunc(Number.isFinite(column) ? column : 0)));
  return `reel-stop${scene === 'salon' ? '' : `-${scene}`}${index ? `-${index}` : ''}` as ClipName;
}
export function awardName(name: AwardBase, scene: AudioScene, resolve = false): ClipName {
  return `${name}${resolve ? '-resolve' : ''}${scene === 'salon' || scene === 'golden-phoenix' ? '' : `-${scene}`}` as ClipName;
}
export function cueName(cue: AudioCue, scene: AudioScene, column = 0): ClipName {
  switch (cue) {
    case 'tap': return 'ui-touch';
    case 'spin': return 'reel-start';
    case 'reel-stop': return stopName(scene, column);
    case 'win': return tonalName('win-normal', scene);
    case 'reward': return tonalName('coin-collect', scene);
  }
}
export function audioAssets(scenes: readonly AudioScene[] = AUDIO_SCENES): ClipName[] {
  const names = new Set<ClipName>(['ui-touch', 'reel-start', 'reel-roll']);
  for (const scene of scenes) {
    names.add(`music-${scene}`);
    for (const cue of ['win-normal', 'coin-collect', 'feature', 'award-accent'] as const) names.add(tonalName(cue, scene));
    for (let column = 0; column < 6; column++) names.add(stopName(scene, column));
    if (scene !== 'salon') for (const name of AWARD_SCORES) {
      names.add(awardName(name, scene)); names.add(awardName(name, scene, true));
    }
  }
  // Creator's ES5 build treats Set spread as one element; explicitly enumerate it.
  return Array.from(names);
}
