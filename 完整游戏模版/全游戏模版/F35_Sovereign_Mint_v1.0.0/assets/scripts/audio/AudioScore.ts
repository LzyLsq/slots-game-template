import {midi,themeMusic,type Instrument} from './MusicTheme';
/** Original, restrained gold/enamel sound palette; no external audio dependency. */
export type Cue = 'tap' | 'bet' | 'navigate' | 'toggle' | 'confirm' | 'spin' | 'reel-stop' | 'win' | 'big-win' | 'epic-win' | 'reward' | 'collect' | 'error';
/** Uses the shared visual tier: ordinary=0, big=1, super and above>=2. */
export function celebrationCue(tier:number):'win'|'big-win'|'epic-win'{return tier>=2?'epic-win':tier>=1?'big-win':'win';}
export type Note = readonly [pitch:number, duration:number, delay:number, volume:number, wave:OscillatorType, instrument?:Instrument,pan?:number];
export const CUES:Record<Cue,readonly Note[]> = {
  tap:[[660,.07,0,.027,'sine'],[990,.05,.015,.008,'triangle']],
  bet:[[440,.065,0,.029,'triangle'],[880,.07,.018,.009,'sine']],
  navigate:[[587,.105,0,.025,'sine'],[784,.13,.052,.018,'sine']],
  toggle:[[523,.08,0,.025,'triangle'],[784,.09,.035,.014,'sine']],
  confirm:[[310,.075,0,.029,'triangle'],[730,.06,.015,.008,'sine']],
  spin:[[180,.16,0,.036,'triangle'],[275,.13,.12,.021,'sine'],[420,.1,.24,.013,'sine']],
  'reel-stop':[[200,.065,0,.028,'triangle'],[570,.065,.025,.009,'sine']],
  win:[[523,.18,0,.034,'sine'],[659,.2,.11,.036,'sine'],[784,.32,.23,.037,'sine']],
  'big-win':[[392,.21,0,.039,'triangle'],[523,.21,.12,.044,'sine'],[659,.23,.24,.043,'sine'],[784,.34,.38,.041,'sine'],[1046,.48,.55,.032,'sine']],
  'epic-win':[[392,.2,0,.038,'triangle'],[523,.24,.12,.046,'sine'],[659,.25,.24,.046,'sine'],[784,.32,.38,.045,'sine'],[1046,.43,.56,.043,'sine'],[1318,.68,.75,.03,'sine']],
  collect:[[523,.11,0,.024,'sine'],[784,.17,.075,.023,'sine'],[1046,.21,.16,.017,'sine']],
  error:[[240,.12,0,.025,'triangle'],[180,.14,.07,.019,'sine']],
  reward:[[440,.17,0,.035,'triangle'],[660,.22,.12,.033,'sine'],[880,.34,.27,.032,'sine']]
};
/** Theme-matched tactile cues, pitched into the current score rather than random beeps. */
export function cueNotes(cue:Cue,scene:string):readonly Note[]{
  const theme=themeMusic(scene),root=theme.award[0];
  return CUES[cue].map(([pitch,duration,delay,volume,wave],i)=>{
    const mechanical=cue==='spin'||cue==='reel-stop'||cue==='confirm';
    const tactile=cue==='tap'||cue==='bet'||cue==='toggle';
    const tuned=mechanical?pitch:midi(root+(tactile?0:theme.award[Math.min(i,theme.award.length-1)]-root)+(tactile?i*7:0));
    return [tuned,duration,delay,volume,wave,mechanical?'wood':tactile?'coin':theme.lead,i%2===0?-.10:.10] as Note;
  });
}
/** Short melodic coin cues are mastered in C; tune only those cues into the
 * cabinet key. Physical clicks and entire background/performance tracks stay at 1x. */
export function recordedCueRate(cue:Cue,scene:string):number{
  if(!['win','big-win','epic-win','reward','collect'].includes(cue))return 1;
  const semitones=(themeMusic(scene).chords[0][0]%12+6)%12-6;
  return 2**(semitones/12);
}
export const BEAT_SECONDS=60/82/2;
export function musicBeatSeconds(scene:string):number{return 60/themeMusic(scene).bpm/2;}
export function musicNotes(beat:number,scene:string):readonly Note[]{
  const theme=themeMusic(scene),i=((beat%theme.melody.length)+theme.melody.length)%theme.melody.length;
  const inBar=i%theme.eighthsPerBar,bar=Math.floor(i/theme.eighthsPerBar),chord=theme.chords[bar%theme.chords.length];
  const step=musicBeatSeconds(scene),notes:Note[]=[];
  if(theme.melody[i])notes.push([midi(theme.melody[i]),Math.min(.68,step*1.45),0,.009,'sine',theme.lead,.18]);
  if(inBar===0)notes.push([midi(chord[0]),step*2.4,0,.010,'triangle','bass',-.15]);
  // The broken accompaniment leaves air for buttons and coin-counting.
  if(inBar%2===0){const degree=1+(Math.floor(inBar/2)%3);notes.push([midi(chord[degree]),step*1.6,.028,.0045,'triangle',theme.backing,-.24]);}
  if(inBar===Math.floor(theme.eighthsPerBar/2))notes.push([midi(chord[2]+12),.10,.015,.0026,'triangle',theme.percussion==='metal'?'coin':'wood',.28]);
  return notes;
}
export interface MusicWindow {times:number[];firstBeat:number;nextBeat:number;beat:number}
/** Skip missed time after a hitch rather than playing stale notes in a burst. */
export function musicWindow(now:number,next:number,beat:number,scene='lobby'):MusicWindow{
  const step=musicBeatSeconds(scene);
  if(next<now-.08){const missed=Math.ceil((now+.025-next)/step);next+=missed*step;beat+=missed;}
  const firstBeat=beat,times:number[]=[];
  for(let i=0;i<3&&next<now+.38;i++){times.push(Math.max(now+.008,next));next+=step;beat++;}
  return {times,firstBeat,nextBeat:next,beat};
}
