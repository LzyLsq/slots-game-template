import {MODES, PAYLINES, PAYTABLE, spin} from './engine.js';
import {createStore, getRanks, AVATARS, SHOP_PACKS, DAILY_COINS} from './services.js';
import {languages, t} from './i18n.js';
import {Reels} from './reels.js';

const app=document.querySelector('#app');
const modalRoot=document.querySelector('#modal-root');
const toastRoot=document.querySelector('#toast');
const store=createStore();
const params=new URLSearchParams(location.search);
const debug=params.get('debug')==='1';
const SESSION_KEY='f27.sovereign-wealth.session';
const BETS=[25,50,100,200,500];
const MODE_META={
  'royal-mint':{short:'MINT',cabinet:'royal-mint',spinIcon:'spin-mint',titleSymbol:7,aperture:[22.0,29.6,56.0,19.8],title:[15.5,11.5,69.0,15.0],readout:[20.0,54.2,60.0],deck:58.0},
  'jade-treasury':{short:'JADE',cabinet:'jade-treasury',spinIcon:'spin-jade',titleSymbol:7,aperture:[21.0,28.2,58.0,20.8],title:[18.0,7.0,64.0,15.5],readout:[21.0,52.7,58.0],deck:56.7},
  'diamond-foundry':{short:'DIAMOND',cabinet:'diamond-foundry',spinIcon:'spin-foundry',titleSymbol:7,aperture:[21.0,34.2,58.0,16.8],title:[16.5,19.8,67.0,13.3],readout:[20.5,53.7,59.0],deck:57.4},
  'crown-wheel':{short:'CROWN',cabinet:'crown-wheel',spinIcon:'spin-crown',titleSymbol:7,aperture:[28.0,43.4,44.0,13.7],title:[17.0,30.0,66.0,13.4],readout:[24.0,59.1,52.0],deck:61.3},
};
const imageCache=new Map();
let page='login';
let currentMode=null;
let reels=null;
let busy=false;
let auto=false;
let betIndex=2;
let lastWin=0;
let spinHistory=[];
let actionSeq=0;
let rankPage=0;
let profileTab='identity';
let rulesPage=0;
let homeModeIndex=0;
let audioContext=null;

const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const fmt=value=>new Intl.NumberFormat(store.state.lang,{maximumFractionDigits:1,notation:value>=100000?'compact':'standard'}).format(value);
const tr=(key,vars)=>t(key,store.state.lang,vars);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const modeById=id=>MODES.find(mode=>mode.id===id);
const icon=(name,alt='')=>`<img class="ui-icon" src="/art/ui/${name}.png" alt="${esc(alt)}">`;
const symbolPath=(mode,index)=>`/art/symbols/${mode.id}/${index}.png`;
const cabinetPath=mode=>`/art/cabinets/${mode.id}.webp`;
const loadingPath=mode=>`/art/loading/${mode.id}.webp`;
const randomBoard=mode=>Array.from({length:mode.cols},(_,c)=>Array.from({length:mode.rows},(_,r)=>(c+r*2)%6));

