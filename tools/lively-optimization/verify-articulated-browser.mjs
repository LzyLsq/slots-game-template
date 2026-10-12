import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const require=createRequire('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const sharp=require('sharp');
const hub=process.env.MASCOT_PREVIEW_HUB||'http://127.0.0.1:63800';
const selected=process.argv.slice(2).filter(a=>/^\d+$/.test(a)).map(Number);
const buildFile=process.argv.find(a=>a.startsWith('--build-results='))?.split('=').slice(1).join('=');
const out=mkdtempSync(join(tmpdir(),'mascot-browser.')),results=[];
console.log('Browser evidence: '+out);
const games=(await(await fetch(hub+'/api/games')).json()).filter(g=>!selected.length||selected.includes(g.id));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});

function appState(){
 const cc=window.cc;if(!cc)return null;
 const q=[cc.director.getScene()];
 while(q.length){const n=q.shift();if(!n)continue;for(const c of n.components||[])if(['AureliaApp','VelvetApp','SlotGame','RegattaApp'].includes(cc.js.getClassName(c)))return c;q.push(...n.children);}
 return null;
}
const appSource=appState.toString();
async function appCall(page,code,arg){return page.evaluate(({appSource,code,arg})=>Function('app','arg',code)(Function('return ('+appSource+')()')(),arg),{appSource,code,arg});}
const spinState=(app,id)=>id===25?(app.busy?'spinning':'idle'):id===27?(app.spinning?'spinning':'idle'):id===28?app.session?.phase:app.state?.kind;
const spinStateSource=spinState.toString();
async function ready(page,game=false){
 await page.waitForFunction(appSource=>{const a=Function('return ('+appSource+')()')();return a&&(a.ready!==false)&&(a.root||a.stage||a.pageRoot||a.content);},appSource,{timeout:40000});
 if(game)await page.waitForFunction(appSource=>{const a=Function('return ('+appSource+')()')();return a?.page==='game'&&(a.reels||a.reelRuntime?.length);},appSource,{timeout:40000});
 await page.waitForTimeout(900);
}
async function enter(page,id,index){
 if(id===25)await appCall(page,'return app.enter(arg);',index);
 else if(id===27)await appCall(page,'return app.enterMode(arg);',['royal-mint','jade-treasury','diamond-foundry','crown-wheel'][index]);
}
async function snapshot(page){return page.evaluate(()=>{
 const nodes=[],actors=[],q=[window.cc?.director.getScene()];
 while(q.length){const n=q.shift();if(!n||!n.activeInHierarchy)continue;
  const sprite=n.getComponent('cc.Sprite'),ui=n.getComponent('cc.UITransform');
  let multipart=false;for(let p=n;p;p=p.parent)if(p.components.some(c=>cc.js.getClassName(c)==='CaravanCatRig'))multipart=true;
  // Optics is a separately rendered additive light sheet, not scene artwork.
  const lightSheet=n.name==='optics'||sprite?.spriteFrame?.name==='optics';
  const largePainting=sprite&&ui&&ui.width*ui.height>=350000&&cc.js.getClassName(sprite)!=='ArticulatedMascot'&&!multipart&&!lightSheet;
  // Include renamed large scene/cabinet sprites, not only known asset names.
  if(largePainting||/^(?:portraits|avatar\d+|hero[0-3]|cabinet[0-3]|harvest-card-[0-3]|caravan-card-[0-3]|canopy-destinations|carnival-destinations|treasury-hall-soft|harvest-hall-soft|jamboree-plaza|marina|salon|golden-hour-tall|jade-treasury-tall|pearl-palace-tall|ruby-revel-tall|Full scene)(?:$|-live-bg$)/.test(n.name)){
   const m=n.worldMatrix;nodes.push({id:n.uuid,name:n.name,m:[m.m00,m.m01,m.m04,m.m05,m.m12,m.m13]});
  }
  for(const c of n.components||[])if(cc.js.getClassName(c)==='ArticulatedMascot')actors.push({id:n.uuid,name:n.name,bones:c.bones.map(b=>b.name),vertices:c.renderData?.data.map(v=>[v.x,v.y])||[]});
  q.push(...n.children);
 }
 return{nodes,actors};
});}
async function checkPose(page){
 const before=await snapshot(page);let maxMovement=0;
 // Ear twitches intentionally have pauses up to 7.7s. Extend only when the
 // short sample has not caught a joint moving; never speed up the animation.
 for(let i=0;i<(before.actors.length&&maxMovement<=.005?24:4);i++){
  await page.waitForTimeout(350);const after=await snapshot(page);
  for(const old of before.nodes){const next=after.nodes.find(n=>n.id===old.id);if(next)assert(old.m.every((v,j)=>Math.abs(v-next.m[j])<.001),'painted artwork drifts: '+old.name);}
  for(const old of before.actors){const next=after.actors.find(n=>n.id===old.id);if(!next)continue;assert(next.vertices.length>0,'empty skin mesh');next.vertices.forEach((v,j)=>{assert(v.every(Number.isFinite));maxMovement=Math.max(maxMovement,Math.hypot(v[0]-old.vertices[j][0],v[1]-old.vertices[j][1]));});}
 }
 if(before.actors.length)assert(maxMovement>.005,'independent joints are not animating');
 return{stationaryArtwork:before.nodes.length,articulatedActors:before.actors.length,bones:before.actors.flatMap(a=>a.bones),maxMovement};
}
async function clickNode(page,names){
 const point=await page.evaluate(names=>{
  const q=[cc.director.getScene()],canvas=document.querySelector('#GameCanvas'),r=canvas.getBoundingClientRect(),origin=cc.view.getVisibleOrigin();
  while(q.length){const n=q.shift();if(!n||!n.activeInHierarchy)continue;if(names.includes(n.name)){
   const ui=n.getComponent('cc.UITransform');if(ui){const b=ui.getBoundingBoxToWorld(),x=b.x+b.width/2,y=b.y+b.height/2;
    return{x:r.left+(x-origin.x)*cc.view.getScaleX()/(canvas.width/canvas.clientWidth),y:r.bottom-(y-origin.y)*cc.view.getScaleY()/(canvas.height/canvas.clientHeight),name:n.name};}
  }q.push(...n.children);}return null;
 },names);
 assert(point,'Missing real input node: '+names.join(', '));
 const viewport=page.viewportSize();assert(point.x>=0&&point.x<=viewport.width&&point.y>=0&&point.y<=viewport.height,'input outside viewport '+point.name);
 await page.mouse.click(point.x,point.y);return point;
}
async function checkWebArtwork(page){
 // Responsive F26 rerenders use a finite cabinet-arrival transition. Wait for
 // that transition rather than misclassifying entry motion as an idle loop.
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.world-art,.cabinet-art')).every(n=>{
  for(let p=n;p;p=p.parentElement)if(p.getAnimations().some(a=>a.playState==='running'&&Number.isFinite(a.effect.getComputedTiming().endTime)))return false;
  return true;
 }),null,{timeout:10000});
 const sample=()=>page.locator('.world-art,.cabinet-art').evaluateAll(nodes=>nodes.map(n=>({src:n.getAttribute('src'),matrix:getComputedStyle(n).transform,rect:[n.getBoundingClientRect().x,n.getBoundingClientRect().y,n.getBoundingClientRect().width,n.getBoundingClientRect().height]})));
 const before=await sample();assert(before.length,'Missing F26 scene artwork');
 for(let i=0;i<8;i++){await page.waitForTimeout(350);const after=await sample();assert.deepEqual(after,before,'F26 painted scene drifts');}
 return{stationaryArtwork:before.length,pureWeb:true};
}
async function clickWeb(page,selector){
 const target=page.locator(selector);await target.waitFor({state:'visible'});
 assert(await target.isEnabled(),'Disabled real input: '+selector);
 const b=await target.boundingBox();assert(b,'Missing real input: '+selector);
 // Decorative button pulses intentionally never settle. A real user clicks
 // the current position; no forced dispatch or disabling animation is needed.
 await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
}
async function verifyPureWeb(page,checks,g){
 await page.locator('#auth-consent').check();await page.locator('[data-action="auth-guest"]').click();await page.waitForSelector('.destination');await page.waitForTimeout(1000);
 checks.push({page:'home',...await checkWebArtwork(page)});await page.screenshot({path:join(out,'F26-home.png')});
 await page.setViewportSize({width:375,height:812});await page.waitForTimeout(1300);checks.push({page:'home',width:375,...await checkWebArtwork(page)});await page.setViewportSize({width:414,height:896});
 const modes=['mint','pearl','reef','beacon'];
 for(let index=0;index<modes.length;index++){
  await page.locator(`[data-game="${modes[index]}"]`).click();await page.waitForSelector('.cabinet-art');await page.waitForSelector('.mode-transition',{state:'detached'});await page.waitForTimeout(1000);
  checks.push({page:'cabinet',index,...await checkWebArtwork(page)});await page.screenshot({path:join(out,`F26-cabinet${index}.png`)});
  await page.setViewportSize({width:375,height:812});await page.waitForTimeout(1300);checks.push({page:'cabinet',index,width:375,...await checkWebArtwork(page)});await page.setViewportSize({width:414,height:896});await page.waitForTimeout(1300);
  for(let cycle=0;cycle<(index===0?2:0);cycle++){
   await clickWeb(page,'[data-action="spin"]');await page.waitForSelector('#app.is-spinning');await page.waitForSelector('#app.is-spinning',{state:'detached',timeout:90000});
   const close=page.locator('[data-action="close"]');if(await close.isVisible())await close.click();
   await page.locator('.game-header [data-page="home"]').click();await page.waitForSelector('.destination');checks.push({page:'spin-back',cycle,realPointer:true});
   if(cycle===0){await page.locator('[data-game="mint"]').click();await page.waitForSelector('.mode-transition',{state:'detached'});await page.waitForSelector('[data-action="spin"]');}
  }
  if(index!==0){await page.locator('.game-header [data-page="home"]').click();await page.waitForSelector('.destination');}
 }
}
try{
 for(const g of games){
  if(buildFile&&g.id!==26){
   const start=Date.now();while(!existsSync(buildFile)||!JSON.parse(readFileSync(buildFile)).some(r=>r.id===g.id&&r.success&&r.compression)){
    if(Date.now()-start>900000)throw Error('Fresh build timeout F'+g.id);
    await new Promise(r=>setTimeout(r,1500));
   }
  }
  const context=await browser.newContext({viewport:{width:414,height:896},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[],failedResources=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)failedResources.push({url:r.url(),status:r.status()});});
  page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')failedResources.push({url:r.url(),reason:r.failure()?.errorText});});
  try{
   await page.goto(g.url+(g.preview?'?debug=1&screen=home':'?debug=1'),{waitUntil:'load'});
   if(g.id===26)await verifyPureWeb(page,checks,g);
   else{
    await ready(page);
    if([25,27].includes(g.id))await appCall(page,g.id===25?'app.page="home";app.render();':'app.navigate("home",true);');
    await page.waitForTimeout(1000);checks.push({page:'home',...await checkPose(page)});await page.screenshot({path:join(out,`F${g.id}-home.png`)});
    await page.setViewportSize({width:375,height:812});await page.waitForTimeout(1300);checks.push({page:'home',width:375,...await checkPose(page)});
    await page.setViewportSize({width:414,height:896});
    for(let index=0;index<4;index++){
     if([25,27].includes(g.id)){await enter(page,g.id,index);await ready(page,true);}
     else{await page.goto(g.url+'?debug=1&screen=game&game='+g.cabinets[index],{waitUntil:'load'});await ready(page,true);}
     checks.push({page:'cabinet',index,...await checkPose(page)});
     await page.screenshot({path:join(out,`F${g.id}-cabinet${index}.png`)});
     await page.setViewportSize({width:375,height:812});await page.waitForTimeout(1300);checks.push({page:'cabinet',index,width:375,...await checkPose(page)});await page.setViewportSize({width:414,height:896});await page.waitForTimeout(1300);
     // Repeat genuine pointer SPIN -> wait -> BACK twice, including projects
     // with different renderers/state machines. QA navigation does not change auth.
     if(index===0){
      for(let cycle=0;cycle<2;cycle++){
       if(cycle){if([25,27].includes(g.id))await enter(page,g.id,0);else await page.goto(g.url+'?debug=1&screen=game&game='+g.cabinets[0]);await ready(page,true);}
       await clickNode(page,g.id===27?['SPIN control']:['SPIN']);await page.waitForTimeout(100);
       assert(await appCall(page,'return ["spinning","presenting"].includes(('+spinStateSource+')(app,arg));',g.id),'SPIN pointer did not start');
       if(g.id===27){
        // F27's grand prize intentionally waits for the player's Collect
        // button. Exercise that actual button, not a forced state mutation.
        await page.waitForFunction(appSource=>{
         const a=Function('return ('+appSource+')()')();if(a&&!a.spinning)return true;
         const q=[cc.director.getScene()];while(q.length){const n=q.shift();if(!n?.activeInHierarchy)continue;if(n.name==='Collect reward'&&n.parent?.name==='Grand fortune stage')return true;q.push(...n.children);}return false;
        },appSource,{timeout:90000});
        if(await appCall(page,'return app.spinning;'))await clickNode(page,['Collect reward']);
       }
       await page.waitForFunction(({appSource,spinStateSource,id})=>['idle','retry','error'].includes(Function('return ('+spinStateSource+')(('+appSource+')(),'+id+')')()),{appSource,spinStateSource,id:g.id},{timeout:90000});
       assert.equal(await appCall(page,'return ('+spinStateSource+')(app,arg);',g.id),'idle','spin did not end idle');
       await clickNode(page,g.id===25?['ui12']:g.id===27?['f27/ui/back']:g.id===28?['Back']:g.id===31?['Back to plaza']:['Back to salon']);await page.waitForFunction(appSource=>Function('return ('+appSource+')()')()?.page==='home',appSource,{timeout:15000});
       await page.waitForTimeout(400);checks.push({page:'spin-back',cycle,realPointer:true});
      }
     }
    }
   }
   assert.equal(errors.length,0,`${errors.length} browser errors: ${[...new Set(errors)].slice(0,3).join(' | ')}`);assert.equal(failedResources.length,0,JSON.stringify(failedResources.slice(0,3)));
   results.push({id:g.id,passed:true,checks,errors,failedResources});console.log(`F${g.id} browser PASS (${checks.length} checks)`);
  }catch(e){results.push({id:g.id,passed:false,error:String(e),checks,errors,failedResources});await page.screenshot({path:join(out,`F${g.id}-failure.png`)}).catch(()=>{});console.log(`F${g.id} browser FAIL: ${e.message}`);}
  await context.close();writeFileSync(join(out,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
 }
 const thumbs=[];for(const r of results){const f=join(out,`F${r.id}-home.png`);if(existsSync(f))thumbs.push({input:await sharp(f).resize(180,390,{fit:'contain',background:'#181818'}).png().toBuffer(),left:thumbs.length%5*180,top:Math.floor(thumbs.length/5)*390});}
 if(thumbs.length)await sharp({create:{width:900,height:Math.ceil(thumbs.length/5)*390,channels:3,background:'#181818'}}).composite(thumbs).png().toFile(join(out,'home-contact-sheet.png'));
}finally{await browser.close();}
console.log('Final browser results: '+join(out,'results.json'));if(results.some(r=>!r.passed))process.exitCode=1;
