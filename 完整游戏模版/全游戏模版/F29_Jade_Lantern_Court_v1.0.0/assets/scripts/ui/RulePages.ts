import {Node} from 'cc';
import type {GameConfig} from '../math/types';
import {primaryRuleText} from '../math/PrimaryRuleText';
import {ruleAwardText,formatRuleReference,ruleAllCounts} from '../math/PaytableDisplay';
import {coreSymbols} from '../math/CoreGame';
import {symbolAtlas,SYMBOL_ART} from '../math/GameConfigs';
import {tierRules} from '../vfx/WinPresentation';
import {SalonArt,COLORS} from './SalonArt';
import {language,tr} from './Language';
import {ruleTextPages,readableRuleText as copy,readableRuleButtons} from './RuleText';
const pick=(a:readonly string[])=>a[['en','zh-CN','zh-TW','ja','ko'].indexOf(language())]??a[0];
type Page={title:string;body?:string;counts?:number[];symbols?:string[]};
export function drawRulePages(parent:Node,c:GameConfig,art:SalonArt,bet:number,requested:number,features:boolean,notes:readonly string[],change:(page:number)=>void,payoutFirst=false):void{
 let firstPayout=0;
 const pages:Page[]=[],add=(title:string,value:string)=>{for(const body of ruleTextPages(value))pages.push({title,body});};
 const how=pick(['WINNING CONDITIONS','中奖条件','中獎條件','当選条件','당첨 조건']),formula=pick(['HOW AWARDS ARE CALCULATED','奖金如何计算','獎金如何計算','配当の計算方法','배당 계산 방법']);
 if(features){notes.forEach((note,i)=>add(pick(['BONUS RULES','奖励玩法','獎勵玩法','ボーナスルール','보너스 규칙'])+' · '+(i+1),note));}
 else{
  const rules=primaryRuleText(c,language());add(how,rules[0]);add(formula,rules[1]);
  firstPayout=pages.length;
  if(c.primaryKind==='collector-grid'){
   add(pick(['CASH COLLECTION','现金收集','現金收集','キャッシュ回収','캐시 수집']),pick(['REFERENCE COINS / CASH SYMBOL','每个现金符号的参考金币','每個現金符號的參考金幣','キャッシュ1個の参考コイン','캐시 1개당 참고 코인'])+'\n'+formatRuleReference(bet*.15*c.payoutScale)+'\n'+pick(['Round the collected total once, not each symbol.','现金合计后取整，不逐个取整。','現金合計後取整，不逐個取整。','個別ではなく回収合計を四捨五入。','개별이 아닌 수집 합계를 한 번 반올림합니다.']));
  }else{
   const counts=ruleAllCounts(c),ids=coreSymbols(c),maxDigits=Math.max(...ids.flatMap(id=>counts.map(count=>ruleAwardText(c,id,count,bet).length))),columns=maxDigits>10?1:maxDigits>6?2:3;
   for(let col=0;col<counts.length;col+=columns)for(let row=0;row<ids.length;row+=5)pages.push({title:(c.payMode==='ways'?pick(['REFERENCE COINS / WAY','每个组合的参考金币','每個組合的參考金幣','1組合せの参考コイン','조합당 참고 코인']):c.primaryKind==='cluster-avalanche'?pick(['COINS / WINNING GROUP','每组中奖金币','每組中獎金幣','当選1グループのコイン','당첨 그룹당 코인']):c.primaryKind==='scatter-groups'?pick(['COINS / SYMBOL TYPE','每种符号的中奖金币','每種符號的中獎金幣','シンボル1種類のコイン','기호 종류당 코인']):pick(['COINS / WINNING LINE','每条中奖线的金币','每條中獎線的金幣','当選1ラインのコイン','당첨 라인당 코인']))+'\n'+pick(['TOTAL BET ','总投注 ','總投注 ','総ベット ','총 베팅 '])+bet.toLocaleString('en-US'),counts:counts.slice(col,col+columns),symbols:ids.slice(row,row+5)});
  }
 }
 add(pick(['WIN CELEBRATIONS','中奖演出','中獎演出','当選演出','당첨 연출']),tierRules());
 const scatter=c.scatterId?Object.entries(c.paytable[c.scatterId]??{}).filter(([count])=>Number(count)<=c.columns).map(([count,mult],i,entries)=>count+(i===entries.length-1?'+':'')+' = '+Math.round(bet*mult*c.payoutScale).toLocaleString('en-US')).join('\n'):'';
 if(scatter)add('SCATTER',pick(['Anywhere on the board','全盘任意位置','全盤任意位置','盤面のどこでも','보드 어디에서나'])+'\n'+scatter+'\n'+tr('COINS'));
 add(pick(['ROUND LIMITS','单局限制','單局限制','ラウンド上限','라운드 제한']),tr('Round cap '+(bet*c.maxWinMultiplier).toLocaleString('en-US')+' · All awards rounded')+'\n\n'+tr('Virtual coins · No cash-out'));
 const target=payoutFirst&&!features?firstPayout:requested,index=((target%pages.length)+pages.length)%pages.length,page=pages[index];
 for(const [i,line]of ruleTextPages(page.title,2,770,38)[0].split('\n').entries())copy(parent,line,0,440-i*49,790,55,38,COLORS.gold);
 if(page.body){
  const icon=c.symbols.find(s=>!['wild','scatter','bonus'].includes(s.tier))?.id;
  if(icon)art.image(parent,symbolAtlas(c.id),0,265,142,142,SYMBOL_ART[icon]??0);
  copy(parent,page.body,0,-92,790,520,38);
 }else{
  const counts=page.counts!,ids=page.symbols!,cellWidth=counts.length===1?540:counts.length===2?245:180,xs=counts.map((_,i)=>counts.length===1?95:counts.length===2?-100+i*360:-120+i*210);
  counts.forEach((count,i)=>copy(parent,count+'×',xs[i],295,180,67,42,COLORS.gold));
  ids.forEach((id,i)=>{const y=174-i*118;art.image(parent,symbolAtlas(c.id),-326,y,90,90,SYMBOL_ART[id]);counts.forEach((count,j)=>copy(parent,ruleAwardText(c,id,count,bet),xs[j],y,cellWidth,80,44));});
 }
 art.button(parent,'Previous rule page',-300,-516,155,95,'‹',undefined,()=>change(index-1));art.button(parent,'Next rule page',300,-516,155,95,'›',undefined,()=>change(index+1));
 copy(parent,`${index+1} / ${pages.length}`,0,-516,330,66,38,COLORS.gold);
 copy(parent,ruleTextPages(pick(['Use the arrows for every rule and payout','点击箭头查看全部规则与赔付','點擊箭頭查看全部規則與賠付','矢印ですべてのルールと配当を確認','화살표로 모든 규칙과 배당 확인']),2,760,34)[0],0,-619,795,96,34);
 readableRuleButtons(parent);
}
