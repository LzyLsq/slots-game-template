export const FEATURE_PROFILES:Record<string,{feature:string;trigger?:'three-scatters'|'three-wilds';title:string;steps:number;notes:readonly string[]}>={
  "golden-hour": {
    "feature": "fortune-upgrade",
    "title": "CAISHEN BLESSING",
    "steps": 1,
    "notes": [
      "Three or more WILDs trigger one upgrade.",
      "The most numerous regular symbol upgrades one tier; ties follow the payout list. Count matching symbols anywhere with no WILD substitution. Only the increase over the previous board award pays.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ],
    "trigger": "three-wilds"
  },
  "jade-treasury": {
    "feature": "all-mystery",
    "title": "ELF WISH REVEAL",
    "steps": 1,
    "notes": [
      "Two or more mystery coins start a reveal.",
      "All mystery coins become the same randomly selected regular symbol. Evaluate edge-connected clusters; pay only the increase over the original board award.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "pearl-palace": {
    "feature": "scatter-cascade",
    "title": "LOTUS RIPPLES",
    "steps": 4,
    "notes": [
      "A collector award starts lotus cascades.",
      "All winning groups clear; survivors fall and refill. Stop on a loss or after four drops. Multipliers are 2x, 4x, 6x, 8x.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ]
  },
  "ruby-revel": {
    "feature": "forge-upgrade",
    "title": "SPIRIT REFINING",
    "steps": 3,
    "notes": [
      "Three or more WILDs in open positions start refining.",
      "The most numerous regular symbol advances one tier per step, up to three steps or the highest tier. Re-evaluate variable-height Ways; pay only award increases. If the selected symbol is already at the highest tier, no upgrade occurs and no extra award is added.",
      "Bonus rounds require no additional bet. The round win limit applies to the combined base and bonus awards."
    ],
    "trigger": "three-wilds"
  }
};
export function makeLines(columns:number,rows:number,count:number):number[][]{
 const result:number[][]=[];const add=(line:number[])=>{if(!result.some(r=>r.join(',')===line.join(',')))result.push(line);};
 add(Array(columns).fill(Math.floor(rows/2)));for(let y=0;y<rows;y++)add(Array(columns).fill(y));
 add(Array.from({length:columns},(_,x)=>x%rows));add(Array.from({length:columns},(_,x)=>rows-1-x%rows));
 for(let k=0;result.length<count&&k<rows**columns;k++){let value=k;add(Array.from({length:columns},()=>{const y=value%rows;value=Math.floor(value/rows);return y;}));}
 return result.slice(0,count);
}
