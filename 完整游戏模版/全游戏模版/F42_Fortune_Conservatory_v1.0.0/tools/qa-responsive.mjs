import {launchBrowser,baseUrl,sourceFingerprint} from './qa-support.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await launchBrowser();
const modes=['tiger-treasury','koi-reserve','crane-palace','tortoise-vault'],report=[];
for(const [width,height] of [[320,568],[390,844],[430,932],[568,320],[844,390],[1280,800]]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const screen of ['login','home',...modes]){
  const query=screen==='login'?'?debug=1':screen==='home'?'?debug=1&screen=home':'?debug=1&screen=game&game='+screen;
  await page.goto(baseUrl+query);await page.waitForFunction(()=>window.F42_QA&&!document.querySelector('#splash'));await page.waitForTimeout(350);
  const metrics=await page.evaluate(()=>{
   const rect=el=>el.getBoundingClientRect().toJSON(),inside=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
   const plane=document.querySelector('.scene-plane'),stage=document.querySelector('.cabinet-stage'),reel=document.querySelector('.reel-window'),deck=document.querySelector('.deck'),tabs=document.querySelector('.game-switch');
   const picture=plane?.querySelector('.scene-picture'),scale=picture?rect(plane).width/picture.naturalWidth:0;
   const continuity=plane&&stage?{aligned:Math.abs(rect(stage).left-rect(plane).left)<1&&Math.abs(rect(stage).top-(rect(plane).top+256*scale))<1&&Math.abs(rect(stage).width-1024*scale)<1&&Math.abs(rect(stage).height-1536*scale)<1,mask:getComputedStyle(document.querySelector('.cabinet-canvas')).maskImage,independentBackdrop:!!document.querySelector('.game .scene-background'),fullLandscape:innerHeight>520||innerWidth<innerHeight||(rect(plane).left<=1&&rect(plane).right>=innerWidth-1&&rect(document.querySelector('#app')).width>=innerWidth-1)}:null;
   const overflow=[];for(const button of document.querySelectorAll('#app button')){const r=rect(button),walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode;if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const b of range.getClientRects())if(!inside(b,r))overflow.push({label:node.textContent,button:button.className,bounds:r,text:rectFrom(b)});}}
   function rectFrom(r){return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}
   const loginOverlap=[];const figure=document.querySelector('.login-guardian'),actions=document.querySelector('.login-actions'),tagline=document.querySelector('.login-tagline');
   if(figure&&getComputedStyle(figure).display!=='none'){const body=rect(figure.querySelector('.mascot-body'));if(body.bottom>rect(actions).top-8)loginOverlap.push('guardian covers consent/actions');if(body.top<rect(tagline).bottom+8)loginOverlap.push('guardian covers tagline');}
   const imageOverflow=[...document.querySelectorAll('.reel-cell img')].filter(im=>!inside(rect(im),rect(im.closest('.reel-cell')))).length;
   const offscreen=[...document.querySelectorAll('#app button:not(:disabled)')].filter(b=>!inside(rect(b),{left:0,right:innerWidth,top:0,bottom:innerHeight})).map(b=>b.dataset.action);
   const deckOverflow=deck?[...deck.querySelectorAll('button,.bet-display')].filter(b=>!inside(rect(b),rect(deck))).map(b=>b.dataset.action||b.className):[];
   const controls=deck?[...deck.querySelectorAll('button')]:[],overlapping=[];for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const a=rect(controls[i]),b=rect(controls[j]);if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlapping.push([controls[i].dataset.action,controls[j].dataset.action]);}
   const touchTargets=controls.map(el=>{const b=rect(el),pseudo=getComputedStyle(el,'::before'),w=Math.max(b.width,parseFloat(pseudo.width)||0),h=Math.max(b.height,parseFloat(pseudo.height)||0);return {el,action:el.dataset.action,left:(b.left+b.right-w)/2,right:(b.left+b.right+w)/2,top:(b.top+b.bottom-h)/2,bottom:(b.top+b.bottom+h)/2,width:w,height:h};});
   const touchFailures=touchTargets.filter(t=>t.width<43.9||t.height<43.9||[[t.left+2,t.top+2],[t.right-2,t.top+2],[t.left+2,t.bottom-2],[t.right-2,t.bottom-2]].some(([x,y])=>document.elementFromPoint(x,y)?.closest('button')!==t.el)).map(t=>t.action);
   const touchOverlap=[];for(let i=0;i<touchTargets.length;i++)for(let j=i+1;j<touchTargets.length;j++){const a=touchTargets[i],b=touchTargets[j];if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.5)touchOverlap.push([a.action,b.action]);}
   const clippedText=[];for(const el of document.querySelectorAll('.game-status,.lobby-mode-summary,.lobby-notice,.bet-display,.feature-badge')){if(el.hidden||!el.getClientRects().length)continue;const r=rect(el),w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);while(w.nextNode()){const range=document.createRange();range.selectNodeContents(w.currentNode);if([...range.getClientRects()].some(b=>!inside(b,r)))clippedText.push(el.className);}}
   return {loginOverlap,touchFailures,touchOverlap,continuity,deckOverflow,overlapping,clippedText,activeScreen:F42_QA.snapshot().screen,selected:F42_QA.snapshot().selected,lang:document.documentElement.lang,overflow,imageOverflow,offscreen,cabinet:stage?rect(stage):null,reel:reel?rect(reel):null,deck:deck?rect(deck):null,tabs:tabs?rect(tabs):null};
  });
  // Keep only representative compact/landscape evidence; all 36 views remain in the JSON audit.
  if((width===320&&screen==='login')||(width===320&&screen==='crane-palace')||(width===568&&screen==='tiger-treasury')||(width===844&&screen==='tortoise-vault'))await page.screenshot({path:`docs/screenshots/qa-${width}x${height}-${screen}.png`});
  report.push({width,height,screen,...metrics});
  console.log(`${width}x${height} ${screen}`,JSON.stringify({loginOverlap:metrics.loginOverlap,overflow:metrics.overflow,offscreen:metrics.offscreen,imageOverflow:metrics.imageOverflow,deckOverflow:metrics.deckOverflow,overlapping:metrics.overlapping,clippedText:metrics.clippedText,touchFailures:metrics.touchFailures,touchOverlap:metrics.touchOverlap}));
 }
 assert.equal(errors.length,0,errors.join('\n'));await context.close();
}
await fs.writeFile('docs/responsive-audit.json',JSON.stringify({date:new Date().toISOString(),sourceFingerprint:await sourceFingerprint(),note:'Desktop Chrome emulated viewports; not physical iOS devices.',views:report},null,2));await browser.close();
assert.ok(report.every(r=>!r.loginOverlap.length&&!r.overflow.length&&!r.offscreen.length&&!r.imageOverflow&&!r.deckOverflow.length&&!r.overlapping.length&&!r.clippedText.length&&!r.touchFailures.length&&!r.touchOverlap.length&&(!r.continuity||(r.continuity.aligned&&r.continuity.mask==='none'&&!r.continuity.independentBackdrop&&r.continuity.fullLandscape))),'Responsive geometry/text overflow detected; inspect screenshots.');
