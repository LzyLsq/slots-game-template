import {GameConfig, SpinResult, WinResult} from '../math/types';
import {language, tr} from '../ui/Language';
/** Display tiers only. They neither draw prizes nor alter settlement. */
// BIG is strictly profitable; existing higher tiers remain inclusive.
export const WIN_TIERS = [1,50,100] as const;
export function winTier(multiplier:number):number{
  if(!Number.isFinite(multiplier))return 0;
  return multiplier>=100?3:multiplier>=50?2:multiplier>1?1:0;
}
export function isBigWin(total:number,bet:number):boolean{return Number.isFinite(total)&&Number.isFinite(bet)&&bet>0&&total>bet;}
const phrases={
  "line-left":["Left-edge line", "左起赔付线", "左起賠付線", "左端ライン", "왼쪽 시작 라인"],
  "line-right":["Right-edge line", "右起赔付线", "右起賠付線", "右端ライン", "오른쪽 시작 라인"],
  "line-best-edge":["Best-edge line", "两端择优线", "兩端擇優線", "両端の高配当ライン", "양끝 중 높은 라인"],
  "line-center":["Center-out line", "中心扩展线", "中心擴展線", "中央からのライン", "중앙 확장 라인"],
  "variable-left":["Left-edge Ways", "左起动态组合", "左起動態組合", "左端可変Ways", "왼쪽 가변 Ways"],
  "variable-right":["Right-edge Ways", "右起动态组合", "右起動態組合", "右端可変Ways", "오른쪽 가변 Ways"],
  "variable-best-edge":["Best-edge Ways", "两端择优组合", "兩端擇優組合", "両端の高配当Ways", "양끝 중 높은 Ways"],
  "cluster-orthogonal":["Side-linked cluster", "横纵相邻连簇", "橫縱相鄰連簇", "縦横クラスター", "상하좌우 군집"],
  "cluster-eight":["Eight-way cluster", "八向相邻连簇", "八向相鄰連簇", "8方向クラスター", "8방향 군집"],
  "cluster-diagonal":["Diagonal cluster", "对角相邻连簇", "對角相鄰連簇", "斜めクラスター", "대각선 군집"],
  "cluster-wild":["WILD-linked cluster", "含百搭连簇", "含百搭連簇", "WILD入りクラスター", "WILD 포함 군집"],
  "cluster-bottom":["Bottom-linked cluster", "触底连簇", "觸底連簇", "最下段につながる群", "맨 아래 연결 군집"],
  "count-board":["Whole-board count", "全盘计数", "全盤計數", "盤面全体の個数", "전체 개수"],
  "count-halves":["Half-board count", "半盘计数", "半盤計數", "半盤面の個数", "반쪽 보드 개수"],
  "upper":["Upper-half count", "上半盘计数", "上半盤計數", "上半分の個数", "윗부분 개수"],
  "lower":["Lower-half count", "下半盘计数", "下半盤計數", "下半分の個数", "아랫부분 개수"],
  "count-three-columns":["Count across ≥3 reels", "跨至少3列计数", "跨至少3列計數", "3列以上での個数", "3열 이상 개수"],
  "count-wild-assignment":["Count · WILD assigned once", "计数·百搭仅分配一次", "計數·百搭僅分配一次", "個数・WILDは1種に配分", "개수 · WILD 한 종류 배정"],
  "count-rim":["Outer-rim count", "外圈计数", "外圈計數", "外周の個数", "바깥 테두리 개수"],
  "collect-row-left":["Coins left of collector", "收集同排左侧金币", "收集同排左側金幣", "同じ行の左側コイン", "같은 행 왼쪽 코인"],
  "collect-neighbour":["Adjacent coins collected", "收集横纵相邻金币", "收集橫縱相鄰金幣", "縦横の隣接コイン収集", "상하좌우 인접 코인 수집"],
  "collect-row":["Same-row coins collected", "收集同排金币", "收集同排金幣", "同じ行のコイン収集", "같은 행 코인 수집"],
  "collect-board":["Whole-board coins collected", "收集全盘金币", "收集全盤金幣", "全盤面のコイン収集", "전체 보드 코인 수집"],
  "collect-between":["Coins between collectors", "收集同排双收集器间金币", "收集同排雙收集器間金幣", "同じ行の収集器間コイン", "같은 행 수집기 사이 코인"],
  "collect-column":["Same-column coins collected", "收集同列金币", "收集同列金幣", "同じ列のコイン収集", "같은 열 코인 수집"],
  "ways-anywhere":["Contiguous-reel Ways", "任意连续列组合", "任意連續列組合", "任意の連続列Ways", "임의 연속 열 Ways"],
  "ways-right":["Right-edge Ways", "右端连续列组合", "右端連續列組合", "右端連続Ways", "오른쪽 연속 Ways"],
  "ways-left":["Left-edge Ways", "左端连续列组合", "左端連續列組合", "左端連続Ways", "왼쪽 연속 Ways"],
  "ways-center":["Center-crossing Ways", "跨中心连续列组合", "跨中心連續列組合", "中央を通る連続Ways", "중앙 통과 연속 Ways"],
  "ways-full":["Full-span Ways", "贯穿全列组合", "貫穿全列組合", "全列Ways", "모든 열 Ways"],
  "wildHand":["WILD hand", "含百搭牌组", "含百搭牌組", "WILD入りハンド", "WILD 포함 핸드"],

  award:['Award','获奖组合','獲獎組合','当たり','당첨 조합'],
  line:['Payline','赔付线','賠付線','ペイライン','페이라인'],
  vertical:['Vertical line','纵向赔付线','縱向賠付線','縦ライン','세로 라인'],
  board:['Board','盘面','盤面','盤面','보드'],
  connected:['Adjacent cluster','相邻连簇','相鄰連簇','隣接クラスター','인접 군집'],
  anywhere:['Anywhere count','全盘计数','全盤計數','盤面全体の個数','전체 개수'],
  collected:['Collected coins','被收集金币','被收集金幣','収集コイン','수집 코인'],
  scatter:['Scatter anywhere','任意位置散点','任意位置散點','任意位置のスキャッター','어디서든 스캐터'],
  routes:['Linked paths','连接路径','連接路徑','接続経路','연결 경로'],
  matchingReels:['Matching reels','匹配转轴','匹配轉軸','一致リール','일치 릴'],
  consecutive:['Consecutive reels','连续转轴','連續轉軸','連続リール','연속 릴'],
  row:['Hand row','牌组行','牌組行','ハンド行','핸드 행'],
  pair:['Pair','一对','一對','ワンペア','원페어'],
  twoPair:['Two pairs','两对','兩對','ツーペア','투페어'],
  triple:['Three of a kind','三条','三條','スリーカード','트리플'],
  fullHouse:['Full house','葫芦','葫蘆','フルハウス','풀하우스'],
  four:['Four of a kind','四条','四條','フォーカード','포카드'],
  five:['Five of a kind','五条','五條','ファイブカード','파이브카드'],
  coins:['coins','金币','金幣','コイン','코인'],
  ways:['ways','条组合','條組合','通り','경우'],
  noWin:['No winning combination this round','本局没有获奖组合','本局沒有獲獎組合','今回は当たりなし','이번 회차 당첨 없음'],
  base:['Base','基础奖励','基礎獎勵','基本獲得','기본 획득'],
  bonus:['Bonus','特色奖励','特色獎勵','ボーナス','보너스'],
  total:['Total return','总返还','總返還','返還合計','총 반환'],
  stake:['× stake','× 本局下注','× 本局下注','× ベット','× 베팅'],
  below:['Return below stake','返还低于下注','返還低於下注','返還はベット未満','반환액이 베팅보다 적음'],
  tiers:["Win tiers: BIG >1× · MEGA 50× · EPIC 100× stake. Total round return, not extra prizes.","大奖分级：总奖金大于本局下注为大奖 · 巨奖50倍 · 史诗100倍。仅演出分级，不额外发奖。","大獎分級：總獎金大於本局下注為大獎 · 巨獎50倍 · 史詩100倍。僅演出分級，不額外發獎。","BIGは返還合計が今回のベットを超える場合。MEGA 50倍・EPIC 100倍。追加賞なし。","BIG: 이번 베팅보다 많은 총 당첨금. MEGA 50배 · EPIC 100배. 추가 보상 없음."],
  profitableTier:['Total return > stake · BIG WIN','总返还 > 本局下注 · 大奖','總返還 > 本局下注 · 大獎','返還合計 > ベット · BIG WIN','총 반환액 > 베팅 · BIG WIN'],
  ordinaryTier:['Ordinary paid win · total return ≤ stake','普通中奖 · 总返还 ≤ 本局下注','普通中獎 · 總返還 ≤ 本局下注','通常当たり · 返還合計 ≤ ベット','일반 당첨 · 총 반환액 ≤ 베팅'],
  tier:['Total return ≥ {n}× stake · no extra prize','总返还 ≥ {n}倍下注 · 非额外奖金','總返還 ≥ {n}倍下注 · 非額外獎金','返還合計 ≥ ベット{n}倍・追加賞なし','총 반환액 ≥ 베팅 {n}배 · 추가 보상 아님'],
} as const;
function p(key:keyof typeof phrases):string{const i=['en','zh-CN','zh-TW','ja','ko'].indexOf(language());return phrases[key][Math.max(0,i)];}
export function formatWinAmount(n:number):string{return n.toLocaleString('en-US',{maximumFractionDigits:3});}
const amount=formatWinAmount;
/** Presentation guard only; saved awards and balances are never modified. */
export function cumulativeAwardAmount(current:number,credits:number,settledTotal:number):number{return Math.min(settledTotal,current+Math.max(0,credits));}
export function tierRules():string{return p('tiers');}
export function tierCaption(multiplier:number):string{const tier=winTier(multiplier);return tier===0?p('ordinaryTier'):tier===1?p('profitableTier'):p('tier').replace('{n}',String(WIN_TIERS[tier-1]));}
/** credits is the settled allocation AFTER round-level rounding and cap.
 * rawCredits is diagnostic pre-settlement math and must never be displayed here. */
