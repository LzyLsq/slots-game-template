import type {SpinResult, WinResult} from './types';

/** Published onboarding offer, applied to settled account rounds across every cabinet.
 * A welcome award is a separate, visible bonus; it is never claimed to be a reel match.
 * BIG = total return >= 10x stake; SUPER = >= 50x. Super counts as big.
 */
export interface WelcomeProgress { readonly completed: number; readonly bigSeen: boolean; readonly superSeen: boolean; }
export function awardBand(result:SpinResult, bet:number):0|1|2 {
  return result.totalWin >= bet*50 ? 2 : result.totalWin >= bet*10 ? 1 : 0;
}
export function applyWelcomeAward(result:SpinResult, bet:number, maxMultiplier:number, progress:WelcomeProgress):SpinResult {
  if(!Number.isSafeInteger(bet)||bet<=0||!Number.isSafeInteger(progress.completed)||progress.completed<0)return result;
  const next=progress.completed+1;
  // On round 5, first secure BIG. On round 10, secure SUPER. Natural wins qualify.
  const target=next===10&&!progress.superSeen?50:next===5&&!progress.bigSeen?10:0;
  if(!target||result.totalWin>=bet*target)return result;
  const cap=Math.min(bet*maxMultiplier,50_000_000);
  const extra=Math.min(bet*target-result.totalWin,cap-result.totalWin);
  if(!Number.isSafeInteger(extra)||extra<=0)throw new Error('Welcome award cannot fit the payout cap');
  const bonus:WinResult={kind:'bonus',symbolId:'welcome-treasure',count:1,multiplier:extra/bet,credits:extra,positions:[]};
  return {...result,wins:[...result.wins,bonus],baseWin:result.baseWin+extra,totalWin:result.totalWin+extra,welcomeAward:{tier:target===50?'super':'big',credits:extra}};
}
