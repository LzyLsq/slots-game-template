import {BETS,GAME_BY_ID,awardTier,DAILY_REWARDS,COLLECT_TARGETS,COLLECT_REWARDS,SYMBOLS} from './config.mjs';
export const utcDay = (now=Date.now()) => new Date(now).toISOString().slice(0,10);
export function newProfile(id,name,now=Date.now()){
 return {id,name:String(name??'').trim().slice(0,20)||'Conservatory Guest',avatar:'tiger',createdAt:now,balance:10000,rounds:0,superReached:false,pending:null,
 stats:Object.fromEntries(Object.keys(GAME_BY_ID).map(k=>[k,{rounds:0,win:0,features:0}])),collection:[],daily:{day:null,index:-1},ledger:[{id:'welcome',type:'welcome',amount:10000,balance:10000,at:now,description:'欢迎礼金 · 虚拟金币'}],preferences:{music:.45,sfx:.65,motion:true,lang:'en'}};
}
function addEntry(p,e,now){if(p.ledger.some(x=>x.id===e.id))throw new Error('Duplicate transaction');p.balance+=e.amount;if(!Number.isSafeInteger(p.balance)||p.balance<0)throw new Error('Invalid wallet balance');p.ledger.unshift({...e,balance:p.balance,at:now});p.ledger=p.ledger.slice(0,300);}
export function settleRound(p,result,id,now=Date.now()){
 if(p.ledger.some(x=>x.id===id+':stake'))return {duplicate:true};
 if(p.pending)throw new Error('请先收取上一局奖励');
 if(!BETS.includes(result.bet)||!GAME_BY_ID[result.gameId])throw new Error('Invalid round');
 if(!Number.isSafeInteger(result.natural)||result.natural<0)throw new Error('Invalid result');
 const game=GAME_BY_ID[result.gameId];
 if(!Array.isArray(result.frames)||!result.frames.length||result.frames.length>6)throw new Error('Invalid frames');
 let sum=0;
 for(const f of result.frames){
  if(!Number.isSafeInteger(f.win)||f.win<0||!Array.isArray(f.board)||f.board.length!==game.cols||f.board.some(c=>!Array.isArray(c)||c.length!==game.rows||c.some(v=>!SYMBOLS.includes(v))))throw new Error('Invalid frame');
  sum+=f.win;
 }
 if(sum!==result.natural)throw new Error('Result total mismatch');
 if(!Number.isSafeInteger(p.balance-result.bet+result.natural+result.bet*10))throw new Error('Wallet capacity exceeded');
 if(p.balance<result.bet)throw new Error('金币不足，请领取奖励或到演示商店补充');
 const before=p.balance;addEntry(p,{id:id+':stake',type:'stake',amount:-result.bet,description:GAME_BY_ID[result.gameId].cn+' · 下注'},now);
 if(result.natural>0)addEntry(p,{id:id+':win',type:'win',amount:result.natural,description:'自然转轴奖励'},now);
 p.rounds++;const credit=!p.superReached&&p.rounds===5?Math.max(0,result.bet*10-result.natural):0;
 if(credit)addEntry(p,{id:id+':benefit',type:'benefit',amount:credit,description:'新手第5局超级大奖补足 · 不改变转轴'},now);
 const total=result.natural+credit;if(total>=result.bet*10)p.superReached=true;
 const stat=p.stats[result.gameId];stat.rounds++;stat.win+=total;if(result.feature)stat.features++;
 p.pending={...result,id,before,after:p.balance,credit,total,tier:awardTier(total,result.bet),at:now};
 return {duplicate:false,round:p.pending};
}
export function completePresentation(p,id){if(p.pending?.id===id)p.pending=null;}
export function claimDaily(p,id,now=Date.now()){
 const day=utcDay(now);if(p.daily.day===day)throw new Error('今天的宝藏已领取');
 const yesterday=utcDay(now-86400000),index=p.daily.day===yesterday?(p.daily.index+1)%7:0,amount=DAILY_REWARDS[index];
 addEntry(p,{id,type:'daily',amount,description:`每日宝藏 · 第${index+1}天`},now);p.daily={day,index};return amount;
}
export function claimCollection(p,gameId,index,id,now=Date.now()){
 const key=gameId+':'+index;
 if(!GAME_BY_ID[gameId]||index<0||index>=COLLECT_TARGETS.length)throw new Error('Invalid collection');
 if(p.collection.includes(key))throw new Error('这份财苑藏品已领取');
 if(p.stats[gameId].rounds<COLLECT_TARGETS[index])throw new Error('游玩进度尚未达到');
 const amount=COLLECT_REWARDS[index];addEntry(p,{id,type:'collection',amount,description:GAME_BY_ID[gameId].cn+' · 收藏奖励'},now);p.collection.push(key);return amount;
}
export function purchaseDemo(p,pack,id,now=Date.now()){
 const packs=[2000,6000,16000];if(!Number.isInteger(pack)||pack<0||pack>=packs.length)throw new Error('Invalid demo package');
 const receipt='demo:'+id;if(p.ledger.some(x=>x.id===receipt))return 0;
 addEntry(p,{id:receipt,type:'demo-shop',amount:packs[pack],description:'演示商店赠币 · 未付款 · 非真实内购'},now);return packs[pack];
}
// Permanent IAP deduplication is deliberately independent of the 300-row
// presentation ledger. Old transactions must not grant again after pruning.
export function creditVerifiedPurchase(p,nativeId,amount,now=Date.now()){
 if(!/^\d{1,40}$/.test(nativeId)||!Number.isSafeInteger(amount)||amount<=0)throw Error('Invalid verified purchase');
 p.creditedPurchaseIds??=[];const id='apple:'+nativeId;
 if(p.creditedPurchaseIds.includes(id))return 0;
 if(p.balance>1_000_000_000-amount)throw Error('Coin balance limit');
 addEntry(p,{id,type:'apple-purchase',amount,description:'Apple 内购 · 虚拟金币'},now);
 p.creditedPurchaseIds.push(id);return amount;
}
export function validateProfile(p){
 if(!p||typeof p.id!=='string'||!Number.isSafeInteger(p.balance)||p.balance<0||!Array.isArray(p.ledger))throw new Error('Corrupt profile');
 if(!Number.isInteger(p.rounds)||p.rounds<0)throw new Error('Corrupt rounds');
 if(p.ledger[0]?.balance!==p.balance)throw new Error('Ledger mismatch');
 p.stats??={};
 for(const game of Object.keys(GAME_BY_ID)){
  p.stats[game]??={rounds:0,win:0,features:0};
  const s=p.stats[game];if(!['rounds','win','features'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0))throw new Error('Corrupt statistics');
 }
 p.preferences={music:.45,sfx:.65,motion:true,lang:'en',...p.preferences};
 return p;
}
