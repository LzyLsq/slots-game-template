export const FEATURE_PROFILES:Record<string,{feature:string;title:string;steps:number;notes:readonly string[]}>={
  "golden-hour": {
    "feature": "vertical-drift",
    "title": "RISING CLOUDS",
    "steps": 3,
    "notes": [
      "Any non-Scatter win starts three cloud shifts.",
      "Open cells move up one position; draw a new bottom symbol on each reel. Closed cells stay unchanged. Each board pays once.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "jade-treasury": {
    "feature": "reel-expand",
    "title": "SKY PILLARS",
    "steps": 1,
    "notes": [
      "Any WILD starts the sky expansion.",
      "All open cells on a reel containing an open WILD become WILD. Closed cells stay unchanged. Pay only the award increase.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "pearl-palace": {
    "feature": "mystery-right",
    "title": "CLOUD GEM REVEAL",
    "steps": 1,
    "notes": [
      "Two or more mystery coins start a reveal.",
      "All mystery coins become the same randomly selected regular symbol. Evaluate edge-connected clusters; pay only the increase over the original board award.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "ruby-revel": {
    "feature": "up-cascade",
    "title": "CLOUD ASCENT",
    "steps": 4,
    "notes": [
      "A winning combination starts rising cascades.",
      "Winning cells vanish. Survivors rise and new symbols enter from below. Stop on a loss or after four refills; multipliers 1x to 4x.",
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
