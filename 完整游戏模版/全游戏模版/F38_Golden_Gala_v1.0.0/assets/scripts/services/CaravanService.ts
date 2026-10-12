import {SaveService} from './SaveService';
import {SecureRNG} from '../core/SecureRNG';
/** Four cabinet discovery seals: settle one round per cabinet. The seal reward
 * is separate from reel odds and never depends on stake, loss or win size. */
export const CARAVAN_STOPS=[
 {id:'crown-club',name:'CROWN SEAL',rounds:1,modes:1,coins:600},
 {id:'emerald-fortune',name:'EMERALD SEAL',rounds:1,modes:1,coins:800},
 {id:'ruby-royale',name:'RUBY SEAL',rounds:1,modes:1,coins:1000},
 {id:'vault-reserve',name:'VAULT SEAL',rounds:1,modes:1,coins:1200},
] as const;
export class CaravanService {
 constructor(private save:SaveService,readonly remote=false){}
 status(){const p=this.save.currentScope()?.caravan??{rounds:0,visited:[],claimed:[]};return CARAVAN_STOPS.map(s=>{const discovered=p.visited.includes(s.id);return {...s,roundsDone:discovered?1:0,modesDone:discovered?1:0,claimed:p.claimed.includes(s.id),ready:!this.remote&&discovered&&!p.claimed.includes(s.id)};});}
 claim(id:string):number{
  const uid=this.save.read().currentUserId,stop=this.status().find(s=>s.id===id);if(!uid||!stop?.ready)return 0;
  let credited=0;this.save.update(state=>{const p=state.players[uid],data=state.playerData[uid];if(data.caravan.claimed.includes(id)||!data.caravan.visited.includes(id))return;
   credited=Math.min(stop.coins,1_000_000_000-p.credits);p.credits+=credited;data.caravan.claimed.push(id);
   data.transactions.unshift({id:SecureRNG.id('gala-seal'),at:new Date().toISOString(),type:'gala-route',amount:credited,balance:p.credits,reference:'gala-seal:'+id});data.transactions.splice(200);
  });return credited;
 }
}
