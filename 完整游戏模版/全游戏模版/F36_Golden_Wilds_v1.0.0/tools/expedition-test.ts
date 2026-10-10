import assert from 'node:assert/strict';
import {MemoryStorage,SaveService,createPlayerScope} from '../assets/scripts/services/SaveService';
import {LocalAuthService} from '../assets/scripts/services/LocalAuthService';
import {PlayerProfileService} from '../assets/scripts/services/PlayerProfileService';
import {EconomyService} from '../assets/scripts/services/EconomyService';
import {ExpeditionService} from '../assets/scripts/services/ExpeditionService';
import {TERMS_VERSION,PRIVACY_VERSION} from '../assets/scripts/core/ReleaseConfig';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
async function main(){
 const storage=new MemoryStorage(),save=new SaveService(storage);save.acceptCompliance(TERMS_VERSION,PRIVACY_VERSION);
 const login=await new LocalAuthService(save).guestLogin();assert(login.ok&&login.player);const first=login.player.id;
 let economy=new EconomyService(save,new PlayerProfileService(save)),passport=new ExpeditionService(save);
 for(const [m,cfg] of GAME_CONFIGS.entries()){
  const key='journey-'+cfg.id;assert.equal(passport.claim(cfg.id),false);
  const cancelled=`expedition-cancelled-${m}`;assert(economy.reserveSpin(cancelled,30));assert(economy.cancelReservation(cancelled));assert.equal(save.currentScope()!.achievements[key]?.progress??0,0,'refunds must not earn stamps');
  for(let n=0;n<10;n++){
   const spinId=`expedition-round-${m}-${n}`;assert(economy.reserveSpin(spinId,30));assert(economy.settleSpin(spinId,60,cfg.id));assert.equal(economy.settleSpin(spinId,60,cfg.id),false,'duplicate settlement must not advance passport');
   assert.equal(save.currentScope()!.achievements[key].progress,n+1);if(n<9)assert.equal(passport.claim(cfg.id),false);
  }
  const before=economy.balance();assert(passport.claim(cfg.id));assert.equal(economy.balance(),before+1000);assert.equal(passport.claim(cfg.id),false);assert.equal(economy.balance(),before+1000);
 }
 const reloaded=new SaveService(storage),again=new ExpeditionService(reloaded);for(const c of GAME_CONFIGS)assert.equal(again.claim(c.id),false,'reload must preserve claimed seals');
 const balance=economy.balance();save.update(s=>{s.players['second-account']={...s.players[first],id:'second-account',credits:1000};s.playerData['second-account']=createPlayerScope();s.currentUserId='second-account';});
 assert.equal(passport.claim('sun-lion'),false,'other account cannot use first account stamps');assert.equal(economy.balance(),1000);assert.equal(save.currentScope()!.achievements['journey-sun-lion'],undefined);
 save.update(s=>{s.currentUserId=first});assert.equal(economy.balance(),balance);assert.equal(passport.claim('not-a-mode'),false);
 console.log('PASS passport: four mode settlements, refunds, duplicate payout/stamps/claims, reload and account isolation.');
}void main();
