import type {WinResult} from './types';
/** Largest remainder allocation: round the full spin once, without RNG or wallet state. */
export function roundAwards(wins:readonly WinResult[]):WinResult[]{
 const values=wins.map(w=>w.rawCredits??w.credits);
 if(values.some(v=>!Number.isFinite(v)||v<0))throw new Error('Invalid unrounded award');
 const credits=values.map(Math.floor),target=Math.round(values.reduce((a,b)=>a+b,0));
 let remaining=target-credits.reduce((a,b)=>a+b,0);
 const order=values.map((v,i)=>({i,fraction:v-credits[i]})).sort((a,b)=>b.fraction-a.fraction||a.i-b.i);
 for(const {i} of order){if(remaining<=0)break;credits[i]++;remaining--;}
 return wins.map(({rawCredits,...w},i)=>({...w,credits:credits[i]}));
}
