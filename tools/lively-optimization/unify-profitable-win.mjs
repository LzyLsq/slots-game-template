// One-time, guarded migration. Source changes go through apply_patch.
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const base=join(import.meta.dirname,'../../完整游戏模版/全游戏模版');
const common=[13,14,15,17,18,19,20,21,22,23,24,29,30,31,33];
function edit(file,fn){const old=readFileSync(file,'utf8'),next=fn(old);if(old===next)return;const patch='*** Begin Patch\n*** Update File: '+file+'\n@@\n'+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n'+next.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch\n';const r=spawnSync('apply_patch',[],{input:patch,encoding:'utf8',maxBuffer:4e6});if(r.status)throw Error(r.stdout+r.stderr);console.log(file);}
const profitable="  profitableTier:['Total return > this round’s stake · BIG WIN','总返还 > 本局下注 · 大奖','總返還 > 本局下注 · 大獎','返還合計 > 今回のベット・BIG WIN','총 반환액 > 이번 베팅 · BIG WIN'],";
const ordinary="  ordinaryTier:['Ordinary win · total return ≤ stake','普通中奖 · 总返还 ≤ 本局下注','普通中獎 · 總返還 ≤ 本局下注','通常当たり・返還合計 ≤ ベット','일반 당첨 · 총 반환액 ≤ 베팅'],";
const policy='export function isBigWin(total:number,bet:number):boolean{return Number.isFinite(total)&&Number.isFinite(bet)&&bet>0&&total>bet;}';
for(const id of common){
 const d=join(base,readdirSync(base).find(n=>n.startsWith(`F${id}_`)));
 if(readFileSync(join(d,'assets/scripts/ui/AureliaApp.ts'),'utf8').startsWith("import {isBigWin}"))continue;
 edit(join(d,'assets/scripts/vfx/WinPresentation.ts'),s=>{
  const four=/WIN_TIERS = \[\d+,10,50,100\]/.test(s);
  s=s.replace(/export const WIN_TIERS = \[[^\]]+\] as const;[\s\S]*?(?=const phrases=)/,`// BIG is strictly profitable; existing higher tiers remain inclusive.\nexport const WIN_TIERS = [1,${four?'10,':''}50,100] as const;\nexport function winTier(multiplier:number):number{\n  if(!Number.isFinite(multiplier))return 0;\n  return ${four?'multiplier>=100?4:multiplier>=50?3:multiplier>=10?2:':'multiplier>=100?3:multiplier>=50?2:'}multiplier>1?1:0;\n}\n${policy}\n`);
  s=s.replace(/  tiers:\[[^\n]+/,'  tiers:'+JSON.stringify(four?[
   'Win tiers: BIG >1× · SUPER BIG 10× · MEGA 50× · EPIC 100× stake. Total round return, not extra prizes.',
   '大奖分级：总奖金大于本局下注为大奖 · 超级大奖10倍 · 巨奖50倍 · 史诗100倍。仅演出分级，不额外发奖。',
   '大獎分級：總獎金大於本局下注為大獎 · 超級大獎10倍 · 巨獎50倍 · 史詩100倍。僅演出分級，不額外發獎。',
   'BIGは返還合計が今回のベットを超える場合。SUPER BIG 10倍・MEGA 50倍・EPIC 100倍。追加賞なし。',
   'BIG: 이번 베팅보다 많은 총 당첨금. SUPER BIG 10배 · MEGA 50배 · EPIC 100배. 추가 보상 없음.'
  ]:[
   'Win tiers: BIG >1× · MEGA 50× · EPIC 100× stake. Total round return, not extra prizes.',
   '大奖分级：总奖金大于本局下注为大奖 · 巨奖50倍 · 史诗100倍。仅演出分级，不额外发奖。',
   '大獎分級：總獎金大於本局下注為大獎 · 巨獎50倍 · 史詩100倍。僅演出分級，不額外發獎。',
   'BIGは返還合計が今回のベットを超える場合。MEGA 50倍・EPIC 100倍。追加賞なし。',
   'BIG: 이번 베팅보다 많은 총 당첨금. MEGA 50배 · EPIC 100배. 추가 보상 없음.'
  ])+',');
  if(!s.includes('  profitableTier:'))s=s.replace('  tier:[',profitable+'\n'+ordinary+'\n  tier:[');
  s=s.replace(/export function tierCaption\(multiplier:number\):string\{[^\n]+/,"export function tierCaption(multiplier:number):string{const tier=winTier(multiplier);if(tier===0)return p('ordinaryTier');if(tier===1)return p('profitableTier');return p('tier').replace('{n}',String(WIN_TIERS[tier-1]));}");
  return s;
 });
 edit(join(d,'assets/scripts/ui/AureliaApp.ts'),s=>{
  s="import {isBigWin} from '../vfx/WinPresentation';\n"+s;
  const signature='private async spin():Promise<void>{';
  const start=s.indexOf(signature),end=s.indexOf('\n  private ',start+signature.length);
  if(start<0||end<0)throw Error('Missing spin boundaries F'+id);
  let block=s.slice(start,end).replaceAll('this.bet','roundBet').replace(signature,signature+'\n    const roundBet=this.bet;');
  block=block.replace('winTier(result.totalWin/roundBet)>0','isBigWin(result.totalWin,roundBet)');
  block=block.replace(/this\.presentWin\((result\.totalWin[^;]+)\);/,(_,args)=>`this.presentWin(${args},roundBet);`);
  s=s.slice(0,start)+block+s.slice(end);
  const pstart=s.indexOf('private async presentWin('),pend=s.indexOf('\n  private ',pstart+1);
  let present=s.slice(pstart,pend).replaceAll('this.bet','roundBet');
  present=present.replace(/(private async presentWin\([^\n]+)(\):Promise<void>\{)/,'$1,roundBet=this.bet$2\n    big=isBigWin(amount,roundBet);');
  return s.slice(0,pstart)+present+s.slice(pend);
 });
}
// Independent application structures use exactly the same money comparison.
for(const [id,app] of [[16,'ui/AureliaApp.ts'],[25,'VelvetApp.ts'],[26,'app.js'],[27,'SovereignApp.ts']]){
 const d=join(base,readdirSync(base).find(n=>n.startsWith(`F${id}_`)&&(id!==25||n.includes('_Cocos_'))));
 const file=join(d,id===26?'src/app.js':'assets/scripts/'+app);
 if(readFileSync(file,'utf8').startsWith(id===26?'function isBigWin':'export function isBigWin'))continue;
 edit(file,s=>{
  s=(id===26?'function isBigWin(total,bet){return Number.isFinite(total)&&Number.isFinite(bet)&&bet>0&&total>bet;}':policy)+'\n'+s;
  if(id===16){
   s=s.replace('if(result.totalWin>=this.bet)await this.presentWin(result.totalWin,result.totalWin/this.bet>=10);','if(result.totalWin>0)await this.presentWin(result.totalWin,isBigWin(result.totalWin,this.bet),this.bet);');
   const start=s.indexOf('private async spin():Promise<void>{'),end=s.indexOf('\n  private ',start+1);
   if(start<0||end<0)throw Error('Missing F16 spin');
   const part=s.slice(start,end).replaceAll('this.bet','roundBet').replace('private async spin():Promise<void>{','private async spin():Promise<void>{\n    const roundBet=this.bet;');
   s=s.slice(0,start)+part+s.slice(end);
   const a=s.indexOf('private async presentWin('),b=s.indexOf('\n  private ',a+1);
   let present=s.slice(a,b).replaceAll('this.bet','roundBet').replace('amount:number,big:boolean','amount:number,big:boolean,roundBet=this.bet').replace('if(big){','big=isBigWin(amount,roundBet);\n    if(big){');
   s=s.slice(0,a)+present+s.slice(b);
  }else if(id===25){
   s=s.replace('if(r.total>=r.bet*10)await this.presentAward(r.total,false)','if(isBigWin(r.total,r.bet))await this.presentAward(r.total,false,r.bet)');
   s=s.replace('async presentAward(amount:number,ordinary=false){','async presentAward(amount:number,ordinary=false,roundBet=this.state.bet){\n ordinary=!isBigWin(amount,roundBet);');
   s=s.replace('const ratio=amount/this.state.bet,tier=','const ratio=amount/roundBet,tier=');
   s=s.replace('{ordinary:2,big:12,mega:40,epic:120}','{ordinary:.8,big:1.2,mega:40,epic:120}');
  }else if(id===26){
   s=s.replace('const token=++epoch,playingMode=mode;','const token=++epoch,playingMode=mode,roundBet=bet;');
   const a=s.indexOf('async function spinRound()'),b=s.indexOf('\nfunction celebrate(',a);
   let part=s.slice(a,b).replace('spin(mode.id,bet,','spin(mode.id,roundBet,').replace('recordSpin(bet,','recordSpin(roundBet,').replace('history.push({mode:mode.id,bet,','history.push({mode:mode.id,bet:roundBet,').replace('celebrate(lastWin,lastWin/bet>=10)','celebrate(lastWin,isBigWin(lastWin,roundBet),roundBet)');
   s=s.slice(0,a)+part+s.slice(b);
   s=s.replace('function celebrate(amount,big){soundtrack.present(amount/bet);','function celebrate(amount,big,roundBet=bet){big=isBigWin(amount,roundBet);soundtrack.present(amount/roundBet);');
   s=s.replace('celebrate(amount,amount>=1000)','celebrate(amount,isBigWin(amount,bet),bet)');
   s=s.replace('get mode(){return mode;}','get mode(){return mode;},get bet(){return bet;},isBigWin');
  }else if(id===27){
   s=s.replace('if(round.totalWin/round.bet>=10||round.feature?.wheel)','if(isBigWin(round.totalWin,round.bet))');
   s=s.replace('if(multiplier>=10||round.feature?.wheel)','if(isBigWin(round.totalWin,round.bet))');
   s=s.replace('Math.min(4,Math.floor(round.totalWin/round.bet/10))','isBigWin(round.totalWin,round.bet)?(round.totalWin/round.bet>=100?4:round.totalWin/round.bet>=50?3:round.totalWin/round.bet>=10?2:1):0');
  }
  return s;
 });
 if(id===26)edit(join(d,'src/tidal-sound.js'),s=>s.replace("ratio>=10?'big':'small'","ratio>1?'big':'small'"));
}
