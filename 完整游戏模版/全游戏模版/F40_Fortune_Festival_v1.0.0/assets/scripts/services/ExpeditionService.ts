import {SaveService} from './SaveService';
import {SecureRNG} from '../core/SecureRNG';
export const FESTIVAL_IDS=['golden-phoenix','jade-dragon','pearl-qilin','amber-panda'] as const;
export const festivalDay=(now=new Date())=>now.toISOString().slice(0,10);
export const festivalProgressKey=(id:string,day=festivalDay())=>'festival-'+day+'-'+id;
/** Local UTC-day album. Stamps are credited once, atomically, per account/day. */
export class ExpeditionService {
 constructor(private save:SaveService,private now=()=>new Date()){}
 public progress(id:string):number{return this.save.currentScope()?.achievements[festivalProgressKey(id,festivalDay(this.now()))]?.progress??0;}
 public claimed(id:string):boolean{return !!this.save.currentScope()?.claims[festivalProgressKey(id,festivalDay(this.now()))+'-stamp'];}
 public paradeClaimed():boolean{return !!this.save.currentScope()?.claims['festival-'+festivalDay(this.now())+'-parade'];}
 public claim(id:string):boolean{
  if(!FESTIVAL_IDS.includes(id as any))return false;
  const day=festivalDay(this.now()),key=festivalProgressKey(id,day)+'-stamp';
  return this.award(key,400,data=>(data.achievements[festivalProgressKey(id,day)]?.progress??0)>=5);
 }
 public claimParade():boolean{
  const day=festivalDay(this.now());return this.award('festival-'+day+'-parade',1600,data=>FESTIVAL_IDS.every(id=>!!data.claims[festivalProgressKey(id,day)+'-stamp']));
 }
 private award(key:string,value:number,eligible:(data:NonNullable<ReturnType<SaveService['currentScope']>>)=>boolean):boolean{
  const scope=this.save.currentScope();if(!scope||scope.claims[key]||!eligible(scope))return false;let credited=false;
  this.save.update(state=>{const id=state.currentUserId;if(!id)return;const data=state.playerData[id];if(data.claims[key]||!eligible(data))return;const player=state.players[id],amount=Math.min(value,1_000_000_000-(data.pendingSpin?.bet??0)-player.credits);player.credits+=amount;data.claims[key]=this.now().toISOString();data.transactions.unshift({id:SecureRNG.id('festival'),at:this.now().toISOString(),type:'achievement',amount,balance:player.credits,reference:key});data.transactions.splice(200);credited=true;});return credited;
 }
}
