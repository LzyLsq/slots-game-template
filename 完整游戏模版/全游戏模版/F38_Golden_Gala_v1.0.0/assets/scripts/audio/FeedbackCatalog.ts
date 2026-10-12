import type {Cue} from './AudioScore';
import type {FeatureRound} from '../math/types';
/** Actual material recordings: variants never use a playback-rate trick. */
export const BUTTON_CUES=['tap','bet','navigate','toggle','confirm'] as const;
export type ButtonCue=typeof BUTTON_CUES[number];
export const FEEDBACK_SCENES=['crown-club','emerald-fortune','ruby-royale','vault-reserve'] as const;
export const CABINET_FEEDBACK=['spin','reel-stop','reel-roll','collect','feature-entry','feature-step'] as const;
export type CabinetFeedback=typeof CABINET_FEEDBACK[number];
export type FeatureSoundStage='entry'|'step';
export const isFeedbackScene=(scene:string):boolean=>FEEDBACK_SCENES.some(s=>s===scene);
export const buttonKey=(cue:ButtonCue,index:number):string=>'fx-'+cue+(index%3===0?'':'-v'+index%3);
export const cabinetFeedbackKey=(scene:string,role:CabinetFeedback):string=>'fx-cabinet-'+scene+'-'+role;
export function feedbackKeys(scene:string):string[]{
 return [...BUTTON_CUES.flatMap(cue=>[buttonKey(cue,1),buttonKey(cue,2)]),...(isFeedbackScene(scene)?CABINET_FEEDBACK.map(role=>cabinetFeedbackKey(scene,role)):[])];
}
export function preferredCueKey(cue:Cue,scene:string,contact:number):string{
 if(BUTTON_CUES.some(c=>c===cue))return buttonKey(cue as ButtonCue,contact);
 if(isFeedbackScene(scene)&&(cue==='spin'||cue==='reel-stop'||cue==='collect'))return cabinetFeedbackKey(scene,cue);
 return 'fx-'+cue;
}
/** Scene-local assets must not remain decoded after the cabinet has been left. */
export function localRecordingScene(key:string):string|undefined{
 return FEEDBACK_SCENES.find(scene=>key.startsWith('fx-cabinet-'+scene+'-')||key.startsWith('award-'+scene+'-'));
}
/** Only genuine feature actions get an accent; no near-miss or generic respin cue.
 * sticky-free stores PREVIOUSLY held cells; new WILDs are in the landed grid. */
export function hasFeatureStep(scene:string,round:FeatureRound,wildId:string):boolean{
 if(scene==='crown-club')return round.motion==='transform'&&!!round.focus?.length;
 if(scene==='emerald-fortune')return round.motion==='respin';
 if(scene==='ruby-royale')return round.motion==='transform'&&!!round.focus?.length;
 if(scene==='vault-reserve')return round.motion==='respin'&&!!round.focus?.length;
 return false;
}

/** Guardians offer a treasury contact, not the exact same bet click.
 * Reuse each cabinet's softly recorded coin collection, always at native speed.
 * The lobby uses already-warmed, distinct material contacts (no decoding on touch).
 */
export function guardianFeedbackKeys(theme:number,scene:string):readonly string[]{
 const index=Math.max(0,Math.min(3,Math.floor(theme)||0)),id=FEEDBACK_SCENES[index];
 return scene===id?[cabinetFeedbackKey(id,'collect'),'fx-collect']:
  [(['fx-collect','fx-confirm-v1','fx-bet-v2','fx-toggle-v1'] as const)[index],'fx-collect'];
}
