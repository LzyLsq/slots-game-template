import {SaveService} from './SaveService';
import {SecureRNG} from '../core/SecureRNG';
export const FESTIVAL_IDS=['golden-otter','moon-rabbit','star-fox','cloud-elephant'] as const;
export const VOYAGE_STEPS=[3,8,15,24] as const;
export const VOYAGE_REWARDS=[400,800,1200,1600] as const;
export const festivalDay=(now=new Date())=>now.toISOString().slice(0,10);
export const festivalProgressKey=(id:string,_day?:string)=>'skyways-voyage-'+id;
/** Permanent local account voyage. Only atomically settled paid rounds count. */
export class ExpeditionService {
 constructor(private save:SaveService,private now=()=>new Date()){}
 public goal(id:string):number{return VOYAGE_STEPS[FESTIVAL_IDS.indexOf(id as any)]??Infinity;}
 public reward(id:string):number{return VOYAGE_REWARDS[FESTIVAL_IDS.indexOf(id as any)]??0;}
 public progress(id:string):number{return this.save.currentScope()?.achievements[festivalProgressKey(id)]?.progress??0;}
 public claimed(id:string):boolean{return !!this.save.currentScope()?.claims[festivalProgressKey(id)+'-leg'];}
 public paradeClaimed():boolean{return !!this.save.currentScope()?.claims['skyways-voyage-complete'];}
 public claim(id:string):boolean{
  if(!FESTIVAL_IDS.includes(id as any))return false;
  return this.award(festivalProgressKey(id)+'-leg',this.reward(id),data=>(data.achievements[festivalProgressKey(id)]?.progress??0)>=this.goal(id));
 }
 public claimParade():boolean{return this.award('skyways-voyage-complete',3200,data=>FESTIVAL_IDS.every(id=>!!data.claims[festivalProgressKey(id)+'-leg']));}
 private award(key:string,value:number,eligible:(data:NonNullable<ReturnType<SaveService['currentScope']>>)=>boolean):boolean{
  const scope=this.save.currentScope();if(!scope||scope.claims[key]||!eligible(scope))return false;let credited=false;
  this.save.update(state=>{const id=state.currentUserId;if(!id)return;const data=state.playerData[id];if(data.claims[key]||!eligible(data))return;const player=state.players[id],amount=Math.min(value,1_000_000_000-(data.pendingSpin?.bet??0)-player.credits);player.credits+=amount;data.claims[key]=this.now().toISOString();data.transactions.unshift({id:SecureRNG.id('voyage'),at:this.now().toISOString(),type:'achievement',amount,balance:player.credits,reference:key});data.transactions.splice(200);credited=true;});return credited;
 }
}
