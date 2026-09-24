export const FEATURE_PROFILES:Record<string,{feature:string;title:string;steps:number;notes:readonly string[]}>={
  "golden-hour": {
    "feature": "vine-spread",
    "title": "PENDULUM ADVANCE",
    "steps": 3,
    "notes": [
      "Any WILD starts up to three pendulum steps.",
      "WILD advances upward one cell per step within its own reel. It does not spread sideways. Only increased awards pay.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "jade-treasury": {
    "feature": "win-to-wild",
    "title": "MINTED WILDS",
    "steps": 1,
    "notes": [
      "A payline win starts a minted WILD transformation.",
      "All winning cells become WILD. Re-evaluate the fifteen active paylines; pay only the increase over the original board award.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "pearl-palace": {
    "feature": "free-count-cascade",
    "title": "HOURGLASS FREE TUMBLES",
    "steps": 5,
    "notes": [
      "Three or more Scatters start five free spins with 1,024-way wins.",
      "Each spin starts at 1x. Winning symbols clear and survivors fall; up to three extra drops pay at 2x, 3x and 4x. A losing board ends that spin; the next spin resets to 1x. Free spins cannot retrigger.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "ruby-revel": {
    "feature": "waterfall",
    "title": "GEAR CASCADE",
    "steps": 4,
    "notes": [
      "A winning combination starts the waterfall.",
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
