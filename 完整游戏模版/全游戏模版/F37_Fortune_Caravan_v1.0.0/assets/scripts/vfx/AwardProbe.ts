import type {AwardPhase} from './AwardTimeline';
/** Read-only QA markers, strictly absent from normal production sessions. */
const localQA=():boolean=>typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('debug')==='1';
const canvas=():HTMLElement|null=>typeof document!=='undefined'&&localQA()?document.getElementById('GameCanvas'):null;
/** Retain the real, settled award for local screenshots; Collect still exits normally. */
export function awardShowcase():boolean{return localQA()&&new URLSearchParams(location.search).get('showcase')==='1';}
export function awardProbe(tier:number,phase:AwardPhase,amount:number,sound?:{voices:number;state:string;audible:boolean;scene?:string;musicBpm?:number;scheduled?:number;hidden?:boolean;recordedMusic?:boolean;recordedAward?:boolean;musicTrack?:string;readyRecordings?:number;recordingFailures?:number;recordingError?:string}):void{
 const element=canvas();if(!element)return;
 if(!sound&&phase==='reveal')element.setAttribute('data-award-peak-voices','0');
 if(sound?.scene)element.setAttribute('data-award-music-scene',sound.scene);if(sound?.musicBpm)element.setAttribute('data-award-music-bpm',String(sound.musicBpm));
 if(sound?.scheduled!==undefined)element.setAttribute('data-award-scheduled-notes',String(sound.scheduled));if(sound?.hidden!==undefined)element.setAttribute('data-award-audio-hidden',String(sound.hidden));
 if(sound?.readyRecordings!==undefined)element.setAttribute('data-audio-ready-recordings',String(sound.readyRecordings));
 if(sound?.recordingFailures!==undefined)element.setAttribute('data-audio-recording-failures',String(sound.recordingFailures));
 if(sound?.recordingError!==undefined)element.setAttribute('data-audio-recording-error',sound.recordingError);
 if(sound?.recordedMusic!==undefined)element.setAttribute('data-audio-recorded-music',String(sound.recordedMusic));
 if(sound?.recordedAward!==undefined)element.setAttribute('data-audio-recorded-award',String(sound.recordedAward));
 if(sound?.musicTrack)element.setAttribute('data-audio-music-track',sound.musicTrack);
 if(sound){element.setAttribute('data-award-peak-voices',String(Math.max(Number(element.getAttribute('data-award-peak-voices')||0),sound.voices)));element.setAttribute('data-award-voices',String(sound.voices));element.setAttribute('data-award-audio',sound.audible?'running':sound.state==='running'?'muted':'locked');}
 element.setAttribute('data-award-tier',String(tier));element.setAttribute('data-award-phase',phase);element.setAttribute('data-award-amount',String(amount));
}
export function clearAwardProbe():void{const element=canvas();for(const attr of ['data-award-tier','data-award-phase','data-award-amount','data-award-voices','data-award-audio','data-award-peak-voices','data-award-music-scene','data-award-music-bpm','data-award-scheduled-notes','data-award-audio-hidden','data-audio-recorded-music','data-audio-recorded-award','data-audio-music-track','data-audio-ready-recordings','data-audio-recording-failures','data-audio-recording-error'])element?.removeAttribute(attr);}
