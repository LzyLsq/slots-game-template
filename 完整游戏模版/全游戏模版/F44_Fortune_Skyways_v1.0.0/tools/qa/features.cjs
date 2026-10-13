const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const P=path.resolve(__dirname,'../..');
const OUT=process.env.QA_OUTPUT?path.resolve(process.env.QA_OUTPUT):path.join(P,'docs/qa/features');fs.mkdirSync(OUT,{recursive:true});
const modes=['golden-otter','moon-rabbit','star-fox','cloud-elephant'];let checks=[],errors=[];
const app=()=>window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
async function ready(p,screen){await p.waitForFunction(screen=>{const a=window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.root&&!a.busy&&!a.node.getChildByName('Atelier loading')&&(!screen||a.page===screen)},screen,{timeout:90000});await p.waitForTimeout(650);}
async function state(p){return p.evaluate(()=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');return {page:a.page,game:a.config.id,kind:a.state.kind,busy:a.busy,modal:a.modal?.name,coins:a.services.economy.balance(),player:a.services.profile.current(),save:a.services.save.currentScope(),auto:a.auto}})}
async function tap(p,name){const point=await p.evaluate(name=>{const cc=window.cc,a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');function walk(n,target){if(n.name===target&&n.activeInHierarchy)return n;for(const c of n.children){const v=walk(c,target);if(v)return v}}const n=walk(a.node,'Input area · '+name)||walk(a.node,name);if(!n)throw Error('Missing active control: '+name);const b=n.getComponent('cc.UITransform').getBoundingBoxToWorld(),r=innerWidth/cc.view.getVisibleSize().width;return {x:(b.x+b.width/2)*r,y:innerHeight-(b.y+b.height/2)*r,w:b.width*r,h:b.height*r}},name);assert(point.x>0&&point.x<390&&point.y>0&&point.y<844,`${name} outside phone: ${JSON.stringify(point)}`);console.log('TAP '+name+' '+JSON.stringify(point));await p.touchscreen.tap(point.x,point.y);await p.waitForTimeout(380);}
async function nav(p,screen){await p.evaluate(screen=>window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').navigate(screen),screen);await ready(p,screen);await p.waitForTimeout(400)}
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);fs.writeFileSync(path.join(OUT,'feature-progress.json'),JSON.stringify({checks,errors},null,2));}
async function close(p){const s=await state(p);if(s.modal==='Modal shield'){await tap(p,'Close dialog');await p.waitForTimeout(300);assert(!(await state(p)).modal);}}
async function finishSpin(p){const start=Date.now();while(Date.now()-start<85000){const s=await state(p);if(s.modal==='Treasure celebration'){try{await tap(p,'Collect your treasure')}catch{}}if(s.kind==='idle')return s;await p.waitForTimeout(450);}throw Error('Spin did not return to idle '+JSON.stringify(await state(p)));}
async function screenshot(p,name){await p.screenshot({path:path.join(OUT,name+'.png')});}
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'natural-fixtures.json')));
 for(const mode of modes){
  await p.goto('http://127.0.0.1:6044/?debug=1&screen=game&game='+mode+'&v='+encodeURIComponent(process.env.QA_VERSION||'f44-final-20261010'));await ready(p,'game');
  await check(mode+' natural feature presentation and single settlement',async()=>{
   await p.evaluate(result=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');a.generator.generate=()=>structuredClone(result)},fixtures[mode].feature);
   const before=await state(p);await tap(p,'SPIN');const seq=[];let screenshotAt=0;
   const start=Date.now();while(Date.now()-start<90000){const st=await state(p);const detail=await p.evaluate(()=>{const a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');return {hint:a.hintLabel?.string,readout:a.winLabel?.string,running:a.reels?.running,transitioning:a.reels?.transitioning,columns:a.reels?.cols?.map(col=>({travel:col.travel,stopped:col.stopped,brake:col.brake}))}});seq.push({t:Date.now()-start,kind:st.kind,modal:st.modal,...detail});
    if(st.kind==='presenting'&&Date.now()-screenshotAt>1800){await screenshot(p,mode+'-feature-'+seq.length);screenshotAt=Date.now();}
    if(st.modal==='Treasure celebration'){await p.waitForTimeout(2500);await screenshot(p,mode+'-feature-award');if((await state(p)).modal==='Treasure celebration'){try{await tap(p,'Collect your treasure')}catch{}}}
    if(st.kind==='idle')break;await p.waitForTimeout(120);
   }
   const after=await state(p);assert.equal(after.kind,'idle');assert.equal(after.coins,before.coins-80+fixtures[mode].feature.totalWin);assert.equal(after.player.gamesPlayed,before.player.gamesPlayed+1);assert(!after.save.pendingSpin);
   assert(seq.some(f=>f.hint?.includes(fixtures[mode].feature.featureResult.rounds[0].caption)),'feature caption never presented');
   fs.writeFileSync(path.join(OUT,mode+'-feature-timeline.json'),JSON.stringify({seed:fixtures[mode].seed,sample:fixtures[mode].sample,round:fixtures[mode].feature,sequence:seq},null,2));
  });
  if(fixtures[mode].ordinary)await check(mode+' ordinary award settles and returns to idle',async()=>{await p.evaluate(result=>{const a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');a.generator.generate=()=>structuredClone(result)},fixtures[mode].ordinary);const before=await state(p);await tap(p,'SPIN');await finishSpin(p);assert.equal((await state(p)).coins,before.coins-80+fixtures[mode].ordinary.totalWin);await screenshot(p,mode+'-ordinary');});
 }
 assert.equal(errors.length,0,errors.join('\n'));await c.close();await b.close();fs.writeFileSync(path.join(OUT,'feature-audit.json'),JSON.stringify({checks,errors,fixtureIsolation:'Generated seeded natural results injected into isolated QA contexts only; production RNG unchanged.'},null,2));console.log('FEATURE DONE');
})().catch(e=>{console.error(e);process.exit(1)});
