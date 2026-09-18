import { chargeContract } from '../math/LampContract';
import { GAME_CONFIG_BY_ID } from '../math/GameConfigs';
import type { GameId, SpinResult } from '../math/types';
import { SaveService } from './SaveService';

/** Persist before dispatch; ambiguous responses must reuse the identical request. */
export class RemoteSpinJournal {
  public constructor(private readonly save:SaveService){}
  public pending(){return this.save.currentScope()?.pendingRemoteSpin;}
  public begin(requestId:string,gameId:GameId,bet:number):void{
    const id=this.save.read().currentUserId;
    if(!id||!GAME_CONFIG_BY_ID[gameId]||!Number.isSafeInteger(bet)||bet<=0||!/^[a-z0-9-]{12,128}$/i.test(requestId))throw new Error('Invalid round reservation.');
    const pending=this.pending();
    if(pending){if(pending.requestId!==requestId||pending.gameId!==gameId||pending.bet!==bet)throw new Error('Recover your previous round first.');return;}
    if(!GAME_CONFIG_BY_ID[gameId].bets.includes(bet))throw new Error('Unsupported new bet.');
    this.save.update(s=>{s.playerData[id].pendingRemoteSpin={requestId,gameId,bet};});
  }
  public reject(requestId:string):void{
    const id=this.save.read().currentUserId;if(!id||this.pending()?.requestId!==requestId)return;
    this.save.update(s=>{s.playerData[id].pendingRemoteSpin=undefined;});
  }
  public settle(requestId:string,result:SpinResult,balance:number):void{
    const id=this.save.read().currentUserId,pending=this.pending();
    if(!id||!pending||pending.requestId!==requestId)throw new Error('Round confirmation does not match.');
    const config=GAME_CONFIG_BY_ID[pending.gameId as GameId];
    const credits=(v:number,max=1_000_000_000)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
    if(!result||result.gameId!==pending.gameId||!credits(balance)||!credits(result.totalWin,pending.bet*config.maxWinMultiplier)||!credits(result.baseWin)||!credits(result.featureWin)||result.totalWin!==result.baseWin+result.featureWin||!Array.isArray(result.grid)||result.grid.length!==config.columns*config.rows||!result.grid.every(symbol=>config.symbols.some(s=>s.id===symbol))||!Array.isArray(result.wins))throw new Error('Incomplete round confirmation. Retry to retrieve your settled round.');
    this.save.update(s=>{
      const scope=s.playerData[id],player=s.players[id];
      const before=player.credits;player.credits=balance;scope.pendingRemoteSpin=undefined;
      if(scope.settledSpinIds.includes(requestId))return;
      scope.settledSpinIds.push(requestId);scope.settledSpinIds=scope.settledSpinIds.slice(-200);
      chargeContract(scope.contracts,result);
      player.gamesPlayed++;player.totalWin+=result.totalWin;player.biggestWin=Math.max(player.biggestWin,result.totalWin);player.experience+=10;player.level=1+Math.floor(player.experience/100);
      scope.transactions.unshift({id:requestId,at:new Date().toISOString(),type:'balance-sync',amount:balance-before,balance,reference:requestId});scope.transactions.splice(200);
    });
  }
}
