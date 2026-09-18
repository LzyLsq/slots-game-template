import type { GameId, SpinResult } from './types';

export const CONTRACT_GAMES: readonly GameId[] = ['golden-hour','jade-treasury','pearl-palace','ruby-revel'];
export const CONTRACT_TARGETS: Record<GameId,string> = {'golden-hour':'bell','jade-treasury':'key','pearl-palace':'pearl','ruby-revel':'ruby'};
export const CONTRACT_COST = 8;
export type ContractMode = 'explorer'|'master';
export interface ContractRun { board: number; mode: ContractMode; path: number[]; }
export interface ContractProgress { energy: number; completed: number; medals: number[]; active?: ContractRun; }
export type ContractSave = Record<GameId,ContractProgress>;
export interface ContractBoard { start:number; exit:number; relics:number[]; walls:number[]; }
// Each map has a verified route collecting all three relics in at most ten moves.
const MAPS: readonly ContractBoard[] = [
 {start:12,exit:15,relics:[4,1,7],walls:[0,9,14]},
 {start:12,exit:3,relics:[13,6,1],walls:[8,10,15]},
 {start:0,exit:15,relics:[8,13,6],walls:[1,5,3]},
];
export function contractBoard(gameId:GameId,index:number):ContractBoard {
 const source=MAPS[index%3],theme=CONTRACT_GAMES.indexOf(gameId);
 const turn=(n:number)=>{let x=n%4,y=Math.floor(n/4);for(let i=0;i<theme;i++){const old=x;x=3-y;y=old;}return y*4+x;};
 return {start:turn(source.start),exit:turn(source.exit),relics:source.relics.map(turn),walls:source.walls.map(turn)};
}
export const contractGoal=(mode:ContractMode)=>mode==='master'?3:2;
export const contractLimit=(mode:ContractMode)=>mode==='master'?10:12;
export const adjacent=(a:number,b:number)=>Math.abs(a%4-b%4)+Math.abs(Math.floor(a/4)-Math.floor(b/4))===1;
export const collected=(board:ContractBoard,path:readonly number[])=>board.relics.filter(n=>path.includes(n)).length;
export function canStep(board:ContractBoard,run:ContractRun,to:number):boolean {
 return Number.isInteger(to)&&to>=0&&to<16&&!board.walls.includes(to)&&!run.path.includes(to)&&adjacent(run.path[run.path.length-1],to)&&run.path.length-1<contractLimit(run.mode);
}
export function contractWon(board:ContractBoard,run:ContractRun):boolean {
 return run.path[run.path.length-1]===board.exit&&collected(board,run.path)>=contractGoal(run.mode);
}
export const newContracts=():ContractSave=>Object.fromEntries(CONTRACT_GAMES.map(id=>[id,{energy:8,completed:0,medals:[0,0,0]}])) as ContractSave;
export function normalizeContracts(value:unknown):ContractSave {
 const next=newContracts(),raw=(value&&typeof value==='object'?value:{}) as Record<string,unknown>;
 const integer=(n:unknown,fallback:number,max:number)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0?Math.min(max,n):fallback;
 for(const id of CONTRACT_GAMES){
  const v=raw[id] as Partial<ContractProgress>|undefined;if(!v||typeof v!=='object')continue;
  const s=next[id];s.energy=integer(v.energy,8,24);s.completed=integer(v.completed,0,1000000);
  s.medals=Array.from({length:3},(_,i)=>integer(v.medals?.[i],0,3));
  const r=v.active;if(!r||!Number.isInteger(r.board)||r.board<0||r.board>2||!['explorer','master'].includes(r.mode)||!Array.isArray(r.path))continue;
  const board=contractBoard(id,r.board),run:ContractRun={board:r.board,mode:r.mode,path:[board.start]};
  if(r.path[0]!==board.start||r.path.length>contractLimit(r.mode)+1)continue;
  let valid=true;for(const step of r.path.slice(1)){if(!canStep(board,run,step)){valid=false;break;}run.path.push(step);}
  if(valid&&!contractWon(board,run))s.active=run;
 }
 return next;
}
/** Cosmetic progression only. Called inside the same transaction as a settled spin. */
export function chargeContract(save:ContractSave,result:Pick<SpinResult,'gameId'|'grid'>):void {
 const target=CONTRACT_TARGETS[result.gameId],s=save[result.gameId];if(!s)return;
 const gain=1+Math.min(2,result.grid.filter(id=>id===target).length);s.energy=Math.min(24,s.energy+gain);
}
