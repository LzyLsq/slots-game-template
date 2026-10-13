import {SaveService} from './SaveService';
import {SecureRNG} from '../core/SecureRNG';
export const FESTIVAL_IDS=['golden-strings','sapphire-harp','ruby-brass','pearl-rhythm'] as const;
export const festivalDay=(now=new Date())=>now.toISOString().slice(0,10);
/** Persistent paid-round repertoire: never resets at midnight. */
export const festivalProgressKey=(id:string,_day?:string)=>'repertoire-rounds-'+id;
export const REPERTOIRE_TARGETS=[6,18,36] as const;
export const REPERTOIRE_REWARDS=[600,1100,1800] as const;
export class ExpeditionService {
 constructor(private save:SaveService,private now=()=>new Date()){}
 public act():number{for(let a=0;a<3;a++)if(!this.save.currentScope()?.claims['repertoire-act-'+a+'-finale'])return a;return 2;}
 public target():number{return REPERTOIRE_TARGETS[this.act()];}
 public reward():number{return REPERTOIRE_REWARDS[this.act()];}
 public progress(id:string):number{return this.save.currentScope()?.achievements[festivalProgressKey(id)]?.progress??0;}
 public claimed(id:string):boolean{return !!this.save.currentScope()?.claims['repertoire-act-'+this.act()+'-'+id];}
 public paradeClaimed():boolean{return !!this.save.currentScope()?.claims['repertoire-act-2-finale'];}
 public claim(id:string):boolean{
  if(!FESTIVAL_IDS.includes(id as any))return false;
  const act=this.act(),key='repertoire-act-'+act+'-'+id,target=REPERTOIRE_TARGETS[act];
  return this.award(key,REPERTOIRE_REWARDS[act],data=>(data.achievements[festivalProgressKey(id)]?.progress??0)>=target);
 }
 public claimParade():boolean{
  const act=this.act();return this.award('repertoire-act-'+act+'-finale',[1200,2200,3600][act],data=>FESTIVAL_IDS.every(id=>!!data.claims['repertoire-act-'+act+'-'+id]));
 }
 private award(key:string,value:number,eligible:(data:NonNullable<ReturnType<SaveService['currentScope']>>)=>boolean):boolean{
  const scope=this.save.currentScope();if(!scope||scope.claims[key]||!eligible(scope))return false;let credited=false;
  this.save.update(state=>{const id=state.currentUserId;if(!id)return;const data=state.playerData[id];if(data.claims[key]||!eligible(data))return;const player=state.players[id],amount=Math.min(value,1_000_000_000-(data.pendingSpin?.bet??0)-player.credits);player.credits+=amount;data.claims[key]=this.now().toISOString();data.transactions.unshift({id:SecureRNG.id('repertoire'),at:this.now().toISOString(),type:'achievement',amount,balance:player.credits,reference:key});data.transactions.splice(200);credited=true;});return credited;
 }
}
