import {SaveService} from './SaveService';
import {SecureRNG} from '../core/SecureRNG';
export class ExpeditionService {
 constructor(private save:SaveService){}
 public claim(gameId:string):boolean{
  if(!['sun-lion','emerald-elephant','lotus-koi','moon-fox'].includes(gameId))return false;
  const current=this.save.currentScope(),key='journey-seal-'+gameId;
  if(!current||current.claims[key]||(current.achievements['journey-'+gameId]?.progress??0)<10)return false;
  let credited=false;
  this.save.update(state=>{const id=state.currentUserId;if(!id)return;const data=state.playerData[id];if(data.claims[key]||(data.achievements['journey-'+gameId]?.progress??0)<10)return;
   const player=state.players[id],amount=Math.min(1000,1_000_000_000-player.credits);player.credits+=amount;data.claims[key]=new Date().toISOString();data.achievements['journey-'+gameId].claimed=true;
   data.transactions.unshift({id:SecureRNG.id('seal'),at:new Date().toISOString(),type:'achievement',amount,balance:player.credits,reference:key});data.transactions.splice(200);credited=true;
  });return credited;
 }
}