export function awardCredits(w:WinResult):number{return w.credits;}
export function awardReason(c:GameConfig,w:WinResult):string{
  if(w.kind==='scatter')return p('scatter');
  const line=Number.isInteger(w.lineIndex)?w.lineIndex!+1:undefined;
  if(c.primaryKind==='twin-boards'&&line!==undefined&&c.paylines.length)return p('board')+' '+(Math.floor((line-1)/c.paylines.length)+1)+' · '+p('line')+' '+((line-1)%c.paylines.length+1);
  if(c.primaryKind==='collector-grid')return p('collected')+' ×'+w.count;
  if(c.primaryKind==='scatter-groups')return p('anywhere')+' ×'+w.count;
  if(c.primaryKind==='cluster-avalanche')return p('connected')+' ×'+w.count;
  if(w.kind==='cluster')return p('connected')+' ×'+w.count;
  if(c.primaryKind==='vertical-lines')return p('vertical')+(line===undefined?'':' '+line);
  if(c.primaryKind==='route-paths')return p('routes')+' · '+w.count+' '+p('matchingReels');
  if(c.primaryKind==='any-reel-ways'||w.kind==='ways')return w.count+' '+p('consecutive');
  if(w.kind==='line')return p('line')+(line===undefined?'':' '+line);
  return tr(c.modeLabel);
}
export function awardEvidence(c:GameConfig,w:WinResult,index:number,total:number):string{
  const symbol=c.symbols.find(s=>s.id===w.symbolId)?.label;
  const subject=symbol?tr(symbol)+' ×'+w.count+' · ':'';
  const ways=w.ways&&w.ways>1?amount(w.ways)+' '+p('ways')+' · ':'';
  return (total>1?index+'/'+total+' · ':'')+awardReason(c,w)+'\n'+subject+ways+'+'+amount(awardCredits(w))+' '+p('coins');
}
/** Only actual settled wins are described; focus/locked cells are not awards. */
export function featureAwardEvidence(c:GameConfig,wins:readonly WinResult[],credits:number,index:number,total:number):string{
  const paid=wins.filter(w=>awardCredits(w)>0);
  const heading=p('bonus')+' '+index+'/'+total;
  if(paid.length===1)return heading+'\n'+awardEvidence(c,paid[0],1,1);
  return heading+' · '+p('award')+' ×'+paid.length+'\n'+'+'+amount(credits)+' '+p('coins');
}
export function awardSummary(wins:readonly WinResult[],credits:number):string{
  return p('award')+' ×'+wins.filter(w=>awardCredits(w)>0).length+'\n'+p('total')+' '+amount(credits)+' '+p('coins');
}
export function roundEvidence(result:SpinResult,bet:number):string{
  if(result.totalWin<=0)return p('noWin');
  const detail=p('base')+' '+amount(result.baseWin)+(result.featureWin>0?' + '+p('bonus')+' '+amount(result.featureWin):'');
  return detail+' · '+p('total')+' '+amount(result.totalWin)+'\n'+(result.totalWin<bet?p('below')+' · ':'')+(result.totalWin/bet).toFixed(2)+p('stake');
}

/** Only mark paid cells that are still on screen after the final feature step. */
export function visibleAwardPositions(result:SpinResult,visibleGrid:readonly string[]):number[]{
  const rounds=result.featureResult?.rounds??[];
  const last=rounds.length?rounds[rounds.length-1]:undefined;
  const grid=last?.grid??result.grid,wins=last?.wins??result.wins;
  if(grid.length!==visibleGrid.length||grid.some((symbol,i)=>symbol!==visibleGrid[i]))return [];
  return Array.from(new Set(wins.filter(w=>w.credits>0).flatMap(w=>Array.from(w.positions))))
    .filter(p=>Number.isInteger(p)&&p>=0&&p<grid.length);
}
