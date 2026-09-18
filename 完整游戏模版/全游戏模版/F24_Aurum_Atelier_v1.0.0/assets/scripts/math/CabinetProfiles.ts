export const FEATURE_PROFILES:Record<string,{feature:string;title:string;steps:number;notes:readonly string[]}>= {
 'golden-hour':{feature:'mint-stamp',title:'SOVEREIGN STAMP',steps:1,notes:[
  'A WILD on the middle reel activates the minting press after the base five-line award.',
  'The middle reel becomes three WILDs. Re-evaluate the same five paylines and pay only each line’s positive increase over its original award. The two outside reels stay fixed; there is no extra wager or fresh spin.',
  'The combined base and bonus win is capped by the displayed round maximum. A fully WILD middle reel can activate the stamp but has no additional payout if no line improves.'
 ]},
 'jade-treasury':{feature:'prism-free',title:'PRISM FREE SPINS',steps:6,notes:[
  'Three or more SCATTER seals anywhere trigger exactly six free spins. The triggering board pays its normal ways and scatter awards first.',
  'Each free spin draws a fresh 5×4 board and pays 1024 left-start ways at 2×. WILDs do not stay fixed. SCATTERs in free spins neither pay nor retrigger; six free spins always finish the feature.',
  'No additional wager is taken. The displayed round maximum caps the combined trigger and all free-spin awards.'
 ]},
 'pearl-palace':{feature:'link-respin',title:'LOCKED GOLD LINKS',steps:12,notes:[
  'Three or more BONUS gold coin stacks anywhere trigger hold-and-respin. The ordinary cash-plus-collector award is settled first; it is not replayed during this bonus.',
  'Each triggering coin stack locks a value selected equally from 0.5×, 1×, 2× or 5× total bet, multiplied by the payout factor. Begin with three chances. Respin only unlocked positions; new coin stacks lock their values and reset chances to three.',
  'End after three misses, a full 15-cell board, or 12 respins. Collect every locked value once at the end; filling the board adds no separate jackpot. Fractional values carry between coin stacks so displayed integer values equal the final collection. No extra wager is taken, and the round win maximum applies.'
 ]},
 'ruby-revel':{feature:'forge-cascade',title:'MASTERWORK CASCADE',steps:4,notes:[
  'A group of six or more identical symbols connected horizontally or vertically pays and starts the forge cascade. Diagonal contact does not connect groups.',
  'Remove the winning cells, let surviving symbols fall in their original order, and refill from above. New qualifying groups pay 2× on drop one, 3× on drop two, 5× on drop three and 8× on drop four.',
  'Stop when the new board has no qualifying group or after four drops. Every board is evaluated once; no extra wager is taken. WILDs join ordinary groups and are removed when they win. The combined base and cascade awards share the round maximum.'
 ]}
};
/** Retained for config authoring; the shipped five-line game uses traditionalLines(). */
export function makeLines(columns:number,rows:number,count:number):number[][]{
 const result:number[][]=[];const add=(line:number[])=>{if(!result.some(r=>r.join(',')===line.join(',')))result.push(line);};
 add(Array(columns).fill(Math.floor(rows/2)));for(let y=0;y<rows;y++)add(Array(columns).fill(y));
 add(Array.from({length:columns},(_,x)=>x%rows));add(Array.from({length:columns},(_,x)=>rows-1-x%rows));
 for(let k=0;result.length<count&&k<rows**columns;k++){let value=k;add(Array.from({length:columns},()=>{const y=value%rows;value=Math.floor(value/rows);return y;}));}return result.slice(0,count);
}
