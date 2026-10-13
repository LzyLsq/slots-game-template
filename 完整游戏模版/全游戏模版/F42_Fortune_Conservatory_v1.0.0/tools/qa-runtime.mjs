import {launchBrowser,baseUrl,sourceFingerprint} from './qa-support.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const page=await context.newPage();const errors=[],failedRequests=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failedRequests.push(r.url());});
const url=baseUrl;
const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);console.log('PASS',name);};
const wait=()=>page.waitForFunction(()=>window.F42_QA&&!document.querySelector('#splash'));
const snap=()=>page.evaluate(()=>F42_QA.snapshot());
const texts=()=>page.evaluate(()=>{const nodes=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(w.nextNode()){const n=w.currentNode,p=n.parentElement;if(p&&!p.closest('.notranslate,[data-user-text],script,style')&&p.getClientRects().length&&/[\u4e00-\u9fff]/.test(n.textContent))nodes.push(n.textContent);}return nodes;});
await page.goto(url+'?debug=1');await wait();check('first launch English',await page.locator('html').getAttribute('lang')==='en');check('real login shown',(await snap()).screen==='login');
await page.screenshot({path:'docs/screenshots/login.png'});console.log('LOGIN_CJK',await texts());
await page.locator('[data-action="enter"]').click();check('consent blocks entry',(await snap()).screen==='login');await page.locator('#consent').check();await page.locator('[data-action="enter"]').click();await page.waitForFunction(()=>F42_QA.snapshot().screen==='home');
await page.waitForTimeout(600);check('four lobby choices',await page.locator('.house-tab').count()===4);
const modes=['tiger-treasury','koi-reserve','crane-palace','tortoise-vault'];
for(const mode of modes){await page.locator(`.house-tab[data-game="${mode}"]`).click();await page.waitForTimeout(450);check('in-place lobby '+mode,(await snap()).screen==='home'&&(await snap()).selected===mode);}
await page.locator('[data-action="play"]').click();await page.waitForTimeout(600);check('direct PLAY enters fourth mode',(await snap()).screen==='game'&&(await snap()).selected==='tortoise-vault');
const cjk={};
for(const name of ['bet','rules','shop','daily','club','rank','profile','ledger','settings','privacy','terms']){
 await page.evaluate(name=>F42_QA.open(name),name);await page.waitForTimeout(500);cjk[name]=await texts();await page.screenshot({path:`docs/screenshots/dialog-${name}.png`});await page.locator('.modal-close').click();
}
console.log('UNTRANSLATED',JSON.stringify(cjk));
await page.locator('[data-action="settings"]').click();await page.locator('#language-select').selectOption('zh');await page.waitForTimeout(180);check('Chinese switch',await page.locator('html').getAttribute('lang')==='zh-CN');await page.locator('.modal-close').click();await page.reload();await wait();check('Chinese choice survives reload',await page.locator('html').getAttribute('lang')==='zh-CN');
await page.locator('[data-action="settings"]').click();await page.locator('#language-select').selectOption('en');await page.locator('.modal-close').click();
await page.locator('[data-action="play"]').click();await page.waitForTimeout(550);
for(const mode of modes){await page.locator(`.game-switch [data-game="${mode}"]`).click();await page.waitForTimeout(580);const s=await snap();check('game switch '+mode,s.selected===mode&&s.screen==='game');check('reels geometry '+mode,s.rects[1].rect.left>=s.rects[0].rect.left&&s.rects[1].rect.right<=s.rects[0].rect.right);}
await page.locator('[data-action="shop"]').click();const balance=(await snap()).profile.balance;
await page.locator('[data-action="purchase"][data-pack="purse"]').waitFor();
check('web purchases unavailable without native bridge',await page.locator('[data-action="purchase"]:disabled').count()===3);
await page.locator('[data-action="sync-purchases"]').click();await page.waitForTimeout(150);
check('unavailable purchases never credit coins',(await snap()).profile.balance===balance);
await page.locator('.modal-close').click();
await page.locator('[data-action="daily"]').count();await page.evaluate(()=>F42_QA.open('daily'));await page.locator('[data-action="claim-daily"]').click();await page.locator('[data-action="claim-daily"]:disabled').waitFor();check('daily claim disabled afterwards',await page.locator('[data-action="claim-daily"]').isDisabled());await page.locator('.modal-close').click();
await page.evaluate(()=>F42_QA.open('profile'));await page.locator('[data-action="avatar"][data-avatar="tortoise"]').click();await page.waitForFunction(()=>F42_QA.snapshot().profile.avatar==='tortoise');check('fourth avatar selection',(await snap()).profile.avatar==='tortoise');await page.locator('#profile-name').fill('Gold Guest');await page.locator('[data-action="save-name"]').click();await page.waitForFunction(()=>F42_QA.snapshot().profile.name==='Gold Guest');check('custom name preserved',(await snap()).profile.name==='Gold Guest');await page.locator('.modal-close').click();
for(let i=0;i<5;i++){
 await page.locator('[data-action="spin"]').click();
 for(let t=0;t<150;t++){await page.waitForTimeout(150);if(await page.locator('.award-continue').count())await page.locator('.award-continue').click();const state=await snap();if(!state.busy&&!state.profile.pending)break;if(t===149)throw Error('Spin timeout');}
}
let state=await snap();check('fifth-round newcomer SUPER benefit',state.profile.rounds===5&&state.profile.superReached);check('no pending presentation after collect',state.profile.pending===null);check('all audio decoded',state.audio.decoded===31&&!state.audio.failed);await page.waitForTimeout(650);check('one music track in steady state',(await snap()).audio.playing===1);
for(const tier of ['normal','big','super','mega']){await page.evaluate(t=>{window.previewDone=false;F42_QA.showcase(t).then(()=>window.previewDone=true);},tier);await page.waitForTimeout(tier==='normal'?500:1400);await page.screenshot({path:`docs/screenshots/award-${tier}.png`});check('award text fits '+tier,await page.evaluate(()=>{const regular=document.querySelector('.small-award');if(regular){const burst=document.querySelector('.cabinet-stage>.wealth-flight'),reel=document.querySelector('.reel-window'),b=burst?.getBoundingClientRect(),r=reel?.getBoundingClientRect();if(!b||!r||b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1||+getComputedStyle(burst).zIndex>=+getComputedStyle(regular).zIndex)return false;}for(const el of document.querySelectorAll('.small-prize strong,.small-prize p,.award-counter,.award-currency,.award-details,.award-preview')){const r=el.getBoundingClientRect(),w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);while(w.nextNode()){const range=document.createRange();range.selectNodeContents(w.currentNode);if([...range.getClientRects()].some(b=>b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1))return false;}if(el.closest('.small-prize')){const plaque=el.closest('.small-prize').getBoundingClientRect();if(r.left<plaque.left+plaque.width*.07||r.right>plaque.right-plaque.width*.07||r.top<plaque.top+plaque.height*.1||r.bottom>plaque.bottom-plaque.height*.1)return false;}}return true;}));if(tier!=='normal')await page.locator('.award-continue').click();await page.waitForFunction(()=>window.previewDone);}
await page.reload();await wait();check('wallet persists after reload',(await snap()).profile.balance===state.profile.balance);
await fs.writeFile('docs/runtime-audit.json',JSON.stringify({date:new Date().toISOString(),sourceFingerprint:await sourceFingerprint(),checks,errors,failedRequests,untranslated:cjk,final:(await snap()),note:'Desktop Chrome mobile viewport emulation; not physical iPhone validation.'},null,2));
check('no browser runtime errors',errors.length===0);check('no missing assets',failedRequests.length===0);await browser.close();
