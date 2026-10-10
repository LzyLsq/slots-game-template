export const FEATURE_PROFILES:Record<string,{feature:string;title:string;steps:number;notes:readonly string[]}>= {
 'sun-lion':{feature:'sticky-free',title:'SUN FREE SPINS',steps:5,notes:['Three or more Sun Scatters start five free spins.','New WILD lions stay in place for the remaining free spins. Each spin evaluates all 20 paylines. Scatters do not retrigger.','No additional bet is charged. All base and feature awards share the round win limit.']},
 'emerald-elephant':{feature:'coin-vault',title:'JUNGLE RESERVE',steps:3,notes:['Three or more leaf BONUS idols start the Jungle Reserve.','The BONUS idols hold for three respins. New idols reset the counter to three. Each idol receives a virtual coin value; the collected total pays once at the end.','No additional bet is charged. The WILD collector collects cash coins in base play; the reserve separately pays BONUS idol values.']},
 'lotus-koi':{feature:'waterfall',title:'LOTUS WATERFALL',steps:3,notes:['A winning connected group starts the Lotus Waterfall.','Winning symbols clear; survivors fall and new symbols enter from above. Up to three extra drops evaluate connected groups at 1x, 2x and 4x. A losing drop ends the feature.','Only horizontal and vertical contact connects a group. No extra bet is charged. All drops share the round limit.']},
 'moon-fox':{feature:'mystery-free',title:'LANTERN REVEALS',steps:3,notes:['Three or more moon SCATTER idols start three free spins.','Each spin reveals all moon idols as one randomly selected ordinary symbol. The centre payline is evaluated after the reveal; no revealed idol remains as a second symbol.','No extra bet is charged and the free spins cannot retrigger. All awards share the round win limit.']}
};
export function makeLines(columns:number,rows:number,count:number):number[][]{
 const result:number[][]=[];const add=(line:number[])=>{if(!result.some(r=>r.join(',')===line.join(',')))result.push(line);};
 add(Array(columns).fill(Math.floor(rows/2)));for(let y=0;y<rows;y++)add(Array(columns).fill(y));
 add(Array.from({length:columns},(_,x)=>x%rows));add(Array.from({length:columns},(_,x)=>rows-1-x%rows));
 for(let k=0;result.length<count&&k<rows**columns;k++){let value=k;add(Array.from({length:columns},()=>{const y=value%rows;value=Math.floor(value/rows);return y;}));}
 return result.slice(0,count);
}
