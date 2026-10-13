/** Multi-phase browser evidence for complete figures and fixed cabinet joints.
 * Silhouette/anatomical judgement still requires viewing the saved images. */
import {launchBrowser,baseUrl,sourceFingerprint} from './qa-support.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await launchBrowser(),page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const modes=[['tiger','tiger-treasury'],['koi','koi-reserve'],['crane','crane-palace'],['tortoise','tortoise-vault']],errors=[],warnings=[],rows=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
const url=(screen,id)=>baseUrl+`?debug=1&screen=${screen}&game=${id}`;
const ready=async()=>{await page.waitForFunction(()=>window.F42_QA&&!document.querySelector('#splash'));await page.waitForTimeout(100);};
try{
 for(const [theme,id]of modes){
  await page.goto(url('home',id));await ready();
  assert.equal(await page.locator('.mascot-arm').count(),0,'No detachable socket/limb overlay');
  const sprite=page.locator('.mascot-body');assert.ok(await sprite.evaluate(im=>im.complete&&im.naturalWidth>0));
  await page.locator('.mascot').evaluate(el=>{for(const a of el.getAnimations()){a.pause();a.currentTime=0;}});
  const character=await page.screenshot({clip:await page.locator('.mascot').boundingBox()});
  for(const t of [0,800,1600,2500]){
   await page.locator('.mascot').evaluate((el,t)=>{for(const a of el.getAnimations()){a.pause();a.currentTime=t;}},t);
   const position=await page.evaluate(()=>{const m=document.querySelector('.mascot-body').getBoundingClientRect(),title=document.querySelector('.hero-title').getBoundingClientRect();return {top:m.top,bottom:m.bottom,left:m.left,right:m.right,titleTop:title.top};});
   assert.ok(position.left>=0&&position.right<=390&&position.top>=0&&position.bottom<=844,'Full sprite inside viewport');
   assert.ok(position.bottom<=position.titleTop+1,'Feet/tail do not cover name crest');
   checks.push({theme,context:'lobby',time:t/1000,...position});
  }
  await page.screenshot({path:`docs/screenshots/guardian-${theme}-home.png`});
  await page.goto(url('game',id));await ready();const frames=[];
  for(const t of [0,.8,1.6,2.5]){
   await page.evaluate(t=>F42_QA.motionSample(t),t);await page.waitForTimeout(90);
   const snapshot=await page.evaluate(()=>F42_QA.motionSnapshot());assert.equal(snapshot.theme,theme);assert.equal(snapshot.enabled,true);assert.equal(snapshot.time,t);
   frames.push(await page.screenshot({clip:await page.locator('.cabinet-canvas').boundingBox()}));checks.push({theme,context:'cabinet',...snapshot});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  assert.equal(await page.locator('.cabinet-canvas').evaluate(el=>getComputedStyle(el).opacity),'0','Reduced motion shows original COMPLETE static scene');
  await page.emulateMedia({reducedMotion:'no-preference'});
  rows.push({theme,character,frames});
 }
 // Repeated switches must release WebGL contexts and preserve controls.
 for(let i=0;i<16;i++){await page.locator(`.scene:not(.outgoing) [data-action="switch"][data-game="${modes[i%4][1]}"]`).click();await page.waitForFunction(()=>document.querySelectorAll('#app .scene').length===1&&!document.querySelector('.outgoing'));assert.equal(await page.evaluate(()=>F42_QA.snapshot().selected),modes[i%4][1]);}
 assert.ok(!warnings.some(s=>/too many active webgl|context lost/i.test(s)),warnings.join('\n'));
 assert.equal(errors.length,0,errors.join('\n'));
 const image=buf=>`data:image/png;base64,${buf.toString('base64')}`;
 // Evidence consists solely of actual browser capture, not concept mockups.
 await page.setViewportSize({width:1040,height:1430});
 await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:16px;background:#eee7d8;font:14px system-ui;color:#3b3925}h1{font-size:22px;margin:0 0 8px}p{margin:0 0 14px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.col{min-width:0}h2{text-transform:uppercase;text-align:center;font-size:16px}.frame{height:220px;background:#f4efdf;display:grid;place-items:center;margin-bottom:7px;position:relative}.frame img{max-width:100%;max-height:100%}.tag{position:absolute;bottom:3px;left:4px;background:#f4efdf;color:#333;padding:2px 5px;font-size:12px}.character{height:280px}.character img{height:260px;width:auto}</style><h1>F42 · Complete guardian / joint-motion inspection</h1><p>Actual Chrome rendering · 390 × 844 · phases 0 / 0.8 / 1.6 / 2.5 s · feet, shoulders and room stay anchored</p><div class="grid">${rows.map(r=>`<div class="col"><h2>${r.theme}</h2><div class="frame character"><img src="${image(r.character)}"><span class="tag">Full lobby figure</span></div>${r.frames.map((b,i)=>`<div class="frame"><img src="${image(b)}"><span class="tag">${[0,.8,1.6,2.5][i]} s · cabinet</span></div>`).join('')}</div>`).join('')}</div>`);
 await page.screenshot({path:'docs/screenshots/guardian-motion.jpg',type:'jpeg',quality:92,fullPage:true});
 await writeFile('docs/guardian-audit.json',JSON.stringify({date:new Date().toISOString(),sourceFingerprint:await sourceFingerprint(),checks,errors,warnings,switches:16,note:'Actual browser phase captures; not a substitute for human art review.'},null,2));
 console.log('Guardian QA: four complete figures, 32 phase checks, four static fallbacks, 16 switches.');
}finally{await browser.close();}
