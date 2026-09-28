export const FEATURE_PROFILES:Record<string,{feature:string;title:string;steps:number;notes:readonly string[]}>={
  "coin-press": {
    "feature": "vine-spread",
    "title": "RISING PRESS",
    "steps": 3,
    "notes": [
      "Any WILD activates up to three rising press steps.",
      "A WILD imprint advances one cell upward in its own reel at each step. It never crosses a reel; only increased awards pay.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "lantern-ledger": {
    "feature": "win-to-wild",
    "title": "LANTERN RELIGHT",
    "steps": 1,
    "notes": [
      "A connected-cluster win relights the matching cells as WILD.",
      "All winning cells become WILD. Re-evaluate edge-connected clusters; pay only the increase over the original board award.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "cloud-conveyor": {
    "feature": "free-count-cascade",
    "title": "CLOUD CARGO RUN",
    "steps": 5,
    "notes": [
      "Three or more SCATTER symbols start five free runs with whole-board symbol-count awards.",
      "Each spin starts at 1x. Winning symbols clear and survivors fall; up to three extra drops pay at 2x, 3x and 4x. A losing board ends that spin; the next spin resets to 1x. Free spins cannot retrigger.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "jubilee-vault": {
    "feature": "waterfall",
    "title": "JUBILEE CASCADE",
    "steps": 4,
    "notes": [
      "A winning combination starts the jubilee cascade.",
      "Winning cells clear and survivors fall. Stop on a loss or after four drops. Drop multipliers are 1x, 2x, 4x, 8x.",
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
