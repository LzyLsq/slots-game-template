export const FEATURE_PROFILES:Record<string,{feature:string;title:string;steps:number;notes:readonly string[]}>={
  "golden-hour": {
    "feature": "reverse-travelling",
    "title": "RETURN EXPRESS",
    "steps": 2,
    "notes": [
      "A WILD on the rightmost reel starts the return trip.",
      "Those WILDs move one reel left per respin. Other cells redraw. Stop at the left edge; new WILDs do not join.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "jade-treasury": {
    "feature": "hold-reels",
    "title": "PLATFORM HOLD",
    "steps": 2,
    "notes": [
      "A combination win starts two platform respins.",
      "Every reel containing a winning cell is held in full, including its other symbols. Only unheld reels respin.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "pearl-palace": {
    "feature": "dual-spin",
    "title": "TWIN DEPARTURES",
    "steps": 2,
    "notes": [
      "Three scatters start two free boards.",
      "The first independent board pays at 1x; the second pays at 2x. The two boards do not share symbols or held cells.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "ruby-revel": {
    "feature": "free-multiplier",
    "title": "EXPRESS BOOST",
    "steps": 3,
    "notes": [
      "Two or more WILDs start three free spins.",
      "Each free board uses left-start Ways. Its multiplier is 2x plus its WILD count, capped at 5x. WILDs are not held and free spins cannot retrigger.",
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
