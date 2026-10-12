export const FEATURE_PROFILES:Record<string,{feature:string;title:string;steps:number;notes:readonly string[]}>= {
 'golden-phoenix':{feature:'sticky-free',title:'PHOENIX FLIGHT',steps:5,notes:['Three or more lantern SCATTER symbols start five free spins.','New WILDs stay held for the remaining free spins. All ten lines are evaluated. Scatters do not retrigger.','No extra stake is charged. Base and feature returns share the round limit.']},
 'jade-dragon':{feature:'coin-vault',title:'JADE TREASURE HOLD',steps:3,notes:['Three or more lantern SCATTER symbols in open cells start three treasure-hold respins.','Lanterns hold. New lanterns reset the counter to three. Closed cells never receive treasures. Each lantern has a virtual coin value, paid once at the end.','No extra stake is charged. The open reel heights stay fixed throughout this round.']},
 'pearl-qilin':{feature:'scatter-cascade',title:'PEARL CELEBRATION',steps:3,notes:['A paid group of eight or more identical symbols starts celebration drops.','Winning symbols clear; survivors fall and new symbols enter from above. Up to three extra drops pay at 2x, 4x and 6x. A losing drop ends the feature.','Groups count anywhere; adjacency is not required. WILD pays only as its own symbol. No extra stake is charged.']},
 'amber-panda':{feature:'mystery-free',title:'PANDA LANTERN REVEAL',steps:3,notes:['Three lantern SCATTER symbols across both boards start three free spins.','Each spin reveals all lanterns as one randomly selected ordinary symbol. Both boards evaluate their own five lines with half the stake.','No extra stake is charged; free spins do not retrigger. All awards share the round limit.']}
};
export function makeLines(columns:number,rows:number,count:number):number[][]{
 const result:number[][]=[];const add=(line:number[])=>{if(!result.some(r=>r.join(',')===line.join(',')))result.push(line);};
 add(Array(columns).fill(Math.floor(rows/2)));for(let y=0;y<rows;y++)add(Array(columns).fill(y));
 add(Array.from({length:columns},(_,x)=>x%rows));add(Array.from({length:columns},(_,x)=>rows-1-x%rows));
 for(let k=0;result.length<count&&k<rows**columns;k++){let value=k;add(Array.from({length:columns},()=>{const y=value%rows;value=Math.floor(value/rows);return y;}));}
 return result.slice(0,count);
}
