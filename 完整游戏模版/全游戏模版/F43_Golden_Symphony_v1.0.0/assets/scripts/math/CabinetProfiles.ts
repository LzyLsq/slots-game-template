export const FEATURE_PROFILES:Record<string,{feature:string;title:string;steps:number;notes:readonly string[]}>= {
 'golden-strings':{feature:'sticky-free',title:'GOLDEN ENCORE',steps:5,notes:['Three SCORE SCATTER symbols start five free spins.','New WILDs stay held for the remaining free spins. All fifteen lines are evaluated. No retriggers.','No extra stake is charged. Base and feature returns share the round limit.']},
 'sapphire-harp':{feature:'coin-vault',title:'HARP TREASURE HOLD',steps:3,notes:['Three treasure notes start three hold respins.','Notes hold; new notes reset the counter to three. Each note has a virtual coin value paid once at the end. All fifteen cells remain open.','No extra stake is charged. A full board ends the hold.']},
 'ruby-brass':{feature:'scatter-cascade',title:'BRASS CRESCENDO',steps:3,notes:['A connected group of five or more symbols starts crescendo drops.','Winning symbols clear; survivors fall. Up to three extra drops pay at 2x, 4x and 6x. A losing drop ends the feature.','Only horizontal or vertical adjacency counts. WILD substitutes; each cell pays once per board. No extra stake is charged.']},
 'pearl-rhythm':{feature:'mystery-free',title:'RHYTHM REVEAL',steps:3,notes:['Three mystery scores start three free spins.','Each spin reveals all mystery scores as one randomly selected ordinary symbol, then evaluates five lines on one board.','No extra stake is charged. Free spins do not retrigger. All awards share the round limit.']}
};
export function makeLines(columns:number,rows:number,count:number):number[][]{
 const result:number[][]=[];const add=(line:number[])=>{if(!result.some(r=>r.join(',')===line.join(',')))result.push(line);};
 add(Array(columns).fill(Math.floor(rows/2)));for(let y=0;y<rows;y++)add(Array(columns).fill(y));
 add(Array.from({length:columns},(_,x)=>x%rows));add(Array.from({length:columns},(_,x)=>rows-1-x%rows));
 for(let k=0;result.length<count&&k<rows**columns;k++){let value=k;add(Array.from({length:columns},()=>{const y=value%rows;value=Math.floor(value/rows);return y;}));}
 return result.slice(0,count);
}
