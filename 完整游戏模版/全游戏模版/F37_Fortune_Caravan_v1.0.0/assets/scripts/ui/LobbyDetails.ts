import {language,type Language} from './Language';
type Copy=readonly [string,string,string,string,string];
const pick=(copy:Copy,locale:Language=language()):string=>copy[['en','zh-CN','zh-TW','ja','ko'].indexOf(locale)]??copy[0];
const MODE_CAPTIONS:readonly Copy[]=[
 ['CARAVAN','沙金','沙金','砂金','사막'],
 ['OASIS','绿洲','綠洲','オアシス','오아시스'],
 ['BAZAAR','集市','集市','バザール','바자르'],
 ['VOYAGE','航海','航海','航海','항해'],
];
const MODE_FACTS:readonly Copy[]=[
 ['3 REELS · 5 LINES · Travelling WILD','3 轴 · 5 线 · 游走百搭','3 軸 · 5 線 · 遊走百搭','3 リール · 5 ライン · 移動ワイルド','3릴 · 5라인 · 이동 와일드'],
 ['5 REELS · 243 WAYS · Sticky WILD','5 轴 · 243 路 · 锁定百搭','5 軸 · 243 路 · 鎖定百搭','5 リール · 243 通り · 固定ワイルド','5릴 · 243웨이 · 고정 와일드'],
 ['5 REELS · 25 LINES · Mystery reveal','5 轴 · 25 线 · 神秘揭晓','5 軸 · 25 線 · 神秘揭曉','5 リール · 25 ライン · ミステリー','5릴 · 25라인 · 미스터리'],
 ['5 × 5 REELS · 5+ connected clusters','5 × 5 转轴 · 5 个起相邻连块','5 × 5 轉軸 · 5 個起相鄰連塊','5 × 5 リール · 5 個以上の連結','5 × 5릴 · 5개 이상 연결'],
];
export const lobbyModeCaption=(index:number,locale?:Language):string=>pick(MODE_CAPTIONS[index]??MODE_CAPTIONS[0],locale);
export const lobbyModeFacts=(index:number,locale?:Language):string=>pick(MODE_FACTS[index]??MODE_FACTS[0],locale);
export const lobbyEnterCaption=(locale?:Language):string=>pick(['PLAY · ENTER TREASURY','开始游戏 · 进入宝库','開始遊戲 · 進入寶庫','プレイ · 宝庫へ','플레이 · 보물고 입장'],locale);
export const ruleNavigationCaption=(direction:-1|1,locale?:Language):string=>pick(direction<0?['PREV','上一页','上一頁','前へ','이전']:['NEXT','下一页','下一頁','次へ','다음'],locale);
export interface JourneyProgress {roundsDone:number;rounds:number;modesDone:number;modes:number}
export function journeyCounts(stop:JourneyProgress):{rounds:string;modes:string}{
 return {rounds:`${Math.max(0,Math.min(stop.roundsDone,stop.rounds))}/${stop.rounds}`,modes:`${Math.max(0,Math.min(stop.modesDone,stop.modes))}/${stop.modes}`};
}
export function lobbyJourneyCaption(stop:JourneyProgress|undefined,remote=false,locale?:Language):string{
 if(remote)return pick(['ROUTE REWARDS · LOCAL PREVIEW','旅途奖励 · 仅本地预览','旅途獎勵 · 僅本地預覽','旅の報酬 · ローカルプレビュー','여정 보상 · 로컬 미리보기'],locale);
 if(!stop)return pick(['JOURNEY · ALL STOPS COMPLETE','商队旅途 · 全部宝藏站已完成','商隊旅途 · 全部寶藏站已完成','旅の記録 · 全地点クリア','여정 · 모든 지역 완료'],locale);
 const {rounds:r,modes:m}=journeyCounts(stop);
 return pick([`JOURNEY · ${r} rounds · ${m} lands`,`商队旅途 · ${r} 局 · ${m} 目的地`,`商隊旅途 · ${r} 局 · ${m} 目的地`,`旅の記録 · ${r} 回 · ${m} 地点`,`여정 · ${r}회 · ${m} 지역`],locale);
}
export function journeyStopCaption(stop:JourneyProgress,locale?:Language):string{
 const {rounds:r,modes:m}=journeyCounts(stop);
 return pick([`${r} rounds · ${m} lands`,`${r} 局 · ${m} 地`,`${r} 局 · ${m} 地`,`${r} 回 · ${m} 地点`,`${r}회 · ${m} 지역`],locale);
}
