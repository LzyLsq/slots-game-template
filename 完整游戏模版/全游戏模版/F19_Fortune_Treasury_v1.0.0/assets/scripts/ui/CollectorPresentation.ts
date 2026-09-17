import type {FeatureRound} from '../math/types';
import type {Language} from './Language';

// Presentation only: all counts and values come from the settled feature rounds.
const words:Record<Language,readonly string[]>={
 en:['LOCKED','NEW','RESPINS','RESET','VALUE','VAULT FULL','COLLECTED','Tap here or SPIN to finish bonus','Finishing bonus…'],
 'zh-CN':['已锁定','新增','剩余重转','重置','累计','已集满','已领取','点击这里或SPIN完成奖励','正在完成奖励…'],
 'zh-TW':['已鎖定','新增','剩餘重轉','重置','累計','已集滿','已領取','點擊這裡或SPIN完成獎勵','正在完成獎勵…'],
 ja:['ロック','追加','残りリスピン','リセット','合計','全マス獲得','獲得済み','ここかSPINをタップして完了','ボーナスを完了中…'],
 ko:['잠금','신규','남은 재회전','초기화','누적','전체 수집','수령 완료','여기 또는 SPIN을 눌러 완료','보너스 완료 중…'],
};
export function collectorAction(locale:Language,finishing=false):string{return words[locale][finishing?8:7];}
export function collectorStatus(round:FeatureRound,previousCount:number,capacity:number,totalRounds:number,locale:Language,finished=false):string{
 const w=words[locale],count=Object.keys(round.locked??{}).length,added=Math.max(0,count-previousCount);
 const value=Object.values(round.locked??{}).reduce((sum,n)=>sum+n,0).toLocaleString('en-US');
 const remaining=round.remaining??0,reset=round.motion==='respin'&&added>0&&remaining===3&&count<capacity;
 const state=finished?w[6]:count===capacity?w[5]:w[2]+' '+remaining+(reset?' ('+w[3]+')':'');
 return round.index+'/'+totalRounds+' · '+w[0]+' '+count+'/'+capacity+(finished?'':' · '+w[1]+' +'+added)+'\n'+state+' · '+w[4]+' '+value+(finished?'':'\n'+collectorAction(locale));
}
