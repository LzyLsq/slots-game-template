import {MUSIC_SCENES,themeMusic} from './MusicTheme';
import type {Cue} from './AudioScore';
export interface RecordedTrack {title:string;programs:readonly number[];bars:number;style:'casino-swing'|'gold-funk'|'jade-festival'|'pearl-regatta'|'phoenix-carnival'}
/** Original sampled arrangements. Percussion uses a separate GM drum bank. */
export const RECORDING_THEMES:Record<string,RecordedTrack>={
 lobby:{title:'Gilded Casino Celebration',programs:[0,56,32,11],bars:16,style:'casino-swing'},
 'golden-hour':{title:'Gold Rush Jackpot',programs:[61,0,33,11],bars:16,style:'gold-funk'},
 'jade-treasury':{title:'Jade Fortune Festival',programs:[107,73,45,48],bars:16,style:'jade-festival'},
 'pearl-palace':{title:'Pearl Treasure Regatta',programs:[8,73,46,32],bars:16,style:'pearl-regatta'},
 'ruby-revel':{title:'Phoenix Wealth Carnival',programs:[48,56,33,46],bars:16,style:'phoenix-carnival'},
};
export const RECORDED_CUES:readonly Cue[]=['tap','bet','navigate','toggle','confirm','spin','reel-stop','win','big-win','epic-win','reward','collect','error'];
export const musicKey=(scene:string):string=>'music-'+(RECORDING_THEMES[scene]?scene:'lobby');
export const cueKey=(cue:Cue):string=>'fx-'+cue;
export const awardKey=(scene:string,tier:number):string=>'award-'+(RECORDING_THEMES[scene]&&scene!=='lobby'?scene:'golden-hour')+'-'+Math.max(0,Math.min(4,Math.floor(tier)));
export const finaleKey=(scene:string,tier:number):string=>awardKey(scene,tier)+'-resolve';
export const musicDuration=(scene:string):number=>{const t=themeMusic(scene),r=RECORDING_THEMES[scene]??RECORDING_THEMES.lobby;return r.bars*t.eighthsPerBar*60/t.bpm/2;};
export function recordingKeys(scene:string):string[]{
 return [musicKey(scene),...RECORDED_CUES.map(cueKey),'fx-reel-roll',...(scene==='lobby'?[]:Array.from({length:5},(_,tier)=>[awardKey(scene,tier),finaleKey(scene,tier)]).flat())];
}
export const ALL_RECORDINGS=Array.from(new Set(MUSIC_SCENES.flatMap(recordingKeys)));
