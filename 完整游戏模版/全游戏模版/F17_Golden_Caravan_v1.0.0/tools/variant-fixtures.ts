import assert from 'node:assert/strict';
import type {GameConfig} from '../assets/scripts/math/types';
import {evaluateIndependent} from '../assets/scripts/math/IndependentCore';
import {primaryVariant} from '../assets/scripts/math/PrimaryRuleVariants';
/** Explicit positive and negative layouts independent of production diagrams. */
export function variantFixtures(c:GameConfig):{positive:string[];negative:string[]}{
 const size=c.columns*c.rows,symbol=c.symbols.find(s=>s.tier==='low')!.id,blank=()=>Array(size).fill('__block__'),positive=blank(),negative=blank(),put=(g:string[],positions:number[])=>positions.forEach(p=>g[p]=symbol);
 if(c.primaryKind==='line-reels'){put(positive,[0,1,2].map(x=>x*c.rows+c.paylines[0][x]));put(negative,[0,1].map(x=>x*c.rows+c.paylines[0][x]));}
 if(c.primaryKind==='any-reel-ways'||c.primaryKind==='variable-ways'){put(positive,[0,c.rows+1,2*c.rows]);put(negative,[c.rows,2*c.rows+1,3*c.rows]);}
 if(c.primaryKind==='cluster-avalanche'){put(positive,[0,1,2,c.rows,c.rows+1]);put(negative,[0,1,c.rows,c.rows+1]);}
 if(c.primaryKind==='scatter-groups'){const spots=[0,2,4,c.rows+1,c.rows+3,2*c.rows,2*c.rows+2,2*c.rows+4];put(positive,spots);put(negative,spots.slice(0,7));}
 if(c.primaryKind==='collector-grid'){const cash=c.symbols.find(s=>!['wild','scatter','bonus'].includes(s.tier))!.id;positive[0]=cash;positive[size-1]=c.wildId;negative[0]=cash;}
 if(c.primaryKind==='twin-boards'){put(positive,[1,c.rows+1,2*c.rows+1]);put(negative,[1,c.rows+4,2*c.rows+1]);}
 return {positive,negative};
}
export function assertVariant(c:GameConfig):void{
 const {positive,negative}=variantFixtures(c),bet=100000000,wins=evaluateIndependent(c,positive,bet),v=primaryVariant(c);
 assert(wins.some(w=>w.credits>0),v+' positive must award');assert.equal(evaluateIndependent(c,negative,bet).length,0,v+' counterexample must not award');
 if(c.primaryKind==='collector-grid'){const extra=positive.slice();extra[extra.length-2]=c.wildId;assert.equal(evaluateIndependent(c,extra,bet)[0].credits,wins[0].credits,'additional collectors cannot pay the same cash twice');}
 if(c.primaryKind==='scatter-groups'){const g=negative.slice();g[g.length-1]=c.wildId;assert.equal(evaluateIndependent(c,g,bet).length,0,'wild cannot complete an ordinary-symbol count');}
 if(c.primaryKind==='cluster-avalanche'){const g=Array(c.columns*c.rows).fill('__block__'),s=c.symbols.find(s=>s.tier==='low')!.id;for(let x=0;x<5;x++)g[x*c.rows+x]=s;assert.equal(evaluateIndependent(c,g,bet).length,0,'diagonal contact is not connected');}
}
