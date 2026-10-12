import type {GameConfig} from './types';
const RULES:Record<string,Record<string,readonly string[]>>={
 "en": {
  "line-reels": [
   "Match at least 3 identical symbols on a shown payline, starting on the leftmost reel without a gap. Each line pays only its highest valid result. WILD substitutes for ordinary symbols, never SCATTER or BONUS.",
   "All {lines} lines are active. The table shows coins for ONE winning line at the current total bet; all bet splits and payout factors are already included. Add different winning lines. Only the best result on each line pays; shorter prefixes are not paid again."
  ],
  "any-reel-ways": [
   "Match identical symbols on 3 or more consecutive reels from the leftmost reel. Symbols may be in any row; every matching combination is a way. A missing reel ends the run. WILD substitutes for ordinary symbols.",
   "This {columns} × {rows} board has {ways} ways. The table shows approximate coins for ONE matching combination at the current bet. Multiply the unrounded per-way value by the winning combinations; round each symbol’s longest-run total to whole coins, then add the totals. The ≈ display is a reference, so calculating with its shortened digits can differ. All-WILD ways pay only as WILD."
  ],
  "variable-ways": [
   "Each spin opens 2–4 positions on each of 5 reels. Match the same symbol on at least 3 consecutive reels from the leftmost reel, in any open row. Closed positions never participate. WILD substitutes for ordinary symbols.",
   "The table shows approximate coins per winning combination at the current bet, already using the fixed 1,024-way basis. Multiply the unrounded value by winning combinations, then round each symbol’s longest-run total to whole coins. ≈ values are shortened references, not exact calculation inputs. Reel heights stay fixed during this spin’s bonus; all-WILD ways pay only as WILD."
  ],
  "cluster-avalanche": [
   "A group of at least 5 identical symbols joined horizontally or vertically wins. Diagonal contact does not connect a group. Separate groups are evaluated independently, never combined to reach the minimum.",
   "The table shows coins for ONE winning group at the current total bet; all payout factors are already included. Add separate winning groups. WILD joins ordinary groups; an all-WILD group pays only as WILD. SCATTER and BONUS do not form ordinary groups. Follow-up effects use the feature rules."
  ],
  "scatter-groups": [
   "At least 8 identical ordinary symbols anywhere on the whole board win. Symbols do not need to touch or share a row. All positions belong to one board-wide count for each symbol type.",
   "The table shows coins for ONE qualifying symbol type at the current total bet, using its full-board count; all payout factors are already included. Pay each type once, then add the awards. WILD counts only as its own type and does not complete other types. SCATTER and BONUS have separate rules."
  ],
  "collector-grid": [
   "The first ordinary symbol in the paytable is the cash symbol. When at least one WILD collector and one cash symbol appear anywhere on the board, every cash symbol is collected. Rows, columns and adjacency do not matter.",
   "The cash page shows approximate coins per cash symbol at the current bet, including the payout factor. Multiply the unrounded value by the cash count, then round the total to whole coins once. ≈ is a shortened reference. Extra WILD collectors do not multiply the same cash. Without both cash and a collector, this rule pays nothing."
  ],
  "twin-boards": [
   "Two independent 3 × 3 boards spin together. Each uses 5 shown paylines. Three identical symbols from the leftmost reel win on a line; a line never crosses from one board into the other. WILD substitutes for ordinary symbols.",
   "The total bet is split equally between the two boards. The table already shows coins for ONE winning line on ONE board, including the split and payout factor. Pay only the best result on each line, then add both boards’ wins. Do not divide the displayed award again. SCATTER and BONUS follow separate rules."
  ]
 },
 "zh-CN": {
  "line-reels": [
   "从最左侧转轴开始，沿图示赔付线连续出现至少3个相同符号即可中奖，中间不能断开。每条线只支付其中最高的一项奖励。百搭可替代普通符号，不替代散布或奖励符号。",
   "全部{lines}条线始终启用。赔付表显示当前总投注下，一条中奖线实际获得的金币，已包含投注分摊和赔付系数，无需再次乘除。不同中奖线奖金相加；每条线只付最高一项，较短连续组合不重复支付。"
  ],
  "any-reel-ways": [
   "从最左侧转轴开始，至少3个连续转轴出现相同符号即可中奖，符号可位于任意行。每一种符号组合构成一种方式；遇到没有匹配符号的转轴就停止。百搭可替代普通符号。",
   "5列3行共有243种方式。表格显示当前投注下，单个匹配组合的参考金币。用未截短的单组合金额乘中奖组合数，每种符号只取最长连续段的合计，再四舍五入到整数金币，最后相加。≈表示显示值经过简化，直接用它计算可能有差异。全百搭组合只按百搭支付。"
  ],
  "variable-ways": [
   "每次旋转时，5个转轴各开放2至4格。从最左侧转轴开始，至少3个连续转轴在任意开放行出现相同符号即可中奖。关闭格不参与判定，百搭可替代普通符号。",
   "表格显示当前投注下单个中奖组合的参考金币，已按固定1,024路基准折算。用未截短的金额乘中奖组合数，每种符号仅取最长连续段合计，再四舍五入到整数金币。≈数值是简化参考，不是精确计算输入。本次奖励阶段沿用相同开放高度；全百搭组合只按百搭支付。"
  ],
  "cluster-avalanche": [
   "至少5个相同符号通过上下左右相连组成一组，即可中奖。斜对角接触不算相连；彼此分离的组分别判断，不能合并凑够数量。",
   "表格显示当前总投注下，一组中奖符号实际获得的金币，已包含赔付系数。分开的中奖组分别计奖后相加。百搭可加入普通符号组；全百搭组只按百搭支付。散布和奖励符号不构成普通组。后续效果见奖励玩法规则。"
  ],
  "scatter-groups": [
   "全盘任意位置累计出现至少8个相同普通符号即可中奖，不要求相邻或同行。每种符号在整块棋盘上统一计数，不划分区域。",
   "表格按同一种符号在全盘的总数，显示当前总投注下该类型实际获得的金币，已包含赔付系数。每种达标类型只付一次，再把各类型奖金相加。百搭单独计数，不补足其他符号的数量。散布和奖励符号另按对应规则。"
  ],
  "collector-grid": [
   "赔付表中的第一个普通符号是现金符号。全盘任意位置同时出现至少一个百搭收集者和一个现金符号时，收集全部现金；不要求同行、同列或相邻。",
   "现金页显示当前投注下，每个现金符号的参考金币，已包含赔付系数。用未截短的单个金额乘现金数量，最后只对合计四舍五入一次。≈表示简化参考值。多个百搭收集者不重复收取同一现金；缺少现金或收集者时，此规则不付奖。"
  ],
  "twin-boards": [
   "上下两个独立的3列3行棋盘同时旋转，每盘各有5条图示赔付线。从最左侧转轴起，线上3个相同符号中奖；任何赔付线都不会跨越两个棋盘。百搭可替代普通符号。",
   "总投注平均分给两个盘面。表格已显示其中一个盘面的一条中奖线实际获得的金币，已包含投注分摊和赔付系数，不要再除一次。每条线只支付最高有效结果，再合计两个盘面的奖金。散布和奖励符号另按对应规则。"
  ]
 },
 "zh-TW": {
  "line-reels": [
   "從最左側轉軸開始，沿圖示賠付線連續出現至少3個相同符號即可中獎，中間不能斷開。每條線只支付其中最高的一項獎勵。百搭可替代普通符號，不替代散布或獎勵符號。",
   "全部{lines}條線始終啟用。賠付表顯示目前總投注下，一條中獎線實際獲得的金幣，已包含投注分攤和賠付係數，無須再次乘除。不同中獎線獎金相加；每條線只付最高一項，較短連續組合不重複支付。"
  ],
  "any-reel-ways": [
   "從最左側轉軸開始，至少3個連續轉軸出現相同符號即可中獎，符號可位於任意列。每種符號組合構成一種方式；遇到沒有匹配符號的轉軸即停止。百搭可替代普通符號。",
   "5列3行共有243種方式。表格顯示目前投注下，單個匹配組合的參考金幣。用未截短的單組合金額乘中獎組合數，每種符號只取最長連續段的合計，再四捨五入至整數金幣，最後相加。≈表示顯示值經過簡化，直接用它計算可能有差異。全百搭組合只按百搭支付。"
  ],
  "variable-ways": [
   "每次旋轉時，5個轉軸各開放2至4格。從最左側轉軸開始，至少3個連續轉軸在任意開放格出現相同符號即可中獎。關閉格不參與判定，百搭可替代普通符號。",
   "表格顯示目前投注下單個中獎組合的參考金幣，已按固定1,024路基準折算。用未截短的金額乘中獎組合數，每種符號僅取最長連續段合計，再四捨五入至整數金幣。≈數值是簡化參考，不是精確計算輸入。本次獎勵階段沿用相同開放高度；全百搭組合只按百搭支付。"
  ],
  "cluster-avalanche": [
   "至少5個相同符號透過上下左右相連組成一組，即可中獎。斜對角接觸不算相連；彼此分離的組分別判斷，不能合併湊足數量。",
   "表格顯示目前總投注下，一組中獎符號實際獲得的金幣，已包含賠付係數。分開的中獎組分別計獎後相加。百搭可加入普通符號組；全百搭組只按百搭支付。散布和獎勵符號不構成普通組。後續效果見獎勵玩法規則。"
  ],
  "scatter-groups": [
   "全盤任意位置累計出現至少8個相同普通符號即可中獎，不要求相鄰或同列。每種符號在整塊棋盤上統一計數，不劃分區域。",
   "表格按同一種符號在全盤的總數，顯示目前總投注下該類型實際獲得的金幣，已包含賠付係數。每種達標類型只付一次，再把各類型獎金相加。百搭單獨計數，不補足其他符號的數量。散布和獎勵符號另按對應規則。"
  ],
  "collector-grid": [
   "賠付表中的第一個普通符號是現金符號。全盤任意位置同時出現至少一個百搭收集者和一個現金符號時，收集全部現金；不要求同行、同列或相鄰。",
   "現金頁顯示目前投注下，每個現金符號的參考金幣，已包含賠付係數。用未截短的單個金額乘現金數量，最後只對合計四捨五入一次。≈表示簡化參考值。多個百搭收集者不重複收取同一現金；缺少現金或收集者時，此規則不付獎。"
  ],
  "twin-boards": [
   "上下兩個獨立的3軸3格棋盤同時旋轉，每盤各有5條圖示賠付線。從最左側轉軸起，線上3個相同符號中獎；任何賠付線都不會跨越兩個棋盤。百搭可替代普通符號。",
   "總投注平均分給兩個盤面。表格已顯示其中一個盤面的一條中獎線實際獲得的金幣，已包含投注分攤和賠付係數，不要再除一次。每條線只支付最高有效結果，再合計兩個盤面的獎金。散布和獎勵符號另按對應規則。"
  ]
 },
 "ja": {
  "line-reels": [
   "一番左のリールから、表示された配当ライン上に同じ絵柄が3個以上途切れずに並ぶと当選です。各ラインでは最も高い有効な配当だけを支払います。ワイルドは通常絵柄を代用しますが、スキャターとボーナスは代用しません。",
   "全{lines}ラインが有効です。表は現在の総ベットで当選1ラインに支払われるコイン数です。ベット配分と配当係数は計算済みで、再度掛けたり割ったりしません。各ラインは最高の結果だけを払い、短い連続部分は重複して払いません。別ラインの配当は合算します。"
  ],
  "any-reel-ways": [
   "一番左から3本以上の連続するリールに同じ絵柄があれば当選です。段は問いません。一つの絵柄の組合せが1ウェイとなり、該当絵柄のないリールで連続が終わります。ワイルドは通常絵柄を代用します。",
   "5リール×3行で243通りです。表は現在のベットで一致する1組合せ当たりの参考コイン数です。省略前の単価×当選組合せ数を計算し、各シンボルの最長の並びの合計を整数に四捨五入してから加算します。≈は桁を省略した参考値のため、表示値での計算には差が出ます。全ワイルドの組合せはワイルドとしてのみ支払います。"
  ],
  "variable-ways": [
   "毎回、5本の各リールで2～4段が開きます。一番左から3本以上連続するリールの開いた段に同じ絵柄があれば当選です。閉じた位置は判定しません。ワイルドは通常絵柄を代用します。",
   "表は現在のベットで当選1組合せ当たりの参考コイン数です。固定1,024通りの基準を計算済みです。省略前の単価×当選組合せ数を計算し、各シンボルの最長の並びの合計を整数に四捨五入します。≈は省略した参考値で、厳密な計算用ではありません。ボーナス中も開放高さは固定です。全ワイルドはワイルドとしてのみ支払います。"
  ],
  "cluster-avalanche": [
   "同じ絵柄が上下左右につながって5個以上の集まりを作ると当選です。斜めの接触はつながりません。離れた集まりは個別に判定し、最低個数を満たすために合算しません。",
   "表は現在の総ベットで当選1グループに支払われるコイン数です。配当係数は計算済みです。離れた当選グループは別々に支払って合算します。ワイルドは通常グループに参加しますが、全ワイルドのグループはワイルドとしてのみ支払います。スキャッターとボーナスは通常グループに入りません。追加演出はボーナスルールに従います。"
  ],
  "scatter-groups": [
   "盤面全体の任意の場所に同じ通常絵柄が合計8個以上あれば当選です。隣接や同じ段である必要はありません。絵柄ごとに盤面全体で一つの個数として数えます。",
   "表は盤面全体の同一シンボル数に応じて、現在の総ベットでその種類に支払われるコイン数です。配当係数は計算済みです。条件を満たす各種類に1回払い、合算します。ワイルドは独立した種類で、他の種類の個数を補いません。スキャッターとボーナスは別ルールです。"
  ],
  "collector-grid": [
   "配当表の最初の通常絵柄がキャッシュ絵柄です。盤面のどこかにワイルド収集者とキャッシュが一つ以上ずつ出ると、すべてのキャッシュを回収します。段・リール・隣接は問いません。",
   "キャッシュのページは現在のベットでキャッシュ1個当たりの参考コイン数です。配当係数は計算済みです。省略前の単価×個数を計算し、最後に合計だけを整数に四捨五入します。≈は省略した参考値です。収集ワイルドが複数あっても同じキャッシュは重複払いしません。キャッシュと収集者の両方が必要です。"
  ],
  "twin-boards": [
   "独立した3リール×3段の盤面二つが同時に回ります。各盤面には5本の表示ラインがあります。一番左から同じ絵柄3個がライン上に並ぶと当選です。盤面をまたぐラインはなく、ワイルドは通常絵柄を代用します。",
   "総ベットは2つの盤面に半分ずつ配分します。表は1つの盤面の当選1ラインに支払われるコイン数で、配分と配当係数は計算済みです。表示額を再度割らないでください。各ラインの最高結果のみ払い、両盤面の配当を合算します。スキャッターとボーナスは別ルールです。"
  ]
 },
 "ko": {
  "line-reels": [
   "가장 왼쪽 릴부터 표시된 당첨 라인에 같은 기호가 3개 이상 끊김 없이 이어지면 당첨입니다. 각 라인은 유효한 결과 중 가장 높은 보상만 지급합니다. 와일드는 일반 기호를 대신하지만 스캐터와 보너스는 대신하지 않습니다.",
   "전체 {lines}개 라인이 활성화됩니다. 표는 현재 총 베팅에서 당첨 라인 하나에 지급되는 코인입니다. 베팅 분할과 배당 계수는 이미 반영되어 다시 곱하거나 나누지 않습니다. 각 라인은 가장 높은 결과만 지급하며 짧은 연속 구간은 중복 지급하지 않습니다. 서로 다른 당첨 라인은 합산합니다."
  ],
  "any-reel-ways": [
   "가장 왼쪽부터 3개 이상의 연속 릴에 같은 기호가 있으면 당첨입니다. 행 위치는 상관없으며 기호 조합 하나가 한 가지 방식입니다. 일치하는 기호가 없는 릴에서 연속이 끝납니다. 와일드는 일반 기호를 대신합니다.",
   "5릴×3행에는 243가지 조합이 있습니다. 표는 현재 베팅에서 일치하는 조합 하나의 참고 코인입니다. 생략하지 않은 단가에 당첨 조합 수를 곱한 뒤, 기호별 가장 긴 연속 구간의 합계를 정수로 반올림하여 더합니다. ≈는 자릿수를 줄인 참고값이므로 표시값으로 계산하면 차이가 날 수 있습니다. 모두 와일드인 조합은 와일드로만 지급합니다."
  ],
  "variable-ways": [
   "매 회전에서 5개 릴마다 2~4칸이 열립니다. 가장 왼쪽부터 3개 이상의 연속 릴의 열린 칸에 같은 기호가 있으면 당첨입니다. 닫힌 칸은 판정에서 제외하고 와일드는 일반 기호를 대신합니다.",
   "표는 현재 베팅에서 당첨 조합 하나의 참고 코인이며 고정 1,024가지 기준이 이미 반영되어 있습니다. 생략하지 않은 단가에 당첨 조합 수를 곱한 뒤 기호별 가장 긴 연속 구간의 합계를 정수로 반올림합니다. ≈는 축약된 참고값이며 정확한 계산 입력값이 아닙니다. 보너스 동안 열린 높이는 유지됩니다. 전체 와일드 조합은 와일드로만 지급합니다."
  ],
  "cluster-avalanche": [
   "같은 기호가 상하좌우로 연결되어 5개 이상의 그룹을 만들면 당첨입니다. 대각선 접촉은 연결로 인정하지 않습니다. 떨어진 그룹은 따로 판정하며 최소 개수를 맞추려고 합치지 않습니다.",
   "표는 현재 총 베팅에서 당첨 그룹 하나에 지급되는 코인이며 배당 계수가 이미 반영되어 있습니다. 떨어진 당첨 그룹은 따로 지급하여 더합니다. 와일드는 일반 그룹에 참여하지만 전체 와일드 그룹은 와일드로만 지급합니다. 스캐터와 보너스는 일반 그룹에 포함되지 않습니다. 후속 효과는 보너스 규칙을 따릅니다."
  ],
  "scatter-groups": [
   "전체 보드의 어느 위치든 같은 일반 기호가 총 8개 이상이면 당첨입니다. 서로 붙어 있거나 같은 행일 필요가 없습니다. 기호 종류마다 전체 보드를 하나의 영역으로 세어 판정합니다.",
   "표는 보드 전체의 같은 기호 수에 따라 현재 총 베팅에서 해당 기호 종류에 지급되는 코인입니다. 배당 계수는 이미 반영되어 있습니다. 조건을 만족하는 종류마다 한 번 지급하여 더합니다. 와일드는 별도 종류이며 다른 기호 수를 채우지 않습니다. 스캐터와 보너스는 별도 규칙을 따릅니다."
  ],
  "collector-grid": [
   "배당표의 첫 번째 일반 기호가 현금 기호입니다. 보드 어디든 와일드 수집자와 현금 기호가 각각 하나 이상 나오면 모든 현금을 수집합니다. 같은 행이나 릴에 있거나 인접할 필요가 없습니다.",
   "캐시 페이지는 현재 베팅에서 캐시 기호 하나의 참고 코인이며 배당 계수가 반영되어 있습니다. 생략하지 않은 단가에 캐시 개수를 곱한 뒤 마지막 합계만 한 번 정수로 반올림합니다. ≈는 축약된 참고값입니다. 수집 와일드가 여러 개라도 같은 캐시는 중복 지급하지 않습니다. 캐시와 수집자가 모두 있어야 지급됩니다."
  ],
  "twin-boards": [
   "독립적인 3릴×3행 보드 두 개가 함께 회전하며, 보드마다 표시된 5개 당첨 라인이 있습니다. 가장 왼쪽부터 같은 기호 3개가 라인에 놓이면 당첨입니다. 두 보드를 가로지르는 라인은 없고 와일드는 일반 기호를 대신합니다.",
   "총 베팅은 두 보드에 절반씩 배분합니다. 표는 한 보드의 당첨 라인 하나에 지급되는 코인이며 분할과 배당 계수가 이미 반영되어 있습니다. 표시 금액을 다시 나누지 않습니다. 라인마다 가장 높은 결과만 지급한 뒤 두 보드의 당첨금을 더합니다. 스캐터와 보너스는 별도 규칙을 따릅니다."
  ]
 }
};
const WILD_OWNERSHIP:Record<string,string>={
 'en':'Each cell, including WILD, belongs to one paid group per board. Shared WILDs go to the highest-paying available group first; other groups are rechecked without those cells.',
 'zh-CN':'每个格子（含 WILD）在同一盘面只计入一个获奖组。共用 WILD 时先结算可支付金额最高的组，其余组排除已计奖格后重新判定。',
 'zh-TW':'每個格子（含 WILD）在同一盤面只計入一個獲獎組。共用 WILD 時先結算可支付金額最高的組，其餘組排除已計獎格後重新判定。',
 'ja':'WILD を含む各マスは同じ盤面で1つの当選群にのみ使用します。共有 WILD は配当が最も高い有効な群から割り当て、残りの群を使用済みマスなしで再判定します。',
 'ko':'WILD를 포함한 각 칸은 같은 보드에서 한 당첨 그룹에만 사용됩니다. 공유 WILD는 현재 배당이 가장 높은 그룹부터 배정하며, 나머지 그룹은 이미 사용한 칸을 제외해 다시 판정합니다.'
};
export function primaryRuleText(c:GameConfig,locale='en'):readonly string[]{const family=c.primaryKind??'line-reels';const paragraphs=RULES[locale]?.[family]??RULES.en[family]??[];return [...paragraphs,...(family==='cluster-avalanche'?[WILD_OWNERSHIP[locale]??WILD_OWNERSHIP.en]:[])].map(p=>p.replace(/\{lines\}/g,String(c.paylines.length)).replace(/\{columns\}/g,String(c.columns)).replace(/\{rows\}/g,String(c.rows)).replace(/\{ways\}/g,String(c.waysDivisor??c.rows**c.columns)).replace(/5列3行共有243种方式|5列3行共有243種方式|5リール×3行には243通り|5릴×3행에는 243가지 조합/g,`${c.columns} × ${c.rows} · ${c.waysDivisor??c.rows**c.columns} WAYS`));}
