import {MUSIC_SCENES,themeMusic} from './MusicTheme';
import type {Cue} from './AudioScore';
import {feedbackKeys} from './FeedbackCatalog';
export interface RecordedTrack {title:string;programs:readonly number[];bars:number;style:'merchant-swing'|'gala-procession'|'oasis-dance'|'bazaar-waltz'|'voyage-jig'}
/** Original sampled arrangements. Percussion uses a separate GM drum bank. */
export const RECORDING_THEMES:Record<string,RecordedTrack>={
 lobby:{title:'Golden Gala Welcome',programs:[0,24,32,46],bars:16,style:'merchant-swing'},
 'crown-club':{title:'Crown Club Brass Salute',programs:[60,0,32,46],bars:16,style:'gala-procession'},
 'emerald-fortune':{title:'Emerald Treasure Dance',programs:[46,24,32,48],bars:16,style:'oasis-dance'},
 'ruby-royale':{title:'Ruby Royale Ballroom',programs:[0,46,32,24],bars:16,style:'bazaar-waltz'},
 'vault-reserve':{title:'Vault Reserve Gold Swing',programs:[24,0,32,46],bars:16,style:'merchant-swing'},
};
/** Decoded PCM RMS of the current five masters (audio-asset-qa.py).
 * Attenuation only: scene changes do not increase peaks or alter pitch/tempo.
 * RMS is an engineering reference, not a claim of equal perceived loudness. */
export const MUSIC_BALANCE={targetRmsDb:-25.5,decodedRmsDb:{
 lobby:-25.46,'crown-club':-22.16,'emerald-fortune':-24.57,'ruby-royale':-24.59,'vault-reserve':-24.85
}} as const;
export const recordedMusicTrim=(scene:string):number=>{
 const key=Object.prototype.hasOwnProperty.call(MUSIC_BALANCE.decodedRmsDb,scene)?scene as keyof typeof MUSIC_BALANCE.decodedRmsDb:'lobby';
 return Math.min(1,10**((MUSIC_BALANCE.targetRmsDb-MUSIC_BALANCE.decodedRmsDb[key])/20));
};
export const RECORDED_CUES:readonly Cue[]=['tap','bet','navigate','toggle','confirm','spin','reel-stop','win','big-win','epic-win','reward','collect','error'];
export const musicKey=(scene:string):string=>'music-'+(RECORDING_THEMES[scene]?scene:'lobby');
export const cueKey=(cue:Cue):string=>'fx-'+cue;
export const awardKey=(scene:string,tier:number):string=>'award-'+(RECORDING_THEMES[scene]&&scene!=='lobby'?scene:'crown-club')+'-'+Math.max(0,Math.min(4,Math.floor(tier)));
export const finaleKey=(scene:string,tier:number):string=>awardKey(scene,tier)+'-resolve';
export const musicDuration=(scene:string):number=>{const t=themeMusic(scene),r=RECORDING_THEMES[scene]??RECORDING_THEMES.lobby;return r.bars*t.eighthsPerBar*60/t.bpm/2;};
export function recordingKeys(scene:string):string[]{
 return [musicKey(scene),...RECORDED_CUES.map(cueKey),'fx-reel-roll',...feedbackKeys(scene),...(scene==='lobby'?[]:Array.from({length:5},(_,tier)=>[awardKey(scene,tier),finaleKey(scene,tier)]).flat())];
}
export const ALL_RECORDINGS=Array.from(new Set(MUSIC_SCENES.flatMap(recordingKeys)));
