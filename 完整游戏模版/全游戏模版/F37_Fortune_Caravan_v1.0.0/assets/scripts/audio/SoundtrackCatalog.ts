import {MUSIC_SCENES,themeMusic} from './MusicTheme';
import type {Cue} from './AudioScore';
import {feedbackKeys} from './FeedbackCatalog';
export interface RecordedTrack {title:string;programs:readonly number[];bars:number;style:'merchant-swing'|'caravan-procession'|'oasis-dance'|'bazaar-waltz'|'voyage-jig'}
/** Original sampled arrangements. Percussion uses a separate GM drum bank. */
export const RECORDING_THEMES:Record<string,RecordedTrack>={
 lobby:{title:'Golden Welcome Swing',programs:[0,24,32,46],bars:16,style:'merchant-swing'},
 'caravan-gold':{title:'Caravan Good Fortune Parade',programs:[24,0,32,46],bars:16,style:'caravan-procession'},
 'sapphire-oasis':{title:'Sapphire Courtyard Dance',programs:[46,24,32,48],bars:16,style:'oasis-dance'},
 'ruby-bazaar':{title:'Ruby Joyful Market Waltz',programs:[0,46,32,24],bars:16,style:'bazaar-waltz'},
 'crown-voyage':{title:'Crown Harbour Waltzing Sails',programs:[0,48,32,46],bars:16,style:'voyage-jig'},
};
/** Decoded PCM RMS of the current five masters (audio-asset-qa.py).
 * Attenuation only: scene changes do not increase peaks or alter pitch/tempo.
 * RMS is an engineering reference, not a claim of equal perceived loudness. */
export const MUSIC_BALANCE={targetRmsDb:-25.5,decodedRmsDb:{
 lobby:-25.25,'caravan-gold':-23.42,'sapphire-oasis':-23.46,
 'ruby-bazaar':-25.50,'crown-voyage':-22.22
}} as const;
export const recordedMusicTrim=(scene:string):number=>{
 const key=Object.prototype.hasOwnProperty.call(MUSIC_BALANCE.decodedRmsDb,scene)?scene as keyof typeof MUSIC_BALANCE.decodedRmsDb:'lobby';
 return Math.min(1,10**((MUSIC_BALANCE.targetRmsDb-MUSIC_BALANCE.decodedRmsDb[key])/20));
};
export const RECORDED_CUES:readonly Cue[]=['tap','bet','navigate','toggle','confirm','spin','reel-stop','win','big-win','epic-win','reward','collect','error'];
export const musicKey=(scene:string):string=>'music-'+(RECORDING_THEMES[scene]?scene:'lobby');
export const cueKey=(cue:Cue):string=>'fx-'+cue;
export const awardKey=(scene:string,tier:number):string=>'award-'+(RECORDING_THEMES[scene]&&scene!=='lobby'?scene:'caravan-gold')+'-'+Math.max(0,Math.min(4,Math.floor(tier)));
export const finaleKey=(scene:string,tier:number):string=>awardKey(scene,tier)+'-resolve';
export const musicDuration=(scene:string):number=>{const t=themeMusic(scene),r=RECORDING_THEMES[scene]??RECORDING_THEMES.lobby;return r.bars*t.eighthsPerBar*60/t.bpm/2;};
export function recordingKeys(scene:string):string[]{
 return [musicKey(scene),...RECORDED_CUES.map(cueKey),'fx-reel-roll',...feedbackKeys(scene),...(scene==='lobby'?[]:Array.from({length:5},(_,tier)=>[awardKey(scene,tier),finaleKey(scene,tier)]).flat())];
}
export const ALL_RECORDINGS=Array.from(new Set(MUSIC_SCENES.flatMap(recordingKeys)));
