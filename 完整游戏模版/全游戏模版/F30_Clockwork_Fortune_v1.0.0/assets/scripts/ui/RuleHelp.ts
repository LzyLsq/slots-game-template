import {ruleTextPages,readableRuleText,readableRuleArrow} from './RuleText';
import {SYMBOL_ART,symbolAtlas} from '../math/GameConfigs';
import {primaryRuleText} from '../math/PrimaryRuleText';
import {Color,Graphics,Node} from 'cc';
import type {GameConfig} from '../math/types';
import {rulePaths,ruleExample} from '../math/RuleGeometry';
import {CORE_DESCRIPTIONS} from '../math/CoreGame';
import {SalonArt,box,text,COLORS} from './SalonArt';
import {language,tr} from './Language';
const pick=(values:readonly string[])=>values[['en','zh-CN','zh-TW','ja','ko'].indexOf(language())]??values[0];
export const helpTitle=()=>pick(['HOW TO PLAY','玩法图解','玩法圖解','遊び方','플레이 방법']);
export function drawRuleHelp(parent:Node,c:GameConfig,art:SalonArt,page:number,change:(page:number)=>void):void{
 const paths=rulePaths(c),pathCount=Math.max(1,paths.length),index=((page%pathCount)+pathCount)%pathCount,positions=paths[index]??ruleExample(c);
 text(parent,c.name,0,448,820,58,35,COLORS.jade,true);
 const w=620,h=300,cw=w/c.columns,ch=h/c.rows,diagram=box(parent,'Actual rule diagram',62,222,w,h),g=diagram.addComponent(Graphics);
 const regular=c.symbols.filter(s=>!['wild','scatter','bonus'].includes(s.tier)).map(s=>s.id);
 const xy=(p:number)=>[-w/2+(Math.floor(p/c.rows)+.5)*cw,h/2-(p%c.rows+.5)*ch];
 g.fillColor=new Color(48,35,24,205);g.roundRect(-w/2,-h/2,w,h,14);g.fill();
 for(let p=0;p<c.columns*c.rows;p++){
  const [x,y]=xy(p),lit=positions.includes(p);g.fillColor=lit?new Color(229,199,131,230):new Color(210,174,111,28);g.roundRect(x-cw*.43,y-ch*.41,cw*.86,ch*.82,5);g.fill();
  if(lit){
   let id=regular[0];const order=positions.indexOf(p);
   if(c.primaryKind==='collector-grid'&&order===0)id=c.wildId;
   art.image(diagram,symbolAtlas(c.id),x,y,Math.min(cw,ch)*.7,Math.min(cw,ch)*.7,SYMBOL_ART[id]??0);
  }
 }
 if(paths.length){
  g.strokeColor=new Color('#FFF6D6');g.lineWidth=4;positions.forEach((p,i)=>{const [x,y]=xy(p);if(i)g.lineTo(x,y);else g.moveTo(x,y);});g.stroke();
  const [x,y]=xy(positions[0]);g.strokeColor=new Color('#B0FFE3');g.lineWidth=4;g.circle(x,y,Math.min(cw,ch)*.29);g.stroke();
 }
 if(c.primaryKind==='twin-boards'){g.strokeColor=new Color('#F6D899');g.lineWidth=7;g.moveTo(-w/2,0);g.lineTo(w/2,0);g.stroke();}
 if(paths.length>1){
  readableRuleArrow(parent,art,'Previous rule path',-240,6,190,62,-1,()=>change(Math.floor(page/pathCount)*pathCount+(index+pathCount-1)%pathCount));readableRuleArrow(parent,art,'Next rule path',240,6,190,62,1,()=>change(Math.floor(page/pathCount)*pathCount+(index+1)%pathCount));
 }
 text(parent,paths.length?`${index+1} / ${paths.length}`:pick(['QUALIFYING SHAPE','有效格子示意','有效格子示意','有効なマスの例','유효 칸 예시']),0,6,410,55,29,COLORS.jade,true);
 const note:readonly string[]=[
 'Highlighted cells illustrate positions, not a guaranteed win. Apply the symbol, direction and region conditions above. Payouts depend on the paytable and total stake; feature awards are separate.',
 '亮格仅示意位置，不代表必中奖。还须满足上面的符号、方向及区域条件。奖励按赔付表与总投注计算；额外玩法奖励单独结算。',
 '亮格僅示意位置，不代表必中獎。還須滿足上面的符號、方向及區域條件。獎勵按賠付表與總投注計算；額外玩法獎勵單獨結算。',
 '点灯マスは位置の例で、当選保証ではありません。上記の絵柄・方向・領域条件も必要です。配当表と総ベットで計算し、追加機能の配当は別途精算します。',
 '강조 칸은 위치 예시이며 당첨 보장이 아닙니다. 위의 심벌·방향·영역 조건도 충족해야 합니다. 배당표와 총 베팅으로 계산하며 추가 기능 보상은 별도로 정산합니다.'
 ];
 const texts=[...primaryRuleText(c,language()),pick(note)],pages=texts.flatMap(value=>ruleTextPages(value,8,620,38));
 const paragraph=((Math.floor(page/pathCount)%pages.length)+pages.length)%pages.length;
 readableRuleText(parent,pages[paragraph],72,-259,635,456,38);
 readableRuleArrow(parent,art,'Previous explanation',-255,-543,230,72,-1,()=>change(((paragraph+pages.length-1)%pages.length)*pathCount+index));
 readableRuleArrow(parent,art,'Next explanation',255,-543,230,72,1,()=>change(((paragraph+1)%pages.length)*pathCount+index));
 readableRuleText(parent,`${paragraph+1} / ${pages.length}`,0,-543,340,64,38,COLORS.jade);
 readableRuleText(parent,ruleTextPages(pick(['Read each explanation with the arrows','使用箭头查看完整说明','使用箭頭查看完整說明','矢印で説明を最後まで確認','화살표로 전체 설명 확인']),2,760,34)[0],72,-619,635,96,34);
}
