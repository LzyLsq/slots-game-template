/** Golden Encore's independent, pure-TS outcome engine. Coordinates are grid[column][row]. */
export type SymbolId = 0|1|2|3|4|5|6|7|8;
export type Board = SymbolId[][];
export type Tier = 'none'|'ordinary'|'big'|'super';
export interface RandomSource { next():number; }
export interface WelcomeProgress { spins:number; bigSeen:boolean; superSeen:boolean; }
export interface Way { symbol:SymbolId; length:number; ways:number; credits:number; }
export interface Round {
  stake:number; spotlight:number; primary:Board; encore?:Board; held?:{column:number; row:number; symbol:SymbolId};
  primaryWays:Way[]; encoreWays:Way[]; primaryAward:number; encoreAward:number; award:number;
  tier:Tier; progress:WelcomeProgress;
}
export const WIDTH=5, HEIGHT=4, CROWN:SymbolId=4;
export const STAKES=[50,100,200,500] as const;
const WEIGHTS=[13,13,11,10,6,10,10,9,10] as const;
const TOTAL_WEIGHT=WEIGHTS.reduce((a,b)=>a+b,0);
const PAY:readonly [number,number,number][]= [
  [40,160,600],[35,140,520],[32,130,480],[45,180,660],
  [30,120,450],[33,135,500],[36,145,540],[38,150,560],[32,130,480]
];
const assert=(condition:boolean,reason:string):void=>{if(!condition)throw new Error(reason);};
export function pickSymbol(random:RandomSource):SymbolId {
  const value=random.next();assert(Number.isFinite(value)&&value>=0&&value<1,'RNG must return [0,1)');
  let roll=Math.floor(value*TOTAL_WEIGHT);
  for(let i=0;i<WEIGHTS.length;i++){roll-=WEIGHTS[i];if(roll<0)return i as SymbolId;}
  return 8;
}
export function randomBoard(random:RandomSource):Board {
  return Array.from({length:WIDTH},()=>Array.from({length:HEIGHT},()=>pickSymbol(random)));
}
export function evaluate(board:Board,stake:number):Way[] {
  assert(board.length===WIDTH&&board.every(c=>c.length===HEIGHT&&c.every(n=>Number.isInteger(n)&&n>=0&&n<=8)),'Invalid 5x4 board');
  assert(Number.isSafeInteger(stake)&&stake>0,'Invalid stake');
  const results:Way[]=[];
  for(let symbol=0;symbol<9;symbol++){
    let length=0,ways=1;
    for(const col of board){const count=col.filter(value=>value===symbol).length;if(count===0)break;ways*=count;length++;}
    if(length>=3){const credits=Math.floor(stake*PAY[symbol][length-3]*ways/100);results.push({symbol:symbol as SymbolId,length,ways,credits});}
  }
  return results;
}
export function tierFor(award:number,stake:number):Tier {
  if(award>=stake*50)return 'super';
  if(award>=stake*15)return 'big';
  return award>0?'ordinary':'none';
}
/** No fabricated payout: onboarding patterns modify real boards, then the ordinary evaluator pays them. */
function guarantee(board:Board,kind:'big'|'super'):void {
  const reach=kind==='super'?5:4;
  for(let column=0;column<WIDTH;column++){
    for(let row=0;row<HEIGHT;row++){
      if(board[column][row]===0)board[column][row]=1;
      if(board[column][row]===CROWN)board[column][row]=6;
    }
    if(column<reach){board[column][0]=0;board[column][1]=0;}
  }
  // A large welcome pattern should not be accidentally changed into a five-column run.
  if(kind==='big')for(let row=0;row<HEIGHT;row++)if(board[4][row]===0)board[4][row]=1;
}
export function createRound(random:RandomSource,stake:number,spotlight:number,previous:WelcomeProgress):Round {
  assert(STAKES.includes(stake as typeof STAKES[number]),'Unsupported stake');
  assert(Number.isInteger(spotlight)&&spotlight>=0&&spotlight<WIDTH,'Choose a spotlight column');
  assert(Number.isSafeInteger(previous.spins)&&previous.spins>=0,'Invalid welcome progress');
  const primary=randomBoard(random);
  if(previous.spins===9&&!previous.superSeen)guarantee(primary,'super');
  else if(previous.spins===4&&!previous.bigSeen)guarantee(primary,'big');
  const primaryWays=evaluate(primary,stake);
  const primaryAward=primaryWays.reduce((sum,way)=>sum+way.credits,0);
  let encore:Board|undefined,held:Round['held'],encoreWays:Way[]=[],encoreAward=0;
  const crowns=primary.flat().filter(s=>s===CROWN).length;
  if(crowns>=3){
    const options=primary[spotlight].map((symbol,row)=>({symbol,row})).filter(item=>item.symbol!==CROWN);
    const best=options.sort((a,b)=>PAY[b.symbol][2]-PAY[a.symbol][2]||a.row-b.row)[0];
    if(best){
      held={column:spotlight,row:best.row,symbol:best.symbol};
      encore=randomBoard(random);
      encore[spotlight][best.row]=best.symbol;
      encoreWays=evaluate(encore,stake);
      encoreAward=encoreWays.reduce((sum,way)=>sum+way.credits,0);
    }
  }
  const award=Math.min(stake*250,primaryAward+encoreAward);
  const tier=tierFor(award,stake);
  const progress={spins:previous.spins+1,bigSeen:previous.bigSeen||tier==='big'||tier==='super',superSeen:previous.superSeen||tier==='super'};
  return {stake,spotlight,primary,encore,held,primaryWays,encoreWays,primaryAward,encoreAward,award,tier,progress};
}
export class SeededRandom implements RandomSource {
  constructor(private state:number){this.state=state>>>0||0x9e3779b9;}
  next():number {let v=this.state;v^=v<<13;v^=v>>>17;v^=v<<5;this.state=v>>>0;return this.state/4294967296;}
}
export const INITIAL_WELCOME:WelcomeProgress={spins:0,bigSeen:false,superSeen:false};