function loadImage(src){
  if(imageCache.has(src))return imageCache.get(src);
  const promise=new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>{image.symbolCrop=[0,0,image.naturalWidth,image.naturalHeight];resolve(image)};image.onerror=()=>reject(new Error(`Unable to load ${src}`));image.src=src;});
  imageCache.set(src,promise);return promise;
}
function setProgress(value,label=tr('loading')){
  const bar=document.querySelector('.boot-meter');if(bar){bar.style.setProperty('--progress',`${Math.max(0,Math.min(100,value))}%`);bar.setAttribute('aria-valuenow',String(Math.round(value)));}
  const text=document.querySelector('.boot p');if(text)text.textContent=label;
}
function toast(message){toastRoot.textContent=message;toastRoot.classList.add('show');clearTimeout(toastRoot.timer);toastRoot.timer=setTimeout(()=>toastRoot.classList.remove('show'),2200);}
function setUrl(screen,game){const url=new URL(location.href);url.searchParams.set('screen',screen);if(game)url.searchParams.set('game',game);else url.searchParams.delete('game');history.replaceState(null,'',url);}
function isLogged(){const value=sessionStorage.getItem(SESSION_KEY);return debug?value!=='0':value==='1';}
function clickSound(kind='tap'){
  if(!store.state.sound)return;
  try{audioContext??=new AudioContext();const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();const now=audioContext.currentTime;oscillator.type=kind==='win'?'sine':'triangle';oscillator.frequency.setValueAtTime(kind==='spin'?150:kind==='win'?660:310,now);oscillator.frequency.exponentialRampToValueAtTime(kind==='spin'?72:kind==='win'?980:420,now+.12);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(kind==='win'?.07:.035,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+(kind==='win'?.32:.14));oscillator.connect(gain).connect(audioContext.destination);oscillator.start(now);oscillator.stop(now+.36);}catch{}
}
function cleanupGame(){actionSeq++;busy=false;auto=false;reels?.destroy();reels=null;document.body.classList.remove('game-active');}
function topWallet(){return `<div class="coin-purse" aria-label="${esc(tr('balance'))}"><span class="coin-disc">$</span><strong data-wallet>${fmt(store.state.coins)}</strong></div>`;}
function nav(active='home'){
  return `<nav class="royal-nav" aria-label="Primary">${[
    ['home','navHome'],['shop','navShop'],['gifts','navRewards'],['rank','navRank'],['profile','navAccount']
  ].map(([id,key])=>`<button data-page="${id}" class="${active===id?'active':''}" aria-label="${esc(tr(key))}">${icon(id==='profile'?'profile':id)}<span>${esc(tr(key))}</span></button>`).join('')}</nav>`;
}
function ambientFx(){return `<div class="ambient-fx" aria-hidden="true">${Array.from({length:16},(_,i)=>`<i style="--x:${7+(i*31)%88}%;--y:${10+(i*23)%74}%;--d:${-(i*.47)}s;--s:${.65+(i%5)*.13}"></i>`).join('')}<b></b><b></b><b></b></div>`;}

