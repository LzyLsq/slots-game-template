export const FEATURE_PROFILES:Record<string,{feature:string;title:string;steps:number;notes:readonly string[]}>={
  "golden-hour": {
    "feature": "waterfall",
    "title": "HONEY WATERFALL",
    "steps": 3,
    "notes": [
      "A connected winning group starts three waterfall steps.",
      "Winning cells clear; survivors fall and refill from above. Stop on no win or after three drops; multipliers 1x, 2x, 4x.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "jade-treasury": {
    "feature": "up-cascade",
    "title": "NECTAR RISE",
    "steps": 1,
    "notes": [
      "A whole-board symbol-count win starts one upward refill.",
      "Winning cells clear; survivors rise and new symbols enter from below. Evaluate the new board once at 1x.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "pearl-palace": {
    "feature": "ways-cascade",
    "title": "PICNIC TUMBLE",
    "steps": 3,
    "notes": [
      "A payline win starts tumbles.",
      "Winning cells clear; survivors fall and refill from above. Stop on a losing board or after three drops; multipliers 1x to 3x.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "ruby-revel": {
    "feature": "cluster-bomb",
    "title": "HONEYCOMB BURST",
    "steps": 4,
    "notes": [
      "A collector award starts the burst.",
      "Clear winning cells and their immediate orthogonal neighbours. Survivors fall. Stop on a loss or after four bursts; multipliers 1x to 4x.",
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
