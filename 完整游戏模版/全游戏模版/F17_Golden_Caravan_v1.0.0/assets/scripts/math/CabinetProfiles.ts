export const FEATURE_PROFILES:Record<string,{feature:string;trigger?:'three-scatters'|'three-wilds';title:string;steps:number;notes:readonly string[]}>={
  "golden-hour": {
    "feature": "horizontal-drift",
    "title": "CARAVAN CROSSING",
    "steps": 2,
    "notes": [
      "Any non-Scatter win starts two crossings.",
      "Move all reels one position left and draw the rightmost reel. Evaluate the displayed paylines on each new board at 1x.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "jade-treasury": {
    "feature": "mystery-free",
    "title": "MERCHANT MYSTERIES",
    "steps": 4,
    "notes": [
      "Three or more mystery coins start four free spins.",
      "On each free spin, all mystery coins reveal the same random regular symbol. Count matching symbols anywhere after the reveal; each final board pays once at 1x. Free spins cannot retrigger.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "pearl-palace": {
    "feature": "symbol-upgrade",
    "title": "CARGO APPRAISAL",
    "steps": 2,
    "notes": [
      "Three or more Scatters in open positions trigger appraisal.",
      "The most numerous regular symbol upgrades one tier each step, up to two steps. Ties follow the payout list. Only increased awards pay.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ],
    "trigger": "three-scatters"
  },
  "ruby-revel": {
    "feature": "route-delivery",
    "title": "TRADE ROUTES",
    "steps": 3,
    "notes": [
      "A connected-cluster win starts three deliveries.",
      "Move reels left and draw a new rightmost reel. Evaluate matching groups connected through shared edges; diagonal contact does not connect. Multipliers are 1x, 2x, 3x.",
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