function renderLogin(){
  cleanupGame();page='login';setUrl('login');
  app.innerHTML=`<main class="login-scene scene-shell">
    <img class="scene-backdrop" src="/art/scenes/login-antechamber.webp" alt="">
    ${ambientFx()}<div class="curtain-glow" aria-hidden="true"></div>
    <section class="login-sanctum" aria-labelledby="login-title">
      <img class="royal-emblem" src="/art/emblems/crown-vault.png" alt="">
      <div class="brand-lockup"><span>SOVEREIGN</span><h1 id="login-title">WEALTH</h1><p>${esc(tr('loading'))}</p></div>
      <div class="login-actions">
        <button class="apple-login" data-action="apple"><span aria-hidden="true"></span><b>${esc(tr('apple'))}</b></button>
        <button class="guest-login" data-action="guest">${icon('spin-crown')}<b>${esc(tr('guest'))}</b></button>
      </div>
      <label class="agreement"><input id="agreement" type="checkbox"><span>${esc(tr('agree'))}</span></label>
      <div class="legal-links"><button data-legal="terms">${esc(tr('terms'))}</button><i></i><button data-legal="privacy">${esc(tr('privacy'))}</button></div>
      <small class="service-status">${esc(tr('appleUnavailable'))}</small>
    </section>
  </main>`;
}
function renderHome(){
  cleanupGame();page='home';setUrl('home');
  const s=store.state,mode=MODES[homeModeIndex],modeNumber=String(homeModeIndex+1).padStart(2,'0');
  app.innerHTML=`<main class="lobby-scene scene-shell mode-${mode.id}">
    <img class="scene-backdrop lobby-backdrop" src="/art/scenes/lobby-treasury.webp" alt="Royal treasury gallery">
    ${ambientFx()}
    <header class="lobby-header"><button class="portrait-button avatar-${s.avatar}" data-page="profile" aria-label="${esc(tr('profile'))}"><img src="${symbolPath(MODES[3],Math.min(7,AVATARS.indexOf(s.avatar)))}" alt=""></button>${topWallet()}<button class="round-action" data-page="gifts" aria-label="${esc(tr('mail'))}">${icon('mail')}<span class="unread-dot ${s.mail.some(item=>!item.read)?'visible':''}"></span></button></header>
    <section class="lobby-brand"><img src="/art/emblems/crown-vault.png" alt=""><div><span>SOVEREIGN</span><h1>WEALTH</h1><p>FOUR TREASURIES · FOUR TRADITIONS</p></div></section>
    <section class="treasury-showcase" aria-label="${esc(tr('home'))}">
      <button class="lobby-arrow previous" data-mode-step="-1" aria-label="Previous treasury">‹</button>
      <div class="showcase-arch" aria-hidden="true"><i></i><b></b></div>
      <button class="treasury-main-entry" data-game="${mode.id}">
        <span class="mode-number">TREASURY ${modeNumber}</span>
        <span class="entry-sigil"><img src="${symbolPath(mode,homeModeIndex)}" alt=""></span>
        <span class="entry-copy"><strong>${esc(tr(mode.id))}</strong><small>${esc(tr(`${mode.id}-rule`))}</small><b>${esc(tr('enter'))}<i>›</i></b></span>
      </button>
      <button class="lobby-arrow next" data-mode-step="1" aria-label="Next treasury">›</button>
    </section>
    <div class="treasury-selector" role="tablist" aria-label="Treasury selection">${MODES.map((item,index)=>`<button role="tab" aria-selected="${index===homeModeIndex}" class="${index===homeModeIndex?'active':''}" data-select-mode="${index}"><span><img src="${symbolPath(item,index)}" alt=""></span><b>${esc(tr(item.id))}</b></button>`).join('')}</div>
    <button class="daily-coffer" data-page="gifts">${icon('gifts')}<span><b>${esc(tr('daily'))}</b><small>+${fmt(DAILY_COINS)}</small></span><i>›</i></button>
    ${nav('home')}
  </main>`;
  const showcase=app.querySelector('.treasury-showcase');let startX=0,tracking=false;
  showcase?.addEventListener('pointerdown',event=>{tracking=true;startX=event.clientX;showcase.setPointerCapture?.(event.pointerId);});
  showcase?.addEventListener('pointercancel',()=>{tracking=false;});
  showcase?.addEventListener('pointerup',event=>{if(!tracking)return;tracking=false;const delta=event.clientX-startX;if(Math.abs(delta)>38){homeModeIndex=(homeModeIndex+(delta<0?1:-1)+MODES.length)%MODES.length;renderHome();}});
}
function serviceHeader(title){return `<header class="service-header"><button class="round-action" data-page="home" aria-label="${esc(tr('back'))}">${icon('back')}</button><div><span>SOVEREIGN WEALTH</span><h1>${esc(title)}</h1></div>${topWallet()}</header>`;}
function shopContent(){return `<section class="shop-showcase"><div class="service-intro"><span class="eyebrow">ROYAL RESERVES</span><h2>${esc(tr('shop'))}</h2><p>${esc(tr('purchaseNotice'))}</p></div><div class="coin-pack-grid">${SHOP_PACKS.map((pack,i)=>`<button class="coin-pack pack-${pack.id}" data-pack="${pack.id}"><span class="pack-art">${icon(i>2?'spin-crown':i>1?'spin-foundry':i>0?'spin-jade':'spin-mint')}<i></i></span><b>${fmt(pack.coins)}</b><small>${pack.price}</small></button>`).join('')}</div></section>`;}
function giftsContent(){const s=store.state;return `<section class="reward-hall"><div class="daily-vault ${store.canClaimDaily()?'ready':'claimed'}"><div class="vault-rays"></div>${icon('gifts')}<span><small>DAY ${Math.max(1,(s.dailyClaims%7)+1)}</small><h2>${esc(tr('daily'))}</h2><b>+${fmt(DAILY_COINS)}</b></span><button data-action="claim-daily" ${store.canClaimDaily()?'':'disabled'}>${esc(tr(store.canClaimDaily()?'claim':'claimed'))}</button></div><div class="mail-ledger">${s.mail.map(item=>`<article class="mail-row ${item.read?'read':''}"><span>${icon('mail')}</span><div><b>${esc(item.title)}</b><small>${esc(item.body)}</small></div><button data-mail="${item.id}" ${item.claimed?'disabled':''}>${item.coins?`+${fmt(item.coins)}`:esc(tr(item.claimed?'claimed':'claim'))}</button></article>`).join('')}</div></section>`;}
function rankContent(){const ranks=getRanks(store.state),pages=Math.ceil(ranks.length/8),rows=ranks.slice(rankPage*8,rankPage*8+8);return `<section class="ranking-hall"><div class="ranking-crown">${icon('rank')}<div><span>SEASONAL EXAMPLE BOARD</span><h2>${esc(tr('rank'))}</h2><p>${esc(tr('example'))}</p></div></div><div class="ranking-table">${rows.map(row=>`<div class="rank-row ${row.isPlayer?'is-player':''}"><b>${row.rank}</b><span class="rank-avatar">${esc(row.name.slice(0,1))}</span><strong>${esc(row.name)}<small>${row.isPlayer?esc(tr('you')):esc(tr('example'))}</small></strong><em>${fmt(row.coins)}</em></div>`).join('')}</div><div class="pagination"><button data-rank="prev" ${rankPage===0?'disabled':''}>‹</button><span>${rankPage+1} / ${pages}</span><button data-rank="next" ${rankPage>=pages-1?'disabled':''}>›</button></div></section>`;}
function profileContent(){const s=store.state;const identity=`<div class="identity-pane"><div class="profile-medallion avatar-${s.avatar}"><img src="${symbolPath(MODES[3],Math.min(7,AVATARS.indexOf(s.avatar)))}" alt=""></div><form class="rename-form" data-form="rename"><label>${esc(tr('rename'))}<input name="name" maxlength="20" value="${esc(s.name)}"></label><button type="submit">${esc(tr('save'))}</button></form><div class="avatar-grid">${AVATARS.map((avatar,i)=>`<button data-avatar="${avatar}" class="${avatar===s.avatar?'selected':''}" aria-label="${esc(avatar)}"><img src="${symbolPath(MODES[i%4],i%8)}" alt=""></button>`).join('')}</div></div>`;
  const settings=`<div class="settings-pane"><label class="select-setting"><span>${esc(tr('language'))}</span><select data-setting="lang">${languages.map(language=>`<option value="${language.id}" ${language.id===s.lang?'selected':''}>${esc(language.label)}</option>`).join('')}</select></label><button class="setting-switch" data-action="sound"><span>${icon(s.sound?'sound':'mute')}<b>${esc(tr('sound'))}</b></span><i>${s.sound?tr('on'):tr('off')}</i></button><button class="setting-switch" data-action="motion"><span>${icon('auto')}<b>${esc(tr('reducedMotion'))}</b></span><i>${s.reducedMotion?tr('on'):tr('off')}</i></button><div class="account-stats"><span><small>${esc(tr('spins'))}</small><b>${fmt(s.spins)}</b></span><span><small>${esc(tr('bestWin'))}</small><b>${fmt(s.bestWin)}</b></span><span><small>${esc(tr('totalWin'))}</small><b>${fmt(s.totalWin)}</b></span></div><button class="logout-button" data-action="logout">${esc(tr('logout'))}</button></div>`;
  return `<section class="account-hall"><div class="account-tabs"><button data-profile-tab="identity" class="${profileTab==='identity'?'active':''}">${icon('profile')}<span>${esc(tr('profile'))}</span></button><button data-profile-tab="settings" class="${profileTab==='settings'?'active':''}">${icon('rules')}<span>${esc(tr('settings'))}</span></button></div>${profileTab==='identity'?identity:settings}</section>`;}
