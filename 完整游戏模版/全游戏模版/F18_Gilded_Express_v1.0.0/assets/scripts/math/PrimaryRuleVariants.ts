import type {GameConfig,WinResult} from './types';
/** Variants describe conventional winning rules, not artificial per-project restrictions. */
export function primaryVariant(c:GameConfig):string{return ({'line-reels':'line-left','variable-ways':'variable-left','cluster-avalanche':'cluster-orthogonal','scatter-groups':'count-board','collector-grid':'collect-board','any-reel-ways':'ways-left','twin-boards':'twin-boards'} as Record<string,string>)[c.primaryKind??'']??c.modeLabel;}
export function collectorRelation(_c:GameConfig,_coin:number,_collector:number,_all:readonly number[]):boolean{return true;}
export function scatterAreas(c:GameConfig):number[][]{return [Array.from({length:c.columns*c.rows},(_,p)=>p)];}
export function waysRunEligible(_c:GameConfig,start:number,_end:number):boolean{return start===0;}
export function pokerCategoryAllowed(_c:GameConfig,hand:number):boolean{return hand>=0;}
export function pokerEligible(_c:GameConfig,hand:number,_row:readonly string[]):boolean{return hand>=0;}
export function evaluateVariant(_c:GameConfig,_g:readonly string[],_bet:number):WinResult[]|undefined{return undefined;}
export function variantModeLabel(c:GameConfig,_locale='en'):string{return c.modeLabel;}
