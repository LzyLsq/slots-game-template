import assert from 'node:assert/strict';
import {MemoryStorage,SaveService,createPlayerScope} from '../assets/scripts/services/SaveService';
import {LocalAuthService} from '../assets/scripts/services/LocalAuthService';
import {PlayerProfileService} from '../assets/scripts/services/PlayerProfileService';
import {EconomyService} from '../assets/scripts/services/EconomyService';
import {ExpeditionService,festivalProgressKey,REPERTOIRE_TARGETS,REPERTOIRE_REWARDS} from '../assets/scripts/services/ExpeditionService';
import {TERMS_VERSION,PRIVACY_VERSION} from '../assets/scripts/core/ReleaseConfig';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
async function main(){
 const storage=new MemoryStorage(),save=new SaveService(storage);save.acceptCompliance(TERMS_VERSION,PRIVACY_VERSION);
 const login=await new LocalAuthService(save).guestLogin();assert(login.ok&&login.player);const first=login.player.id;
 let day=new Date('2026-10-13T23:59:00Z');const now=()=>day;
 const economy=new EconomyService(save,new PlayerProfileService(save),now),album=new ExpeditionService(save,now);
 for(let act=0;act<3;act++){
  assert.equal(album.act(),act);assert.equal(album.claimParade(),false);
  for(const [m,cfg] of GAME_CONFIGS.entries()){
   assert.equal(album.claim(cfg.id),false);const cancelled=`repertoire-cancel-${act}-${m}`;
   assert(economy.reserveSpin(cancelled,30));assert(economy.cancelReservation(cancelled));
   const from=act?REPERTOIRE_TARGETS[act-1]:0;assert.equal(album.progress(cfg.id),from);
   for(let n=from;n<REPERTOIRE_TARGETS[act];n++){
    const id=`repertoire-round-${m}-${n}`;assert(economy.reserveSpin(id,30));assert(economy.settleSpin(id,60,cfg.id));assert.equal(economy.settleSpin(id,60,cfg.id),false);assert.equal(album.progress(cfg.id),n+1);
    if(n<REPERTOIRE_TARGETS[act]-1)assert.equal(album.claim(cfg.id),false);
   }
   const before=economy.balance();assert(album.claim(cfg.id));assert.equal(economy.balance(),before+REPERTOIRE_REWARDS[act]);assert.equal(album.claim(cfg.id),false);
  }
  const before=economy.balance();assert(album.claimParade());assert.equal(economy.balance(),before+[1200,2200,3600][act]);
  if(act===2)assert.equal(album.claimParade(),false);
 }
 const reloaded=new ExpeditionService(new SaveService(storage),now);assert(reloaded.paradeClaimed());
 day=new Date('2026-10-14T00:00:00Z');for(const c of GAME_CONFIGS){assert.equal(album.progress(c.id),36);assert(album.claimed(c.id));assert.equal(album.claim(c.id),false);}
 const balance=economy.balance();save.update(s=>{s.players.second={...s.players[first],id:'second',credits:1000};s.playerData.second=createPlayerScope();s.currentUserId='second';});assert.equal(album.act(),0);assert.equal(album.progress('golden-strings'),0);assert.equal(album.claim('golden-strings'),false);
 save.update(s=>{s.currentUserId=first});assert.equal(economy.balance(),balance);assert.equal(album.claim('not-a-mode'),false);
 save.update(s=>{s.players[first].credits=999999990});assert(economy.reserveSpin('repertoire-cap-pending',30));assert(economy.credit(1000,'achievement','cap-reward'));assert.equal(economy.balance(),999999970);assert.equal(save.currentScope()!.transactions[0].amount,10);assert.equal(economy.recoverPending(),30);assert.equal(economy.balance(),1000000000);assert.equal(economy.recoverPending(),0);
 save.update(s=>{s.players[first].credits=999999950});assert(economy.reserveSpin('repertoire-cap-settle',30));assert(economy.settleSpin('repertoire-cap-settle',500,'golden-strings'));assert.equal(economy.balance(),1000000000);assert.equal(save.currentScope()!.transactions[0].amount,80);assert.equal(save.currentScope()!.achievements[festivalProgressKey('golden-strings')].progress,36);
 console.log('PASS repertoire: three act gates, settlement-only progress, duplicate claims, reload and midnight persistence, account isolation, capped ledger and pending refund.');
}void main();