function renderService(which){
  cleanupGame();page=which;setUrl(which);const title=tr(which==='rank'?'rank':which);
  const content=which==='shop'?shopContent():which==='gifts'?giftsContent():which==='rank'?rankContent():profileContent();
  app.innerHTML=`<main class="service-scene scene-shell service-${which}"><img class="scene-backdrop" src="/art/scenes/service-gallery.webp" alt="">${ambientFx()}${serviceHeader(title)}<div class="service-stage">${content}</div>${nav(which)}</main>`;
}
function showLegal(kind){modalRoot.innerHTML=`<div class="modal-shade open"><section class="ornate-modal legal-modal"><button class="modal-close" data-close>${icon('close')}</button><div class="modal-crest">${icon('rules')}</div><span>SOVEREIGN WEALTH</span><h2>${esc(tr(kind))}</h2><p>${esc(tr(`${kind}Body`))}</p><button class="modal-confirm" data-close>${esc(tr('close'))}</button></section></div>`;}
function showRules(){rulesPage=Math.max(0,Math.min(1,rulesPage));const mode=currentMode;const entries=Object.entries(PAYTABLE[mode.id]);const slice=entries.slice(rulesPage*4,rulesPage*4+4);modalRoot.innerHTML=`<div class="modal-shade open"><section class="ornate-modal rules-modal"><button class="modal-close" data-close>${icon('close')}</button><span>${esc(tr('rules'))}</span><h2>${esc(tr(mode.id))}</h2><p class="rule-copy">${esc(tr(`${mode.id}-rule`))}</p><div class="paytable">${slice.map(([symbol,pays])=>`<div><img src="${symbolPath(mode,symbol)}" alt=""><span>${Object.entries(pays).map(([count,value])=>`<b>${count}× <i>${value}</i></b>`).join('')}</span></div>`).join('')}</div><div class="rule-pager"><button data-rules="prev" ${rulesPage===0?'disabled':''}>‹</button><span>${rulesPage+1} / ${Math.ceil(entries.length/4)}</span><button data-rules="next" ${rulesPage>=Math.ceil(entries.length/4)-1?'disabled':''}>›</button></div><small>${esc(tr('rulesNote'))}</small></section></div>`;}
function showHistory(){modalRoot.innerHTML=`<div class="modal-shade open"><section class="ornate-modal history-modal"><button class="modal-close" data-close>${icon('close')}</button><span>${esc(tr('history'))}</span><h2>${esc(tr('recentSpins'))}</h2><div class="history-list">${spinHistory.length?spinHistory.map((item,i)=>`<div><b>#${spinHistory.length-i}</b><span>${esc(tr(item.mode))}</span><small>${fmt(item.bet)} ${esc(tr('betShort'))}</small><em class="${item.win?'won':''}">${item.win?`+${fmt(item.win)}`:'—'}</em></div>`).join(''):`<p>${esc(tr('noSpins'))}</p>`}</div></section></div>`;}
function showModeLoading(mode){modalRoot.innerHTML=`<div class="mode-arrival open" data-arrival="${mode.id}"><img src="${loadingPath(mode)}" alt=""><div class="arrival-vignette"></div><div class="arrival-copy"><span>${esc(tr(`${mode.id}-kicker`))}</span><h2>${esc(tr(mode.id))}</h2><p>${esc(tr(`${mode.id}-rule`))}</p><div class="arrival-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><small>0%</small></div></div>`;}
async function enterMode(id){
  const mode=modeById(id);if(!mode||busy)return;cleanupGame();busy=true;currentMode=mode;showModeLoading(mode);clickSound();
  const assets=[loadingPath(mode),cabinetPath(mode),...Array.from({length:8},(_,i)=>symbolPath(mode,i))];let done=0;
  try{for(const src of assets){await loadImage(src);done++;const percent=Math.round(done/assets.length*100),overlay=modalRoot.querySelector('.mode-arrival');if(overlay){overlay.style.setProperty('--load',`${percent}%`);overlay.querySelector('.arrival-progress')?.setAttribute('aria-valuenow',String(percent));overlay.querySelector('.arrival-copy small').textContent=`${percent}%`;}}
    await wait(store.state.reducedMotion?20:280);modalRoot.querySelector('.mode-arrival')?.classList.add('departing');await wait(store.state.reducedMotion?20:360);modalRoot.innerHTML='';renderGame(mode);
  }catch(error){modalRoot.innerHTML=`<div class="mode-arrival open failed"><img src="${loadingPath(mode)}" alt=""><div class="arrival-vignette"></div><div class="arrival-copy"><h2>${esc(tr(mode.id))}</h2><p>${esc(error.message)}</p><button data-retry="${mode.id}">${esc(tr('retry'))}</button><button data-page="home">${esc(tr('returnLobby'))}</button></div></div>`;busy=false;}
}
function renderGame(mode){
  cleanupGame();currentMode=mode;page='game';setUrl('game',mode.id);document.body.classList.add('game-active');const meta=MODE_META[mode.id];
  app.innerHTML=`<main class="game-scene theme-${mode.id} scene-shell" style="--ap-x:${meta.aperture[0]}%;--ap-y:${meta.aperture[1]}%;--ap-w:${meta.aperture[2]}%;--ap-h:${meta.aperture[3]}%;--title-x:${meta.title[0]}%;--title-y:${meta.title[1]}%;--title-w:${meta.title[2]}%;--title-h:${meta.title[3]}%;--readout-x:${meta.readout[0]}%;--readout-y:${meta.readout[1]}%;--readout-w:${meta.readout[2]}%;--deck-y:${meta.deck}%">
    <img class="scene-backdrop game-backdrop" src="${loadingPath(mode)}" alt=""><div class="game-vignette"></div>${ambientFx()}
    <header class="game-header"><button class="round-action" data-page="home" aria-label="${esc(tr('back'))}">${icon('back')}</button><button class="round-action" data-action="sound" aria-label="${esc(tr('sound'))}">${icon(store.state.sound?'sound':'mute')}</button></header>
    <div class="machine-stage">
      <div class="machine-halo" aria-hidden="true"></div>
      <div class="cabinet-wrap"><img class="cabinet-art" src="${cabinetPath(mode)}" alt="${esc(tr(mode.id))} cabinet"><div class="cabinet-titleplate"><img class="title-jewel title-jewel-left" src="${symbolPath(mode,meta.titleSymbol)}" alt=""><div class="title-copy"><span class="title-kicker">${esc(tr(`${mode.id}-kicker`))}</span><h1>${esc(tr(mode.id)).split(' ').map(word=>`<b>${word}</b>`).join('')}</h1></div><img class="title-jewel title-jewel-right" src="${symbolPath(mode,meta.titleSymbol)}" alt=""><span class="title-bulbs" aria-hidden="true">${Array.from({length:14},()=>'<i></i>').join('')}</span><i class="title-sweep" aria-hidden="true"></i><u aria-hidden="true"></u></div><div class="reel-aperture"><canvas id="reels" aria-label="${esc(tr(mode.id))} reels"></canvas><div class="glass-sheen"></div></div><div class="cabinet-idle" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><b></b><em></em></div>
        <div class="cabinet-readout"><span><small>${esc(tr('balance'))}</small><b data-wallet>${fmt(store.state.coins)}</b></span><span><small>${esc(tr('lastWin'))}</small><b data-last-win>${fmt(lastWin)}</b></span></div>
        <div class="control-deck">
          <button class="control-orb bet-minus" data-bet="-1" aria-label="${esc(tr('decreaseBet'))}">${icon('minus')}</button>
          <button class="bet-plaque" data-action="bet"><small>${esc(tr('bet'))}</small><b data-bet-value>${fmt(BETS[betIndex])}</b></button>
          <button class="spin-button" data-action="spin" aria-label="${esc(tr('spin'))}">${icon(meta.spinIcon)}<span>${esc(tr('spin'))}</span></button>
          <button class="auto-button ${auto?'active':''}" data-action="auto">${icon('auto')}<span>${esc(auto?tr('autoOn'):tr('auto'))}</span></button>
          <button class="control-orb bet-plus" data-bet="1" aria-label="${esc(tr('increaseBet'))}">${icon('plus')}</button>
        </div>
      </div>
    </div>
    <div class="game-toolbar"><button data-action="rules">${icon('rules')}<span>${esc(tr('rules'))}</span></button><div class="status-ribbon"><i></i><span data-status>${esc(tr('modeReady'))}</span><i></i></div><button data-action="history">${icon('history')}<span>${esc(tr('history'))}</span></button></div>
  </main>`;
  initReels(mode);
}
async function initReels(mode){const images=await Promise.all(Array.from({length:8},(_,i)=>loadImage(symbolPath(mode,i))));if(page!=='game'||currentMode?.id!==mode.id)return;const canvas=document.querySelector('#reels');reels=new Reels(canvas,images,mode,{reduced:store.state.reducedMotion,onCell:()=>clickSound()});reels.settle(randomBoard(mode));busy=false;}
function updateGameReadouts(){document.querySelectorAll('[data-wallet]').forEach(node=>node.textContent=fmt(store.state.coins));document.querySelector('[data-last-win]')?.replaceChildren(document.createTextNode(fmt(lastWin)));document.querySelector('[data-bet-value]')?.replaceChildren(document.createTextNode(fmt(BETS[betIndex])));}
function setStatus(message){const node=document.querySelector('[data-status]');if(node)node.textContent=message;}
async function showWheel(stage,seq){
  const multipliers=[2,3,5,8,10,15,25,50];modalRoot.innerHTML=`<div class="wheel-show open"><div class="wheel-rays"></div><section><span>${esc(tr('scatterTreasure'))}</span><h2>${esc(tr('royalWealthWheel'))}</h2><div class="prize-wheel" style="--turn:${5+stage.wheelIndex/8}turn">${multipliers.map((value,i)=>`<b style="--i:${i}">×${value}</b>`).join('')}<i></i></div><p>×${stage.wins[0].multiplier} · +${fmt(stage.award)}</p></section></div>`;await wait(store.state.reducedMotion?250:2500);if(seq!==actionSeq)return;modalRoot.querySelector('.wheel-show')?.classList.add('leaving');await wait(300);modalRoot.innerHTML='';}
async function showWin(amount,big,seq){
  if(!amount||seq!==actionSeq)return;clickSound('win');const host=document.querySelector('.game-scene');if(!host)return;const show=document.createElement('div');show.className=`win-show ${big?'grand':''}`;show.innerHTML=`<div class="win-rays"></div><div class="coin-rain">${Array.from({length:18},(_,i)=>`<i style="--i:${i};--x:${(i*37)%100}%"></i>`).join('')}</div><section><span>${esc(tr(big?'bigWin':'win'))}</span><b>+${fmt(amount)}</b><small>${esc(tr('tapClose'))}</small></section>`;show.addEventListener('click',()=>show.classList.add('leaving'),{once:true});host.append(show);await wait(store.state.reducedMotion?600:big?2500:1500);show.classList.add('leaving');await wait(320);show.remove();}
async function doSpin(){
  if(busy||!reels||page!=='game')return;const bet=BETS[betIndex];if(store.state.coins<bet){toast(tr('insufficient'));auto=false;return;}
  busy=true;const seq=++actionSeq;clickSound('spin');document.querySelector('.spin-button')?.classList.add('pressed');setStatus(tr('reelsInMotion'));
  const outcome=spin(currentMode.id,bet);const started=store.beginSpin(currentMode.id,bet,outcome.totalWin);if(!started.ok){busy=false;toast(tr(started.error==='insufficientCoins'?'insufficient':started.error));return;}updateGameReadouts();
  const stages=outcome.stages;const first=stages[0];reels.begin(first.grid,{duration:store.state.reducedMotion?80:1750});await wait(store.state.reducedMotion?120:2250);if(seq!==actionSeq)return;reels.settle(first.grid);document.querySelector('.spin-button')?.classList.remove('pressed');
  for(let i=0;i<stages.length;i++){
    const stage=stages[i];if(seq!==actionSeq)return;
    if(i>0&&stage.kind==='nudge'){setStatus(tr('royalNudge'));reels.begin(stage.grid,{duration:520});await wait(store.state.reducedMotion?90:820);reels.settle(stage.grid);}
    if(stage.kind==='expanding-wild'&&stage.expandedReels?.length)setStatus(`${tr('expandingWild')} · ${stage.expandedReels.length}`);
    if(stage.wins.length){reels.highlight(stage.wins);setStatus(`${tr('win')} +${fmt(stage.award)}`);await wait(store.state.reducedMotion?220:760);}
    const next=stages[i+1];if(stage.remove.length&&next){setStatus(`${tr('cascade')} ×${next.multiplier}`);reels.collapse(stage.remove,next.grid);await wait(store.state.reducedMotion?100:470);if(seq!==actionSeq)return;reels.drop(next.grid);await wait(store.state.reducedMotion?120:650);reels.settle(next.grid);}
    if(stage.kind==='wheel')await showWheel(stage,seq);
  }
  if(seq!==actionSeq)return;const settled=store.settleSpin(started.id);if(!settled.ok){toast(settled.error);busy=false;return;}lastWin=outcome.totalWin;spinHistory.unshift({mode:currentMode.id,bet,win:lastWin});spinHistory=spinHistory.slice(0,12);updateGameReadouts();
  const big=lastWin>=bet*10||outcome.feature.wheel;await showWin(lastWin,big,seq);if(seq!==actionSeq)return;reels.clearWins();setStatus(tr('modeReady'));busy=false;
  if(auto&&store.state.coins>=bet){await wait(store.state.reducedMotion?100:420);if(auto&&!busy&&seq===actionSeq)doSpin();}else if(auto){auto=false;renderAutoButton();}
}
function renderAutoButton(){const button=document.querySelector('.auto-button');if(!button)return;button.classList.toggle('active',auto);button.querySelector('span').textContent=auto?tr('autoOn'):tr('auto');}
function closeModal(){modalRoot.querySelector(':scope > div')?.classList.add('leaving');setTimeout(()=>{modalRoot.innerHTML=''},260);}
function setPage(which){if(which==='home')renderHome();else if(['shop','gifts','rank','profile'].includes(which))renderService(which);}

app.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;clickSound();
  if(button.dataset.page){if(busy&&page==='game')return;setPage(button.dataset.page);return;}
  if(button.dataset.game){enterMode(button.dataset.game);return;}
  if(button.dataset.selectMode!==undefined){homeModeIndex=Math.max(0,Math.min(MODES.length-1,Number(button.dataset.selectMode)));renderHome();return;}
  if(button.dataset.modeStep){homeModeIndex=(homeModeIndex+Number(button.dataset.modeStep)+MODES.length)%MODES.length;renderHome();return;}
  if(button.dataset.action==='guest'){if(!document.querySelector('#agreement')?.checked){toast(tr('agree'));return;}sessionStorage.setItem(SESSION_KEY,'1');renderHome();return;}
  if(button.dataset.action==='apple'){toast(tr('appleUnavailable'));return;}
  if(button.dataset.legal){showLegal(button.dataset.legal);return;}
  if(button.dataset.pack){toast(tr('purchaseNotice'));return;}
  if(button.dataset.action==='claim-daily'){const result=store.claimDaily();toast(result.ok?`+${fmt(result.amount)}`:tr('already'));renderService('gifts');return;}
  if(button.dataset.mail){const result=store.claimMail(button.dataset.mail);toast(result.ok?`+${fmt(result.amount)}`:tr('claimed'));renderService('gifts');return;}
  if(button.dataset.rank){const count=Math.ceil(getRanks(store.state).length/8);rankPage=Math.max(0,Math.min(count-1,rankPage+(button.dataset.rank==='next'?1:-1)));renderService('rank');return;}
  if(button.dataset.profileTab){profileTab=button.dataset.profileTab;renderService('profile');return;}
  if(button.dataset.avatar){store.setAvatar(button.dataset.avatar);renderService('profile');return;}
  if(button.dataset.action==='logout'){sessionStorage.setItem(SESSION_KEY,'0');renderLogin();return;}
  if(button.dataset.action==='sound'){store.setSetting('sound',!store.state.sound);if(page==='game')renderGame(currentMode);else renderService('profile');return;}
  if(button.dataset.action==='motion'){store.setSetting('reducedMotion',!store.state.reducedMotion);renderService('profile');return;}
  if(button.dataset.bet&&!busy){betIndex=Math.max(0,Math.min(BETS.length-1,betIndex+Number(button.dataset.bet)));updateGameReadouts();return;}
  if(button.dataset.action==='spin'){doSpin();return;}
  if(button.dataset.action==='auto'&&!busy){auto=!auto;renderAutoButton();if(auto)doSpin();return;}
  if(button.dataset.action==='rules'){showRules();return;}
  if(button.dataset.action==='history'){showHistory();return;}
});
app.addEventListener('change',event=>{if(event.target.matches('[data-setting="lang"]')){store.setSetting('lang',event.target.value);renderService('profile');}});
app.addEventListener('submit',event=>{if(event.target.dataset.form==='rename'){event.preventDefault();const result=store.rename(new FormData(event.target).get('name'));toast(result.ok?tr('save'):tr('invalidName'));renderService('profile');}});
modalRoot.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button){if(event.target.classList.contains('modal-shade'))closeModal();return;}
  if(button.matches('[data-close]')){closeModal();return;}
  if(button.dataset.rules){const pages=Math.ceil(Object.keys(PAYTABLE[currentMode.id]).length/4);rulesPage=Math.max(0,Math.min(pages-1,rulesPage+(button.dataset.rules==='next'?1:-1)));showRules();return;}
  if(button.dataset.retry){closeModal();setTimeout(()=>enterMode(button.dataset.retry),280);return;}
  if(button.dataset.page==='home'){closeModal();setTimeout(renderHome,280);}
});
window.addEventListener('popstate',()=>renderHome());
document.addEventListener('visibilitychange',()=>{if(!audioContext)return;if(document.hidden&&audioContext.state==='running')audioContext.suspend().catch(()=>{});else if(!document.hidden&&store.state.sound&&audioContext.state==='suspended')audioContext.resume().catch(()=>{});});
window.addEventListener('pagehide',()=>{audioContext?.suspend().catch(()=>{});});

async function boot(){
  const core=['/art/scenes/login-antechamber.webp','/art/scenes/lobby-treasury.webp','/art/scenes/service-gallery.webp','/art/emblems/crown-vault.png',...MODES.map(mode=>cabinetPath(mode))];
  let done=0;for(const src of core){try{await loadImage(src)}catch{}done++;setProgress(done/core.length*100);}
  await wait(store.state.reducedMotion?20:180);const requested=params.get('screen'),game=params.get('game');
  if(!isLogged()&&requested!=='login'){renderLogin();return;}
  if(requested==='game'&&modeById(game)){currentMode=modeById(game);await Promise.all(Array.from({length:8},(_,i)=>loadImage(symbolPath(currentMode,i))));renderGame(currentMode);}
  else if(['shop','gifts','rank','profile'].includes(requested))renderService(requested);else if(isLogged())renderHome();else renderLogin();
}
boot();
