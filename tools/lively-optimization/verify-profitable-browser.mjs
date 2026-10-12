import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const require=createRequire('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright'),sharp=require('sharp');
const selected=process.argv.slice(2).filter(a=>/^\d+$/.test(a)).map(Number);
const visualOnly=process.argv.includes('--visual-only');
const buildFile=process.argv.find(a=>a.startsWith('--wait-build='))?.slice(13);
const out=mkdtempSync(join(tmpdir(),'profitable-win-browser.')),results=[];
const games=(await(await fetch('http://127.0.0.1:63800/api/games')).json()).filter(g=>!selected.length||selected.includes(g.id));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
console.log('Browser evidence: '+out);
function appState(){const q=[window.cc?.director.getScene()];while(q.length){const n=q.shift();if(!n)continue;for(const c of n.components||[])if(['AureliaApp','VelvetApp','SlotGame','RegattaApp'].includes(cc.js.getClassName(c)))return c;q.push(...n.children);}return null;}
const appSource=appState.toString();
async function call(page,code,arg){return page.evaluate(({appSource,code,arg})=>Function('app','arg',code)(Function('return ('+appSource+')()')(),arg),{appSource,code,arg});}
async function tree(page){return page.evaluate(()=>{const nodes=[],q=[window.cc?.director.getScene()];while(q.length){const n=q.shift();if(!n?.activeInHierarchy)continue;let p=n,inAward=false;while(p){if(['Treasure celebration','Award','Grand fortune stage','Grand treasure stage'].includes(p.name)){inAward=true;break;}p=p.parent;}nodes.push({name:n.name,text:n.getComponent('cc.Label')?.string,sprite:!!n.getComponent('cc.Sprite'),components:n.components.map(c=>cc.js.getClassName(c)),inAward,finiteGeometry:[n.scale.x,n.scale.y,n.scale.z,n.worldPosition.x,n.worldPosition.y,n.worldPosition.z].every(Number.isFinite)});q.push(...n.children);}return nodes;});}
const stageNames=['Treasure celebration','Award','Grand fortune stage','Grand treasure stage'];
async function clickNode(page,names,optional=false){const p=await page.evaluate(names=>{const canvas=document.querySelector('#GameCanvas'),r=canvas.getBoundingClientRect(),origin=cc.view.getVisibleOrigin(),q=[cc.director.getScene()];while(q.length){const n=q.shift();if(!n?.activeInHierarchy)continue;if(names.includes(n.name)){const u=n.getComponent('cc.UITransform');if(u){const b=u.getBoundingBoxToWorld();return{x:r.left+(b.x+b.width/2-origin.x)*cc.view.getScaleX()/(canvas.width/canvas.clientWidth),y:r.bottom-(b.y+b.height/2-origin.y)*cc.view.getScaleY()/(canvas.height/canvas.clientHeight)};}}q.push(...n.children);}return null;},names);if(!p&&optional)return false;assert(p,'No clickable '+names);const v=page.viewportSize();assert(p.x>0&&p.x<v.width&&p.y>0&&p.y<v.height,'Button outside viewport');await page.mouse.click(p.x,p.y);return true;}
async function waitDone(page){await page.waitForFunction(()=>window.__awardQA?.done,{timeout:15000});assert.equal(await page.evaluate(()=>window.__awardQA.error||null),null);}
async function closeAward(page,id){
 const names=id===25?['Collect award']:id===27?['Collect reward']:id===28?['Collect & continue']:['Collect your treasure'];
 // First press can reveal the full count; second press closes. Real pointers
 // exercise the actual UI handlers instead of mutating animation state.
 for(let i=0;i<24;i++){
  const nodes=await tree(page);
  if(!nodes.some(n=>stageNames.includes(n.name)))return;
  if(nodes.some(n=>names.includes(n.name)))await clickNode(page,names,true);
  await page.waitForTimeout(450);
 }
 assert(!(await tree(page)).some(n=>stageNames.includes(n.name)),'Collect did not close award');
}
async function startAward(page,id,amount,bet){
 return call(page,`window.__awardQA={done:false};let p;
 if(arg.id===25)p=app.presentAward(arg.amount,true,arg.bet);
 else if(arg.id===27)p=app.presentStages({totalWin:arg.amount,bet:arg.bet,stages:[],feature:undefined});
 else if(arg.id===28){
  const grid=app.reels?.grid||[];const original=app.round;
  if(!original){if(!app.session.spin(app.mode,arg.bet,true))throw Error('Cannot prepare test presentation');const s=app.session.state();app.session.reelsStopped(s.id);app.round=s.round;}
  app.round={...app.round,totalWin:arg.amount,bet:arg.bet};app.grandShown=false;app.presenting=false;app.transitioning=false;
  app.finishRound();p=Promise.resolve();
 }else p=[13,14,15,17,18,19,20,21,30,33].includes(arg.id)?app.presentWin(arg.amount,false,false,arg.bet):app.presentWin(arg.amount,false,arg.bet);
 Promise.resolve(p).then(()=>window.__awardQA.done=true,e=>{window.__awardQA.done=true;window.__awardQA.error=String(e)});
 return true;`,{id,amount,bet});
}
async function award(page,g,mode,ratio,animation=false){
 const bet=100,amount=bet*ratio;
 await startAward(page,g.id,amount,bet);
 await page.waitForTimeout(420);
 let nodes=await tree(page),big=nodes.some(n=>stageNames.includes(n.name));
 assert.equal(big,ratio>1,`F${g.id} mode ${mode}: ${ratio}x wrong tier`);
 const invalid=nodes.filter(n=>n.text&&/undefined|NaN/.test(n.text));assert.equal(invalid.length,0,JSON.stringify(invalid));
 assert.equal(nodes.filter(n=>!n.finiteGeometry).length,0,'Non-finite rendered node geometry');
 if(ratio>1){
  // Theme art is loaded asynchronously; the stage shell can precede its sprites.
  await page.waitForFunction(names=>{const q=[cc.director.getScene()];while(q.length){const n=q.shift();if(!n?.activeInHierarchy)continue;if(names.includes(n.name)){const a=[n];let sprites=0,title=false;while(a.length){const s=a.shift();if(!s?.activeInHierarchy)continue;sprites+=!!s.getComponent('cc.Sprite');const t=s.getComponent('cc.Label')?.string;title ||= !!t&&/BIG WIN|大獎|大奖|MEGA|EPIC|GRAND TREASURE|GRAND FORTUNE|ROYAL OVATION/i.test(t);a.push(...s.children);}if(sprites>8&&title)return true;}q.push(...n.children);}return false;},stageNames,{timeout:10000});
  nodes=await tree(page);
  assert(nodes.filter(n=>n.inAward&&n.sprite).length>8,'Missing themed award artwork');
  assert(nodes.some(n=>n.inAward&&n.text&&/BIG WIN|大獎|大奖|MEGA|EPIC|GRAND TREASURE|GRAND FORTUNE|ROYAL OVATION/i.test(n.text)),'Missing award title');
  if(animation){
   await page.waitForFunction(({amount,names})=>{const q=[cc.director.getScene()];while(q.length){const n=q.shift();if(!n?.activeInHierarchy)continue;if(names.includes(n.name)){const labels=[n];while(labels.length){const a=labels.shift();if(!a?.activeInHierarchy)continue;const text=a.getComponent('cc.Label')?.string;if(text&&text.replace(/[+,\s]/g,'')===String(amount))return true;labels.push(...a.children);}}q.push(...n.children);}return false;},{amount,names:stageNames},{timeout:6500});
   await page.screenshot({path:join(out,`F${g.id}-mode${mode}-big.png`)});
  }
  await closeAward(page,g.id);
  if(g.id===28){await page.waitForFunction(appSource=>{const app=Function('return ('+appSource+')()')();return app.session.phase==='idle'&&!app.grandStage;},appSource,{timeout:10000});}
 }
 await waitDone(page);
 assert(!(await tree(page)).some(n=>stageNames.includes(n.name)),'Award did not close');
 return {mode,ratio,big,realCollect:ratio>1,rendered:true,finalAmountVerified:animation};
}
async function enter(page,g,index){
 if([25,27].includes(g.id)){
  if(index===0)await page.goto(g.url+'?debug=1');
  await page.waitForFunction(({appSource,id})=>{const a=Function('return ('+appSource+')()')();return id===27?a?.art?.get('f27/scenes/lobby-treasury')&&a.pageRoot?.name.startsWith('Page '):a?.ready&&a.stage;},{appSource,id:g.id},{timeout:45000});
  if(g.id===25)await call(page,'app.page="home";app.render();return app.enter(arg);',index);
  else{await call(page,'app.navigate("home",true);');await call(page,'return app.enterMode(arg);',['royal-mint','jade-treasury','diamond-foundry','crown-wheel'][index]);}
 }else await page.goto(g.url+'?debug=1&screen=game&game='+g.cabinets[index]);
 await page.waitForFunction(appSource=>{const a=Function('return ('+appSource+')()')();return a?.page==='game'&&a?.ready!==false&&!a.busy&&!a.transition&&!a.transitioning&&(a?.reels||a?.reelRuntime?.length);},appSource,{timeout:45000});
 await page.waitForTimeout(500);
}
async function realSpin(page,g,ratio=undefined){
 if(![25,27,28].includes(g.id)){
  await call(page,`app.accept();if(arg!==undefined){const generate=app.generator.generate.bind(app.generator);app.generator.generate=(...args)=>{const r=generate(...args);r.totalWin=Math.ceil(args[1]*arg);r.wins=[];r.featureResult=undefined;return r;};}app.turbo=true;`,ratio);
 }
 await clickNode(page,g.id===27?['SPIN control']:['SPIN']);await page.waitForTimeout(100);
 assert(await call(page,'return arg===25?app.busy:arg===27?app.spinning:arg===28?app.session.phase!=="idle":app.state.kind!=="idle";',g.id),'SPIN did not start');
 let sawBig=false;
 for(let i=0;i<90;i++){
  const nodes=await tree(page);if(nodes.some(n=>stageNames.includes(n.name)))sawBig=true;
  if(nodes.some(n=>['Collect your treasure','Collect award','Collect reward','Collect & continue'].includes(n.name))){await closeAward(page,g.id);}
  if(await call(page,'return arg===25?!app.busy:arg===27?!app.spinning:arg===28?app.session.phase==="idle":app.state.kind==="idle";',g.id))break;
  await page.waitForTimeout(400);
 }
 assert(await call(page,'return arg===25?!app.busy:arg===27?!app.spinning:arg===28?app.session.phase==="idle":app.state.kind==="idle";',g.id),'SPIN never returned idle');
 if(ratio!==undefined)assert.equal(sawBig,ratio>1,'Real SPIN payout did not reach the correct award tier');
 return {realSpin:true,ratio:ratio??'unmodified-random',sawBig};
}
async function pureWeb(page,g,checks){
 await page.goto(g.url+'?debug=1');await page.locator('#auth-consent').check();await page.locator('[data-action="auth-guest"]').click();await page.waitForSelector('.destination');
 const modes=['mint','pearl','reef','beacon'];
 for(let i=0;i<4;i++){
  await page.locator(`[data-game="${modes[i]}"]`).click();await page.waitForSelector('.mode-transition',{state:'detached'});
  const bet=await page.evaluate(()=>f26.bet);
  for(const ratio of visualOnly?[1.01]:[0,.5,1,1.01,100]){
   await page.evaluate(amount=>f26.previewAward(amount),bet*ratio);await page.waitForTimeout(200);
   const big=await page.locator('.big-win.victory-stage').count()>0;assert.equal(big,ratio>1);
   if(big){await page.waitForTimeout(1700);assert.equal((await page.locator('.victory-stage [data-count-award]').textContent()).replace(/,/g,''),String(bet*ratio));if(ratio===1.01)await page.screenshot({path:join(out,`F26-mode${i}-big.png`)});await page.locator('.victory-stage [data-action="close"]').click();await page.waitForSelector('.victory-stage',{state:'detached'});}
   checks.push({mode:i,ratio,big,realCollect:big,rendered:true});
  }
  if(!visualOnly){const historyBefore=await page.evaluate(()=>f26.history.length);
  assert(await page.evaluate(()=>{const e=document.querySelector('#spin'),r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'SPIN is blocked by an overlay');
  // Continuous cabinet button animation never meets Playwright's stability
  // heuristic. Use its real pointer click after explicitly checking hit testing.
  await page.locator('#spin').click({force:true});await page.waitForFunction(()=>f26.busy,{timeout:5000});await page.waitForFunction(()=>!f26.busy,{timeout:90000});
  assert.equal(await page.evaluate(()=>f26.history.length),historyBefore+1,'Real SPIN did not settle a round');
  if(await page.locator('.victory-stage').count())await page.locator('.victory-stage [data-action="close"]').click();
  checks.push({mode:i,realSpin:true});}
  await page.locator('.game-header [data-page="home"]').click();await page.waitForSelector('.destination');checks.push({mode:i,realBack:true});
 }
}
async function verify(g){
 if(buildFile&&g.id!==26){let done=false;for(let i=0;i<500;i++){if(existsSync(buildFile)){const r=JSON.parse(readFileSync(buildFile)).find(r=>r.id===g.id);if(r){assert(r.success&&r.compression,'Failed fresh build F'+g.id);done=true;break;}}await new Promise(r=>setTimeout(r,1500));}assert(done,'Build timed out F'+g.id);}
 const context=await browser.newContext({viewport:{width:414,height:896},deviceScaleFactor:1}),page=await context.newPage(),checks=[],errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)missing.push({url:r.url(),status:r.status()});});
 page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')missing.push({url:r.url(),error:r.failure()?.errorText});});
 try{
  if(g.id===26)await pureWeb(page,g,checks);
  else for(let mode=0;mode<4;mode++){
   await enter(page,g,mode);
   if(!visualOnly&&mode===0&&!([25,27,28].includes(g.id))){checks.push(await realSpin(page,g,0));checks.push(await realSpin(page,g,1.01));}
   if(!visualOnly&&mode===0)checks.push(await award(page,g,mode,.5));
   if(!visualOnly)checks.push(await award(page,g,mode,1));checks.push(await award(page,g,mode,1.01,true));if(!visualOnly)checks.push(await award(page,g,mode,100));
   if(!visualOnly&&mode===0&&[25,27,28].includes(g.id))checks.push(await realSpin(page,g));
   await clickNode(page,g.id===25?['ui12']:g.id===27?['f27/ui/back']:g.id===28?['Back']:g.id===31?['Back to plaza']:['Back to salon']);
   await page.waitForFunction(appSource=>Function('return ('+appSource+')()')()?.page==='home',appSource,{timeout:12000});checks.push({mode,realBack:true});
  }
  assert.equal(errors.length,0,[...new Set(errors)].slice(0,4).join(' | '));assert.equal(missing.length,0,JSON.stringify(missing.slice(0,4)));
  results.push({id:g.id,passed:true,checks,errors,missing});console.log(`F${g.id} PASS: ${visualOnly?'four modes, actual award artwork/count, real Collect/BACK':'four modes, strict threshold, themed stage, real Collect/SPIN/BACK'}`);
 }catch(e){results.push({id:g.id,passed:false,error:String(e),checks,errors,missing});writeFileSync(join(out,`F${g.id}-failure-tree.json`),JSON.stringify(await tree(page).catch(()=>[]),null,2));await page.screenshot({path:join(out,`F${g.id}-failure.png`)}).catch(()=>{});console.log(`F${g.id} FAIL: ${e.message}`);}
 finally{await context.close();results.sort((a,b)=>a.id-b.id);writeFileSync(join(out,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),visualOnly,games:results},null,2));}
}
try{
 const queue=[...games];await Promise.all(Array.from({length:2},async()=>{while(queue.length)await verify(queue.shift());}));
 const thumbs=[];for(const g of games){const f=join(out,`F${g.id}-mode0-big.png`);if(existsSync(f))thumbs.push({input:await sharp(f).resize(180,390,{fit:'contain',background:'#181818'}).png().toBuffer(),left:thumbs.length%5*180,top:Math.floor(thumbs.length/5)*390});}
 if(thumbs.length)await sharp({create:{width:900,height:Math.ceil(thumbs.length/5)*390,channels:3,background:'#181818'}}).composite(thumbs).png().toFile(join(out,'award-contact-sheet.png'));
}finally{await browser.close();}
console.log('Final browser results: '+join(out,'results.json'));if(results.some(r=>!r.passed))process.exitCode=1;
