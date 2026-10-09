import {MUSIC_SCENES,themeMusic} from './MusicTheme';
import type {Cue} from './AudioScore';
export interface RecordedTrack {title:string;programs:readonly number[];bars:number;style:'merchant-swing'|'caravan-procession'|'oasis-dance'|'bazaar-waltz'|'voyage-jig'}
/** Original sampled arrangements. Percussion uses a separate GM drum bank. */
export const RECORDING_THEMES:Record<string,RecordedTrack>={
 lobby:{title:'Sunset Merchant Welcome',programs:[0,24,32,11],bars:16,style:'merchant-swing'},
 'caravan-gold':{title:'Caravan Fortune Procession',programs:[24,0,32,46],bars:16,style:'caravan-procession'},
 'sapphire-oasis':{title:'Sapphire Oasis Dance',programs:[46,73,45,48],bars:16,style:'oasis-dance'},
 'ruby-bazaar':{title:'Ruby Merchant Waltz',programs:[0,46,24,32],bars:16,style:'bazaar-waltz'},
 'crown-voyage':{title:'Crown Harbour Celebration',programs:[48,60,32,46],bars:16,style:'voyage-jig'},
};
export const RECORDED_CUES:readonly Cue[]=['tap','bet','navigate','toggle','confirm','spin','reel-stop','win','big-win','epic-win','reward','collect','error'];
export const musicKey=(scene:string):string=>'music-'+(RECORDING_THEMES[scene]?scene:'lobby');
export const cueKey=(cue:Cue):string=>'fx-'+cue;
export const awardKey=(scene:string,tier:number):string=>'award-'+(RECORDING_THEMES[scene]&&scene!=='lobby'?scene:'caravan-gold')+'-'+Math.max(0,Math.min(4,Math.floor(tier)));
export const finaleKey=(scene:string,tier:number):string=>awardKey(scene,tier)+'-resolve';
export const musicDuration=(scene:string):number=>{const t=themeMusic(scene),r=RECORDING_THEMES[scene]??RECORDING_THEMES.lobby;return r.bars*t.eighthsPerBar*60/t.bpm/2;};
export function recordingKeys(scene:string):string[]{
 return [musicKey(scene),...RECORDED_CUES.map(cueKey),'fx-reel-roll',...(scene==='lobby'?[]:Array.from({length:5},(_,tier)=>[awardKey(scene,tier),finaleKey(scene,tier)]).flat())];
}
export const ALL_RECORDINGS=Array.from(new Set(MUSIC_SCENES.flatMap(recordingKeys)));
