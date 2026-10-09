import type {GameConfig} from './types';
/** Payline positions follow the actual left-to-right settlement order. */
export function rulePaths(c:GameConfig):number[][]{
 if(c.primaryKind==='twin-boards')return [0,1].flatMap(panel=>c.paylines.map(line=>line.map((y,x)=>x*c.rows+y+panel*3)));
 if(c.primaryKind==='line-reels')return c.paylines.map(line=>line.map((y,x)=>x*c.rows+y));
 return [];
}
/** Show a valid traditional winning shape using real symbol positions. */
export function ruleExample(c:GameConfig):number[]{
 const paths=rulePaths(c);if(paths.length)return paths[0];
 const all=Array.from({length:c.columns*c.rows},(_,p)=>p),min=c.minimumCluster??5;
 if(c.primaryKind==='scatter-groups')return all.slice().sort((a,b)=>(a%c.rows)-(b%c.rows)||Math.floor(a/c.rows)-Math.floor(b/c.rows)).slice(0,min);
 if(c.primaryKind==='cluster-avalanche')return Array.from({length:min},(_,i)=>Math.floor(i/2)*c.rows+i%2);
 if(c.primaryKind==='collector-grid'){
  const collector=Math.floor(c.columns/2)*c.rows+Math.floor(c.rows/2);
  return [collector,...all.filter(p=>p!==collector&&((Math.floor(p/c.rows)+p%c.rows)%2===0)).slice(0,6)];
 }
 return Array.from({length:Math.min(3,c.columns)},(_,x)=>x*c.rows);
}
