import assert from 'node:assert/strict';
import { PRIVACY_VERSION, TERMS_VERSION } from '../assets/scripts/core/ReleaseConfig';
import { SeededRNG } from '../assets/scripts/core/SeededRNG';
import { COIN_CAROUSEL, GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';
import { isIntroJackpot, shouldForceIntroJackpot } from '../assets/scripts/math/IntroJackpot';
import { winTier } from '../assets/scripts/vfx/WinPresentation';
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
  assert.equal(shouldForceIntroJackpot(0,false),false);assert.equal(shouldForceIntroJackpot(1,false),false);assert.equal(shouldForceIntroJackpot(2,false),false);assert.equal(shouldForceIntroJackpot(3,false),false);assert.equal(shouldForceIntroJackpot(4,false),true);assert.equal(shouldForceIntroJackpot(4,true),false);assert.equal(shouldForceIntroJackpot(5,false),true);
  const bet=COIN_CAROUSEL.bets[0],generator=new ResultGenerator(),account=await makeAccount();let jackpotCount=0;
  for(let spin=0;spin<5;spin++){
    const player=account.save.read().players[account.save.read().currentUserId!],scope=account.save.currentScope()!;
    const forced=shouldForceIntroJackpot(player.gamesPlayed,scope.introSuperAwarded);
    const result=generator.generate(COIN_CAROUSEL,bet,new SeededRNG(9100+spin),forced?{winTier:'mega'}:undefined);
    settledSpin(account.economy,`welcome-spin-${spin}-0001`,bet,result.totalWin);if(isIntroJackpot(result.totalWin,bet))jackpotCount++;
  }
  assert(jackpotCount>=1,'one of the first five settled spins must be SUPER (50×) or higher');
  assert.equal(account.save.read().players[account.save.read().currentUserId!].gamesPlayed,5);assert.equal(account.save.currentScope()!.introSuperAwarded,true);
  const restored=new SaveService(account.storage);assert.equal(restored.currentScope()!.introSuperAwarded,true,'welcome award state must survive reload');
  assert.equal(shouldForceIntroJackpot(restored.read().players[restored.read().currentUserId!].gamesPlayed,restored.currentScope()!.introSuperAwarded),false,'the sixth spin must not be forced');

  // Explicitly exhaust four non-winning settlements; the fifth is forced,
  // recorded as a real payout and never re-forced on the sixth.
  const fallback=await makeAccount();
  for(let n=0;n<4;n++)settledSpin(fallback.economy,`unlucky-${n}-round`,bet,0);
  assert.equal(fallback.save.currentScope()!.introSuperAwarded,false);
  assert.equal(shouldForceIntroJackpot(fallback.save.read().players[fallback.save.read().currentUserId!].gamesPlayed,false),true);
  const last=generator.generate(COIN_CAROUSEL,bet,new SeededRNG(42),{winTier:'mega'});
  assert(isIntroJackpot(last.totalWin,bet));settledSpin(fallback.economy,'fifth-guaranteed-round',bet,last.totalWin);
  assert.equal(fallback.save.currentScope()!.introSuperAwarded,true);
  assert.equal(shouldForceIntroJackpot(5,true),false);
  for(const game of GAME_CONFIGS){
    const stake=game.bets[0],result=generator.generate(game,stake,new SeededRNG(13),{winTier:'mega'});
    assert(isIntroJackpot(result.totalWin,stake),`${game.id} must pay and present a genuine SUPER win`);
  }

  const natural=await makeAccount();settledSpin(natural.economy,'natural-big-win-0001',bet,bet*10);assert.equal(natural.save.currentScope()!.introSuperAwarded,false,'BIG must not consume the SUPER guarantee');
  settledSpin(natural.economy,'natural-super-win-0001',bet,bet*50);assert.equal(natural.save.currentScope()!.introSuperAwarded,true);
  settledSpin(natural.economy,'natural-followup-0002',bet,0);assert.equal(shouldForceIntroJackpot(4,natural.save.currentScope()!.introSuperAwarded),false,'an earlier natural SUPER win must satisfy the promise');

  assert.equal(winTier(2),0);assert.equal(winTier(10),1);assert.equal(winTier(50),2);assert.equal(winTier(100),3);
  // Old BIG-only welcome flag must not count as the new SUPER award.
  const legacy=await makeAccount();for(let n=0;n<4;n++)settledSpin(legacy.economy,`legacy-${n}-round`,bet,n===0?bet*10:0);
  const old=JSON.parse(legacy.storage.getItem('fortune-carnival-f31.cocos.save.v1')!);const id=old.currentUserId;old.playerData[id].introJackpotAwarded=true;delete old.playerData[id].introSuperAwarded;legacy.storage.setItem('fortune-carnival-f31.cocos.save.v1',JSON.stringify(old));
  const migrated=new SaveService(legacy.storage);assert.equal(migrated.currentScope()!.introSuperAwarded,false);assert.equal(shouldForceIntroJackpot(4,migrated.currentScope()!.introSuperAwarded),true);
  const cancelled=await makeAccount();assert.equal(cancelled.economy.reserveSpin('cancelled-welcome-0001',bet),true);assert.equal(cancelled.economy.cancelReservation('cancelled-welcome-0001'),true);
  assert.equal(cancelled.save.read().players[cancelled.save.read().currentUserId!].gamesPlayed,0);assert.equal(cancelled.save.currentScope()!.introSuperAwarded,false,'cancelled spins must not consume the guarantee');
  console.log(JSON.stringify({status:'PASS',firstFiveJackpots:jackpotCount,persisted:true,cancelSafe:true},null,2));
};
void main();
