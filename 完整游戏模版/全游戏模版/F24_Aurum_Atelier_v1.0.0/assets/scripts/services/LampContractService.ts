import { SaveService } from './SaveService';
import { canStep,collected,contractBoard,contractGoal,contractWon,CONTRACT_COST,type ContractMode,type ContractProgress } from '../math/LampContract';
import type { GameId } from '../math/types';

/** Local collectible album, including when the coin wallet is server-managed. No coin credits. */
export class LampContractService {
 public constructor(private readonly save:SaveService){}
 public progress(id:GameId):Readonly<ContractProgress>|undefined{return this.save.currentScope()?.contracts[id];}
 public start(id:GameId,mode:ContractMode,boardIndex:number):boolean {
  const user=this.save.read().currentUserId,s=this.progress(id);
  if(!user||!s||s.active||s.energy<CONTRACT_COST||!['explorer','master'].includes(mode)||!Number.isInteger(boardIndex)||boardIndex<0||boardIndex>2)return false;
  this.save.update(d=>{const p=d.playerData[user].contracts[id];p.energy-=CONTRACT_COST;p.active={board:boardIndex,mode,path:[contractBoard(id,boardIndex).start]};});return true;
 }
 public step(id:GameId,to:number):'invalid'|'moved'|'won' {
  const user=this.save.read().currentUserId,s=this.progress(id),r=s?.active;if(!user||!r)return 'invalid';
  const board=contractBoard(id,r.board);if(!canStep(board,r,to))return 'invalid';
  const next={...r,path:[...r.path,to]};
  // Do not let a premature exit strand a recoverable route.
  if(to===board.exit&&collected(board,next.path)<contractGoal(r.mode))return 'invalid';
  const won=contractWon(board,next);
  this.save.update(d=>{const p=d.playerData[user].contracts[id];if(won){p.medals[r.board]=Math.max(p.medals[r.board],r.mode==='master'?3:1);p.completed++;p.active=undefined;}else p.active=next;});
  return won?'won':'moved';
 }
 public undo(id:GameId):boolean {
  const user=this.save.read().currentUserId,r=this.progress(id)?.active;if(!user||!r||r.path.length<2)return false;
  this.save.update(d=>{d.playerData[user].contracts[id].active!.path.pop();});return true;
 }
 public reset(id:GameId):boolean {
  const user=this.save.read().currentUserId,r=this.progress(id)?.active;if(!user||!r)return false;
  this.save.update(d=>{d.playerData[user].contracts[id].active!.path=[contractBoard(id,r.board).start];});return true;
 }
 public stars():number {const all=this.save.currentScope()?.contracts;return all?Object.values(all).reduce((sum,p)=>sum+p.medals.reduce((a,b)=>a+b,0),0):0;}
}
