import type {GameConfig, SpinResult, WinResult} from './types';

/** Presentation reads settled awards, never calculates or credits a second payout. */
export interface WinExplanation {grid:readonly string[];win:WinResult;round:number;multiplier:number;}
export function explainWins(result:SpinResult):WinExplanation[]{
  const entries:WinExplanation[]=result.wins.filter(w=>w.credits>0).map(win=>({grid:result.grid,win,round:0,multiplier:1}));
  for(const round of result.featureResult?.rounds??[]){
    for(const win of round.wins.filter(w=>w.credits>0))entries.push({grid:round.grid,win,round:round.index,multiplier:round.multiplier??1});
    const extra=round.credits-round.wins.reduce((sum,w)=>sum+w.credits,0);
    if(extra>0)entries.push({grid:round.grid,round:round.index,multiplier:1,win:{kind:'bonus',symbolId:round.locked?'coin':'safe',count:round.locked?Object.keys(round.locked).length:1,positions:round.locked?Object.keys(round.locked).map(Number):[],credits:extra,multiplier:1}});
  }
  return entries;
}
export function winCaption(c:GameConfig,w:WinResult,chinese=false):string{
  const symbol=c.symbols.find(s=>s.id===w.symbolId)?.label??w.symbolId;
  const kind=w.kind==='line'?(chinese?`第 ${(w.lineIndex??0)+1} 条线 · ${w.count} 连`:`LINE ${(w.lineIndex??0)+1} · ${w.count} MATCH`):w.kind==='cluster'?(chinese?`${w.count} 个相邻`:`${w.count} CONNECTED`):w.kind==='ways'?(chinese?`${w.count} 列 · ${w.ways} 路`:`${w.count} REELS · ${w.ways} WAYS`):w.kind==='scatter'?(chinese?'宝库散布奖':'VAULT SCATTERS'):(chinese?'奖励结算':'FEATURE AWARD');
  return `${kind}\n${symbol} · +${w.credits.toLocaleString('en-US')}`;
}
