import assert from 'node:assert/strict';
import { PRIVACY_VERSION, TERMS_VERSION } from '../assets/scripts/core/ReleaseConfig';
import { SeededRNG } from '../assets/scripts/core/SeededRNG';
import { COIN_CAROUSEL } from '../assets/scripts/math/GameConfigs';
import { isIntroJackpot, shouldForceIntroJackpot } from '../assets/scripts/math/IntroJackpot';
import { ResultGenerator } from '../assets/scripts/math/ResultGenerator';
import { EconomyService } from '../assets/scripts/services/EconomyService';
import { LocalAuthService } from '../assets/scripts/services/LocalAuthService';
import { PlayerProfileService } from '../assets/scripts/services/PlayerProfileService';
import { MemoryStorage, SaveService } from '../assets/scripts/services/SaveService';

const makeAccount=async(storage=new MemoryStorage())=>{
  const save=new SaveService(storage);save.acceptCompliance(TERMS_VERSION,PRIVACY_VERSION);const auth=new LocalAuthService(save);assert.equal((await auth.guestLogin()).ok,true);
  const economy=new EconomyService(save,new PlayerProfileService(save));return {save,economy,storage};
};
const settledSpin=(economy:EconomyService,id:string,bet:number,win:number):void=>{assert.equal(economy.reserveSpin(id,bet),true);assert.equal(economy.settleSpin(id,win),true);};

const main=async():Promise<void>=>{
  assert.equal(shouldForceIntroJackpot(0,false),false);assert.equal(shouldForceIntroJackpot(1,false),false);assert.equal(shouldForceIntroJackpot(2,false),true);assert.equal(shouldForceIntroJackpot(2,true),false);assert.equal(shouldForceIntroJackpot(3,false),false);
  const bet=COIN_CAROUSEL.bets[0],generator=new ResultGenerator(),account=await makeAccount();let jackpotCount=0;
  for(let spin=0;spin<3;spin++){
    const player=account.save.read().players[account.save.read().currentUserId!],scope=account.save.currentScope()!;
    const forced=shouldForceIntroJackpot(player.gamesPlayed,scope.introJackpotAwarded);
    const result=generator.generate(COIN_CAROUSEL,bet,new SeededRNG(9100+spin),forced?{winTier:'big'}:undefined);
    settledSpin(account.economy,`welcome-spin-${spin}-0001`,bet,result.totalWin);if(isIntroJackpot(result.totalWin,bet))jackpotCount++;
  }
  assert(jackpotCount>=1,'one of the first three settled spins must be BIG or higher');
  assert.equal(account.save.read().players[account.save.read().currentUserId!].gamesPlayed,3);assert.equal(account.save.currentScope()!.introJackpotAwarded,true);
  const restored=new SaveService(account.storage);assert.equal(restored.currentScope()!.introJackpotAwarded,true,'welcome award state must survive reload');
  assert.equal(shouldForceIntroJackpot(restored.read().players[restored.read().currentUserId!].gamesPlayed,restored.currentScope()!.introJackpotAwarded),false,'the fourth spin must not be forced');

  const natural=await makeAccount();settledSpin(natural.economy,'natural-big-win-0001',bet,bet*10);assert.equal(natural.save.currentScope()!.introJackpotAwarded,true);
  settledSpin(natural.economy,'natural-followup-0002',bet,0);assert.equal(shouldForceIntroJackpot(2,natural.save.currentScope()!.introJackpotAwarded),false,'an earlier natural BIG win must satisfy the promise');

  const cancelled=await makeAccount();assert.equal(cancelled.economy.reserveSpin('cancelled-welcome-0001',bet),true);assert.equal(cancelled.economy.cancelReservation('cancelled-welcome-0001'),true);
  assert.equal(cancelled.save.read().players[cancelled.save.read().currentUserId!].gamesPlayed,0);assert.equal(cancelled.save.currentScope()!.introJackpotAwarded,false,'cancelled spins must not consume the guarantee');
  console.log(JSON.stringify({status:'PASS',firstThreeJackpots:jackpotCount,persisted:true,cancelSafe:true},null,2));
};
void main();
