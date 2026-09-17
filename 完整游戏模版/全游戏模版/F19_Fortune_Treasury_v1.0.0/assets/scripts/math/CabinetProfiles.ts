export const FEATURE_PROFILES:Record<string,{feature:string;trigger?:'three-scatters'|'three-wilds';title:string;steps:number;notes:readonly string[]}>={
  "golden-hour": {
    "feature": "coin-vault",
    "title": "NINE-LOCK VAULT",
    "steps": 3,
    "notes": [
      "Three or more bonus coins start three respin chances.",
      "Coins lock with values of 0.25x, 0.5x or 1x bet times the feature factor. Only empty cells respin; a new coin resets chances to three. Collect once at zero chances or a full board.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "jade-treasury": {
    "feature": "key-respin",
    "title": "VAULT KEYS",
    "steps": 2,
    "notes": [
      "A Ways win starts two key respins.",
      "Reel two is entirely WILD on the first respin. Reel three is entirely WILD on the second. Other cells redraw each time.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "pearl-palace": {
    "feature": "symbol-collector",
    "title": "COLLECTOR SAFE",
    "steps": 3,
    "notes": [
      "Three or more Scatters start the collector.",
      "The most numerous regular symbol is held; ties follow the payout list. No minimum regular-symbol count is required to start. New matching symbols reset three chances. Values of 0.25x, 0.5x or 1x bet times the feature factor are collected once at zero chances or a full board.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ],
    "trigger": "three-scatters"
  },
  "ruby-revel": {
    "feature": "mystery-cross",
    "title": "TREASURY CROSS",
    "steps": 1,
    "notes": [
      "Any WILD triggers the treasury cross.",
      "The row and column of the first WILD become WILD. Only the award increase pays; other cells stay unchanged.",
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
