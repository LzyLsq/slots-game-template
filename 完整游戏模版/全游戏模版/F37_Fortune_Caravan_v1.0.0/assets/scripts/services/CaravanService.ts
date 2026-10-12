import {SaveService} from './SaveService';
import {SecureRNG} from '../core/SecureRNG';
/** Progress rewards are separate from reel odds and are never paid in remote
 * mode until the publisher implements an authoritative route endpoint. */
export const CARAVAN_STOPS=[
 {id:'departure',name:'DEPARTURE',rounds:5,modes:1,coins:800},
 {id:'oasis',name:'OASIS',rounds:12,modes:2,coins:1600},
 {id:'bazaar',name:'BAZAAR',rounds:24,modes:3,coins:3000},
 {id:'crown',name:'CROWN PORT',rounds:40,modes:4,coins:6000},
] as const;
export class CaravanService {
 constructor(private save:SaveService,readonly remote=false){}
 status(){const p=this.save.currentScope()?.caravan??{rounds:0,visited:[],claimed:[]};return CARAVAN_STOPS.map(s=>({...s,roundsDone:p.rounds,modesDone:p.visited.length,claimed:p.claimed.includes(s.id),ready:!this.remote&&p.rounds>=s.rounds&&p.visited.length>=s.modes&&!p.claimed.includes(s.id)}));}
 claim(id:string):number{
  const uid=this.save.read().currentUserId,stop=this.status().find(s=>s.id===id);if(!uid||!stop?.ready)return 0;
  let credited=0;
  this.save.update(state=>{const p=state.players[uid],data=state.playerData[uid];if(data.caravan.claimed.includes(id)||data.caravan.rounds<stop.rounds||data.caravan.visited.length<stop.modes)return;
   credited=Math.min(stop.coins,1_000_000_000-p.credits);p.credits+=credited;data.caravan.claimed.push(id);
   data.transactions.unshift({id:SecureRNG.id('route'),at:new Date().toISOString(),type:'caravan-route',amount:credited,balance:p.credits,reference:'route:'+id});data.transactions.splice(200);
  });return credited;
 }
}
