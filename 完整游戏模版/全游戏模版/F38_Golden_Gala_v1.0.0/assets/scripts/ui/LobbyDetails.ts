import {language,type Language} from './Language';
type Copy=readonly [string,string,string,string,string];
const pick=(copy:Copy,locale:Language=language()):string=>copy[['en','zh-CN','zh-TW','ja','ko'].indexOf(locale)]??copy[0];
const MODE_CAPTIONS:readonly Copy[]=[
 ['CROWN','金冠','金冠','王冠','왕관'],['EMERALD','翡翠','翡翠','翡翠','에메랄드'],['RUBY','红宝','紅寶','ルビー','루비'],['VAULT','金库','金庫','金庫','금고']
];
const MODE_FACTS:readonly Copy[]=[
 ['5 LINES','5 条赔付线','5 條賠付線','5 ライン','5라인'],
 ['1024 WAYS','1024 路赔付','1024 路賠付','1024 通り','1024웨이'],
 ['20 LINES','20 条赔付线','20 條賠付線','20 ライン','20라인'],
 ['15 LINES','15 条赔付线','15 條賠付線','15 ライン','15라인']
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
 if(remote)return pick(['COLLECTION REWARDS · LOCAL PREVIEW','收藏奖励 · 仅本地预览','收藏獎勵 · 僅本地預覽','旅の報酬 · ローカルプレビュー','여정 보상 · 로컬 미리보기'],locale);
 if(!stop)return pick(['COLLECTION · ALL TREASURES COLLECTED','盛典收藏 · 全部宝藏站已完成','盛典收藏 · 全部寶藏站已完成','コレクション · 全地点クリア','여정 · 모든 지역 완료'],locale);
 const {rounds:r,modes:m}=journeyCounts(stop);
 return pick([`COLLECTION · ${r} rounds · ${m} tables`,`盛典收藏 · ${r} 局 · ${m} 展台`,`盛典收藏 · ${r} 局 · ${m} 展台`,`コレクション · ${r} 回 · ${m} 地点`,`여정 · ${r}회 · ${m} 지역`],locale);
}
export interface GalaSealProgress {modesDone:number;claimed:boolean;ready:boolean}
/** Lobby totals refer to all four discovery seals, not the next unclaimed
 * cabinet's legacy 0/1 round counters. Claims never hide discovered progress. */
export function galaCollectionCaption(seals:readonly GalaSealProgress[],remote=false,locale?:Language):string{
 if(remote)return lobbyJourneyCaption(undefined,true,locale);
 const total=seals.length,seen=seals.filter(s=>s.modesDone>0||s.claimed).length,ready=seals.filter(s=>s.ready&&!s.claimed).length;
 return pick([`COLLECTION · ${seen}/${total} SEALS · ${ready} READY`,`盛典收藏 · ${seen}/${total} 印章 · ${ready} 待领取`,`盛典收藏 · ${seen}/${total} 印章 · ${ready} 待領取`,`コレクション · ${seen}/${total} 印章 · 受取可${ready}`,`컬렉션 · ${seen}/${total} 인장 · 수령 가능 ${ready}`],locale);
}
export function journeyStopCaption(stop:JourneyProgress,locale?:Language):string{
 const {rounds:r,modes:m}=journeyCounts(stop);
 return pick([`${r} rounds · ${m} tables`,`${r} 局 · ${m} 地`,`${r} 局 · ${m} 地`,`${r} 回 · ${m} 地点`,`${r}회 · ${m} 지역`],locale);
}
