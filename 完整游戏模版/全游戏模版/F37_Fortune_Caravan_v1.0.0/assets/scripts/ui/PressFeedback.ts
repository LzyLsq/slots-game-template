import type {Cue} from '../audio/AudioScore';
export type PressCue='tap'|'bet'|'navigate'|'toggle'|'confirm'|'none';
export interface PressFeedback {cue:PressCue;vibration:number}
/** Stable semantic control names, never the translated visual label. */
export function pressFeedback(name:string,override?:PressCue):PressFeedback{
  const cue=override??(/\b(bet)\b/i.test(name)?'bet':/\b(auto|audio|music|effects|vibration|mute|sound)\b/i.test(name)?'toggle':/\b(back|close|rules|tab|language|locale|history)\b/i.test(name)?'navigate':/\b(save|claim|collect|purchase|confirm)\b/i.test(name)?'confirm':'tap');
  // Contact owns the tactile click; the spin action still owns the motor cue.
  return {cue,vibration:/^spin$/i.test(name)?14:cue==='bet'?10:8};
}
export function validPressCue(value:unknown):value is Exclude<Cue,'spin'|'reel-stop'|'win'|'big-win'|'epic-win'|'reward'>{return typeof value==='string'&&['tap','bet','navigate','toggle','confirm'].includes(value);}
