export const FEATURE_PROFILES:Record<string,{feature:string;title:string;steps:number;notes:readonly string[]}>= {
 'golden-otter':{feature:'nudge',title:'GOLDEN NUDGE',steps:2,notes:['A losing centre line with a visible WILD starts the golden nudge.','The first reel containing a WILD moves down by one cell, up to twice. Only the centre line is evaluated; a paid nudge ends the feature.','No extra stake is charged. Airships are decorative in this cabinet.']},
 'moon-rabbit':{feature:'travelling-wild',title:'MOONLIGHT VOYAGE',steps:4,notes:['At least one WILD on the first reel starts the moonlight voyage.','The WILD rows on the first reel travel one reel right on each free respin, until the fifth reel. Every free respin evaluates all 243 ways.','No extra stake is charged. Airships are decorative in this cabinet.']},
 'star-fox':{feature:'waterfall',title:'CONSTELLATION CASCADE',steps:3,notes:['A paid adjacent group starts the constellation cascade.','Winning cells clear, survivors fall and new symbols arrive from above. Up to three extra drops pay at 1x, 2x and 4x. A losing drop ends the feature.','Diagonal cells do not connect. No extra stake is charged. Airships are decorative.']},
 'cloud-elephant':{feature:'coin-vault',title:'CLOUD CARGO HOLD',steps:3,notes:['Three or more treasure airships start three cargo-hold respins.','Airships lock. New airships reset the counter to three, with at most eight respins. Each held cargo pays its virtual coin value once at the end.','No extra stake is charged. Cargo rounds do not evaluate ordinary paylines. All returns share the paid-round cap.']}
};
export function makeLines(columns:number,rows:number,count:number):number[][]{
 const result:number[][]=[];const add=(line:number[])=>{if(!result.some(r=>r.join(',')===line.join(',')))result.push(line);};
 add(Array(columns).fill(Math.floor(rows/2)));for(let y=0;y<rows;y++)add(Array(columns).fill(y));
 add(Array.from({length:columns},(_,x)=>x%rows));add(Array.from({length:columns},(_,x)=>rows-1-x%rows));
 for(let k=0;result.length<count&&k<rows**columns;k++){let value=k;add(Array.from({length:columns},()=>{const y=value%rows;value=Math.floor(value/rows);return y;}));}
 return result.slice(0,count);
}
