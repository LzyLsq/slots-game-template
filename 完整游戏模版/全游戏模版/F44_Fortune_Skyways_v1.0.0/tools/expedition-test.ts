import assert from 'node:assert/strict';
import {MemoryStorage,SaveService,createPlayerScope} from '../assets/scripts/services/SaveService';
import {LocalAuthService} from '../assets/scripts/services/LocalAuthService';
import {PlayerProfileService} from '../assets/scripts/services/PlayerProfileService';
import {EconomyService} from '../assets/scripts/services/EconomyService';
import {ExpeditionService,festivalProgressKey,VOYAGE_STEPS,VOYAGE_REWARDS} from '../assets/scripts/services/ExpeditionService';
import {TERMS_VERSION,PRIVACY_VERSION} from '../assets/scripts/core/ReleaseConfig';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
async function main(){
 const storage=new MemoryStorage(),save=new SaveService(storage);save.acceptCompliance(TERMS_VERSION,PRIVACY_VERSION);
 const login=await new LocalAuthService(save).guestLogin();assert(login.ok&&login.player);const first=login.player.id;
 let day=new Date('2026-10-10T23:59:00Z');const now=()=>day;
 const economy=new EconomyService(save,new PlayerProfileService(save),now),album=new ExpeditionService(save,now);
 assert.equal(album.claimParade(),false);
 for(const [m,cfg] of GAME_CONFIGS.entries()){
  assert.equal(album.claim(cfg.id),false);
  const cancelled=`festival-cancelled-${m}`;assert(economy.reserveSpin(cancelled,30));assert(economy.cancelReservation(cancelled));assert.equal(album.progress(cfg.id),0);
  for(let n=0;n<VOYAGE_STEPS[m]+1;n++){
   const spinId=`festival-round-${m}-${n}`;assert(economy.reserveSpin(spinId,30));assert(economy.settleSpin(spinId,60,cfg.id));assert.equal(economy.settleSpin(spinId,60,cfg.id),false);
   assert.equal(album.progress(cfg.id),Math.min(24,n+1));if(n<VOYAGE_STEPS[m]-1)assert.equal(album.claim(cfg.id),false);
  }
  const before=economy.balance();assert(album.claim(cfg.id));assert.equal(economy.balance(),before+VOYAGE_REWARDS[m]);assert.equal(album.claim(cfg.id),false);
 }
 const before=economy.balance();assert(album.claimParade());assert.equal(economy.balance(),before+3200);assert.equal(album.claimParade(),false);
 const reloaded=new ExpeditionService(new SaveService(storage),now);assert(reloaded.paradeClaimed());for(const c of GAME_CONFIGS)assert.equal(reloaded.claim(c.id),false);
 day=new Date('2026-10-11T00:00:00Z');for(const c of GAME_CONFIGS){assert(album.progress(c.id)>=album.goal(c.id));assert.equal(album.claimed(c.id),true);}assert.equal(album.claimParade(),false);
 const balance=economy.balance();save.update(s=>{s.players['second-account']={...s.players[first],id:'second-account',credits:1000};s.playerData['second-account']=createPlayerScope();s.currentUserId='second-account';});
 assert.equal(album.claim('golden-otter'),false);assert.equal(economy.balance(),1000);
 save.update(s=>{s.currentUserId=first});assert.equal(economy.balance(),balance);assert.equal(album.claim('not-a-mode'),false);
 // Preserve the reserved stake even if another feature fills the wallet.
 save.update(s=>{s.players[first].credits=999999990});assert(economy.reserveSpin('festival-cap-pending',30));assert(economy.credit(1000,'achievement','cap-reward'));assert.equal(economy.balance(),999999970);
 assert.equal(save.currentScope()!.transactions[0].amount,10);assert.equal(economy.recoverPending(),30);assert.equal(economy.balance(),1000000000);assert.equal(economy.recoverPending(),0);
 save.update(s=>{s.players[first].credits=999999950});assert(economy.reserveSpin('festival-cap-settle',30));assert(economy.settleSpin('festival-cap-settle',500,'golden-otter'));assert.equal(economy.balance(),1000000000);assert.equal(save.currentScope()!.transactions[0].amount,80);
 assert.equal(save.currentScope()!.achievements[festivalProgressKey('golden-otter','2026-10-11')].progress,5);
 console.log('PASS permanent voyage: settlement-only progress, duplicate protection, four independent goals/final chest, reload, UTC rollover preserves voyage, account isolation, cap ledger and pending refund.');
}void main();
