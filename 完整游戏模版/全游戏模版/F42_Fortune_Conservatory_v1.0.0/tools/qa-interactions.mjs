import {launchBrowser,baseUrl,sourceFingerprint} from './qa-support.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const page=await context.newPage(),checks=[],errors=[],modes=['tiger-treasury','koi-reserve','crane-palace','tortoise-vault'];
page.on('pageerror',e=>errors.push(e.message));
const check=(label,value)=>{assert.ok(value,label);checks.push(label);console.log('PASS',label);};
const ready=()=>page.waitForFunction(()=>window.F42_QA&&!document.querySelector('#splash'));
const state=selector=>page.locator(selector).evaluate(b=>({rect:b.getBoundingClientRect().toJSON(),socket:getComputedStyle(b).transform,face:getComputedStyle(b.querySelector('.control-face')).transform,label:getComputedStyle(b.querySelector('.control-label')).transform,depressed:b.classList.contains('is-depressed'),material:b.dataset.material}));
const rows=[];
try{
 for(const id of modes){
  await page.goto(baseUrl+'?debug=1&screen=game&game='+id);await ready();
  const sel='[data-action=spin]',button=page.locator(sel),before=await state(sel),box=await button.boundingBox();
  const neutral=await button.screenshot();await button.dispatchEvent('pointerdown',{button:0,pointerId:12});await page.waitForTimeout(100);
  const down=await state(sel),depressed=await button.screenshot();check(id+' fixed mounting',down.socket==='none'&&Math.abs(down.rect.left-before.rect.left)<.01&&Math.abs(down.rect.width-before.rect.width)<.01);
  check(id+' inset face presses independently',down.depressed&&down.face!=='none'&&down.label!=='none');
  await button.dispatchEvent('pointercancel',{pointerId:12});await page.waitForTimeout(450);const released=await state(sel);
  check(id+' pointer cancel restores neutral',!released.depressed&&released.face==='none'&&released.label==='none');
  check(id+' dedicated carved spin material',before.material==='button-spin-'+id.split('-')[0]);
  rows.push({id,neutral,depressed,box});
 }
 await page.locator('[data-action=rules]').focus();await page.keyboard.press('Enter');await page.locator('.modal').waitFor();
 check('keyboard opens rules with intact labels',await page.locator('.modal-content').innerText().then(t=>t.length>100));
 await page.locator('.modal-close').click();
 await page.locator('[data-action=home]').click();await page.waitForFunction(()=>F42_QA.snapshot().screen==='home'&&!document.querySelector('.outgoing'));
 for(const id of modes){await page.locator(`[data-action=select][data-game="${id}"]`).click();await page.waitForTimeout(500);check('lobby selection face cleanup '+id,await page.evaluate(()=>[...document.querySelectorAll('.house-tab')].every(b=>b.classList.contains('selected')?b.dataset.material==='button-jade'&&b.querySelectorAll('.control-face').length===1:!b.dataset.material&&!b.querySelector('.control-face'))));}
 await page.locator('[data-action=play]').click();await page.waitForFunction(()=>F42_QA.snapshot().screen==='game'&&!document.querySelector('.outgoing'));
 const tiers=[];
 for(const tier of ['normal','big','super','mega']){
  await page.evaluate(t=>{window.interactionPreview=false;F42_QA.showcase(t).then(()=>window.interactionPreview=true);},tier);await page.waitForTimeout(700);
  const info=await page.evaluate(()=>({count:document.querySelectorAll('.wealth-flight>img').length,coinZ:+getComputedStyle(document.querySelector('.wealth-flight')).zIndex,totalZ:+getComputedStyle(document.querySelector('.small-award,.award-counter')).zIndex}));
  check(tier+' image coin flight visible beneath amount',info.count>0&&info.coinZ<info.totalZ);
  if(tier!=='normal'){
   const counter=await page.locator('.award-counter').innerText();check(tier+' readable count-up started',Number(counter.replaceAll(',',''))>0);
   await page.waitForFunction(()=>document.querySelector('.award-overlay.complete'));check(tier+' completion remains collectable',await page.locator('.award-continue').isEnabled());
   await page.screenshot({path:`docs/screenshots/award-${tier}.png`});await page.locator('.award-continue').click();
  }
  await page.waitForFunction(()=>window.interactionPreview);await page.waitForTimeout(100);check(tier+' clears transient coin layers',await page.locator('.wealth-flight').count()===0);tiers.push({tier,...info});
 }
 await page.emulateMedia({reducedMotion:'reduce'});const button=page.locator('[data-action=spin]');
 await button.dispatchEvent('pointerdown',{button:0,pointerId:12});await page.waitForTimeout(100);check('OS reduced motion disables moving button faces',!(await state('[data-action=spin]')).depressed);await button.dispatchEvent('pointercancel',{pointerId:12});
 await page.evaluate(()=>{window.interactionPreview=false;F42_QA.showcase('mega').then(()=>window.interactionPreview=true);});await page.waitForTimeout(100);
 check('reduced motion caps particles',await page.locator('.wealth-flight>img').count()<=3);await page.locator('.award-continue').click();await page.waitForFunction(()=>window.interactionPreview);
 check('no interaction runtime errors',errors.length===0);
 await fs.writeFile('docs/interaction-audit.json',JSON.stringify({date:new Date().toISOString(),sourceFingerprint:await sourceFingerprint(),checks,tiers,errors,note:'Actual desktop Chrome interactions; no physical mobile frame-rate or manual audio sign-off.'},null,2));
 const picture=b=>'data:image/png;base64,'+b.toString('base64');await page.setViewportSize({width:1200,height:630});
 await page.setContent(`<style>body{margin:0;padding:24px;background:#f5eddc;color:#365741;font:16px system-ui}h1{font-size:24px}p{font-size:14px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.row{display:flex;justify-content:center;gap:20px;padding:30px 8px;background:#eadfc9;border-radius:8px}img{width:100px;height:100px;object-fit:contain}.label{display:flex;justify-content:space-around;font-size:14px}h2{font-size:17px;text-align:center}</style><h1>F42 · Fixed socket / inset press interaction</h1><p>Actual Chrome captures · Four exclusive carved spin controls · No mockup or enlarged source painting</p><div class=\"grid\">${rows.map(r=>`<div><h2>${r.id}</h2><div class=row><img src=\"${picture(r.neutral)}\"><img src=\"${picture(r.depressed)}\"></div><div class=label><span>Rest</span><span>Pressed</span></div></div>`).join('')}</div><p>Rim remains stationary · Face and label depress together · Pointer-cancel restores neutral · OS reduced-motion honored</p>`);
 await page.screenshot({path:'docs/screenshots/control-feedback.jpg',type:'jpeg',quality:94});
}finally{await browser.close();}
