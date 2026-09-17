export const FEATURE_PROFILES:Record<string,{feature:string;title:string;steps:number;notes:readonly string[]}>={
  "golden-hour": {
    "feature": "nudge",
    "title": "HARVEST NUDGE",
    "steps": 3,
    "notes": [
      "No payline win and at least one WILD start up to three nudges. A Scatter award does not prevent this bonus.",
      "The first WILD reel moves down one cell. Only the new top symbol is drawn. Stop on the first win.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "jade-treasury": {
    "feature": "sticky-symbol",
    "title": "GOLDEN CROP HOLD",
    "steps": 2,
    "notes": [
      "Any non-Scatter win starts two respins.",
      "Winning cells stay in place; only the other cells respin. Each new board is evaluated once.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "pearl-palace": {
    "feature": "harvest-refill",
    "title": "SELECTIVE HARVEST",
    "steps": 4,
    "notes": [
      "A Ways win starts the harvest.",
      "Replace every winning symbol in place; other cells stay fixed. Stop on no Ways win or after four refills; multipliers 1x, 2x, 3x, 4x.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "ruby-revel": {
    "feature": "all-mystery",
    "title": "ORCHARD REVEAL",
    "steps": 1,
    "notes": [
      "Two or more WILDs start a mystery reveal.",
      "All WILDs become the same randomly selected regular symbol. Count matching symbols anywhere; pay only the increase over the original board award.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  }
};
export function makeLines(columns:number,rows:number,count:number):number[][]{
 const result:number[][]=[];const add=(line:number[])=>{if(!result.some(r=>r.join(',')===line.join(',')))result.push(line);};
 add(Array(columns).fill(Math.floor(rows/2)));for(let y=0;y<rows;y++)add(Array(columns).fill(y));
 add(Array.from({length:columns},(_,x)=>x%rows));add(Array.from({length:columns},(_,x)=>rows-1-x%rows));
 for(let k=0;result.length<count&&k<rows**columns;k++){let value=k;add(Array.from({length:columns},()=>{const y=value%rows;value=Math.floor(value/rows);return y;}));}
 return result.slice(0,count);
}
