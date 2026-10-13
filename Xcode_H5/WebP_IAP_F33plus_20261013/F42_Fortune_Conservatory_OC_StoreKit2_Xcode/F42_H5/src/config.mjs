export const BRAND = {id:'f42', name:'Fortune Conservatory', version:'1.0.0', title:'金曜财苑'};
export const BETS = [20, 50, 100, 200, 500];
export const SYMBOLS = ['coin','ingot','emerald','ruby','pearl','chest','lotus','wild','lantern','crown','bell','fan'];
export const SYMBOL_NAMES = {coin:'金币',ingot:'金锭',emerald:'翡翠',ruby:'红宝石',pearl:'珍珠',chest:'宝箱',lotus:'金莲 SCATTER',wild:'金冠 WILD',lantern:'灯笼',crown:'皇冠',bell:'金铃',fan:'玉扇'};
export const PAYTABLE = {
 coin:[0,0,0,8,24,90], ingot:[0,0,0,10,32,120], emerald:[0,0,0,15,48,160], ruby:[0,0,0,20,60,200], pearl:[0,0,0,25,90,280], chest:[0,0,0,40,150,600],
 wild:[0,0,0,40,150,600], lantern:[0,0,0,14,42,160], crown:[0,0,0,30,110,320], bell:[0,0,0,10,35,150], fan:[0,0,0,12,45,180]
};
export const LINES_5 = [
 [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
 [0,0,1,0,0],[2,2,1,2,2],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],
 [2,1,1,1,2],[1,0,1,0,1],[1,2,1,2,1],[0,1,0,1,0],[2,1,2,1,2],
 [0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0],[2,0,0,0,2],[1,1,0,1,1]
];
export const LINES_4 = [[0,0,0,0],[1,1,1,1],[2,2,2,2],[3,3,3,3],[0,1,2,3],[3,2,1,0],[0,1,1,0],[3,2,2,3],[1,0,0,1],[2,3,3,2],[0,2,2,0],[3,1,1,3],[1,2,2,1],[2,1,1,2],[0,0,3,3],[3,3,0,0]];
export const LINES_3 = [[0,0,0],[1,1,1],[2,2,2],[0,1,2],[2,1,0],[0,1,0],[2,1,2],[1,0,1]];
export const GAMES = [
 {id:'tiger-treasury',title:'Tiger Treasury',cn:'白虎金殿',cols:5,rows:3,kind:'lines',lines:LINES_5,scale:1.92,description:'5×3 · 20条线 · 连胜花园',feature:'5次免费旋转；连续中奖让倍数从1×升至4×，未中奖重置。',weights:[28,21,16,13,10,6,4,4,13,5,15,15],music:'tiger',mascot:'tiger',art:'tiger-cabinet'},
 {id:'koi-reserve',title:'Koi Reserve',cn:'锦鲤珠库',cols:5,rows:4,kind:'ways',divisor:32,scale:.24,description:'5×4 · 1024 Ways · 珍珠红利',feature:'4次免费旋转；每盘2颗珍珠增加1×红利，最高5×，各盘独立计算。',weights:[28,21,16,13,10,6,3,3,13,5,15,15],music:'koi',mascot:'koi',art:'koi-cabinet'},
 {id:'crane-palace',title:'Crane Palace',cn:'仙鹤宝阁',cols:4,rows:4,kind:'dual',lines:LINES_4,scale:1.04,description:'4×4 · 16条双向线 · 镜羽双金',feature:'4次免费旋转；中间两轴镜像成对，每条线只支付左右两端较高的一次。',weights:[28,21,16,13,10,6,5,5,13,5,15,15],music:'crane',mascot:'crane',art:'crane-cabinet'},
 {id:'tortoise-vault',title:'Treasure Tortoise',cn:'金龟宝藏',cols:3,rows:3,kind:'vault',lines:LINES_3,scale:3.2,description:'3×3 · 8条线 · 金币留存',feature:'4次免费旋转；出现的金币锁定在原格，保留到此轮免费旋转结束，每盘按8条线结算。',weights:[28,21,16,13,10,6,7,4,13,5,15,15],music:'tortoise',mascot:'tortoise',art:'tortoise-cabinet'}
];
export const GAME_BY_ID = Object.fromEntries(GAMES.map(g=>[g.id,g]));
export const TIERS = ['normal','big','super','mega'];
export function awardTier(win,bet) {return win<=0?'none':win>=bet*30?'mega':win>=bet*10?'super':win>bet?'big':'normal';}
export const COLLECT_TARGETS = [10,25,50];
export const COLLECT_REWARDS = [300,900,2500];
export const DAILY_REWARDS = [200,250,300,400,500,650,1000];
export const ASSETS = [
 'panel-frame','panel-row','panel-note','panel-input','slider-track','slider-knob','silk',
 ...['tiger','koi','crane','tortoise'].flatMap(n=>[n+'-guardian-base',n+'-guardian-limb']),
 ...['button-long','button-gold','button-jade',...['tiger','koi','crane','tortoise'].map(n=>'button-spin-'+n)].map(n=>n+'-face'),
 ...['tiger','koi','crane','tortoise'].map(n=>'button-spin-'+n),'button-small-face','fx-aureole','fx-glint','fx-reflection','fx-dust',
 'lobby', 'tiger-cabinet','koi-cabinet','crane-cabinet','tortoise-cabinet', 'tiger','koi','crane','tortoise',
 ...SYMBOLS, 'button-spin','button-spin-red','button-gold','button-jade','button-small','button-long','plaque',
 'nameplate-tiger','nameplate-koi','nameplate-crane','nameplate-tortoise','title-brand','title-tiger','title-koi','title-crane','title-tortoise','title-big','title-super','title-mega','title-club','title-ledger',
 'title-shop','title-daily','title-rank','title-profile','title-rules','title-settings','award-stage', 'portrait-tiger','portrait-koi','portrait-crane','portrait-tortoise'
].map(s=>`assets/art/${s}.webp`);
