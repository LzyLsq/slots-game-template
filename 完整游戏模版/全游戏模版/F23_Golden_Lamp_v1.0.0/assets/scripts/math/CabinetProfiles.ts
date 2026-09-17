export const FEATURE_PROFILES:Record<string,{feature:string;title:string;steps:number;notes:readonly string[]}>={
  "golden-hour": {
    "feature": "cash-collect",
    "title": "LAMP CASH COLLECTION",
    "steps": 3,
    "notes": [
      "A cash-collection win starts three free respins.",
      "Collectors stay fixed; all other cells redraw. Each cash symbol receives 0.5x, 1x or 2x bet times the feature factor, collected once per collector on that respin. New collectors remain for the remaining respins; cash does not lock. The starting board is not paid again.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "jade-treasury": {
    "feature": "sticky-reset",
    "title": "GENIE RESPIN CHAIN",
    "steps": 3,
    "notes": [
      "Two or more WILDs start three sticky-WILD respin chances.",
      "WILDs stay fixed. A newly landed WILD resets chances to three, up to ten total respins. Each new board pays once using the displayed paylines; stop when chances reach zero or ten respins finish.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "pearl-palace": {
    "feature": "sync-reels",
    "title": "MIRRORED WISH",
    "steps": 1,
    "notes": [
      "Any WILD starts one synchronized respin.",
      "Draw a fresh board, choose one reel at random, then copy its complete symbol strip to every reel. Evaluate left-start Ways once.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "ruby-revel": {
    "feature": "sticky-cascade",
    "title": "ENCHANTED EMBERS",
    "steps": 4,
    "notes": [
      "A whole-board symbol-count win starts cascades.",
      "Winning regular symbols clear; WILDs remain and fall with the survivors but do not substitute in count wins. Refill from above. Stop on no count win or after four drops; multipliers 1x, 2x, 3x, 4x.",
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
