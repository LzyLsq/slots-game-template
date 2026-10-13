// Private accounts, actual Cocos touch input; recorded motion is visual evidence,
// never a native performance benchmark or a natural RNG probability sample.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(process.env.QA_OUTPUT||'docs/qa/f44-final-20261013/motion');
const modes=['golden-otter','moon-rabbit','star-fox','cloud-elephant'];
fs.mkdirSync(OUT,{recursive:true});
const errors=[],results=[];
async function tap(p,name){const v=await p.evaluate(name=>{const cc=window.cc,a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');const find=n=>n.activeInHierarchy&&(n.name===name||n.name==='Input area · '+name)?n:n.children.map(find).find(Boolean);const n=find(a.root);if(!n)throw Error('Missing '+name);const b=n.getComponent('cc.UITransform').getBoundingBoxToWorld(),r=cc.game.canvas.getBoundingClientRect(),v=cc.view.getVisibleSize();return{x:(b.x+b.width/2)/v.width*r.width+r.x,y:r.bottom-(b.y+b.height/2)/v.height*r.height};},name);await p.touchscreen.tap(v.x,v.y);}
async function ready(p){await p.waitForFunction(()=>{const a=window.cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.reels&&!a.busy&&!a.node.getChildByName('Atelier loading')&&!document.querySelector('#csw-preloader');},null,{timeout:90000});}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{for(const mode of modes){
 const dir=path.join(OUT,mode);fs.mkdirSync(dir,{recursive:true});const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir,size:{width:390,height:844}}});const p=await c.newPage();p.on('pageerror',e=>errors.push({mode,message:e.message}));
 await p.goto((process.env.QA_BASE_URL||'http://127.0.0.1:6044')+'/?debug=1&screen=game&game='+mode+'&v=f44-continuous-final');await ready(p);await p.waitForTimeout(600);
 await p.evaluate(()=>{window.app=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');window.__guardianFrames=[];const start=performance.now();const sample=()=>{const g=app.plane.getComponentInChildren('CabinetGuardian');window.__guardianFrames.push({time:(performance.now()-start)/1000,blink:g.blink,gesture:g.gesture,nod:g.nod,scale:[g.node.scale.x,g.node.scale.y],joints:g.joints.map(j=>j.angle)});if(performance.now()-start<6400)requestAnimationFrame(sample);};sample();});
 for(let i=0;i<9;i++){await p.screenshot({path:path.join(dir,'idle-'+i+'.png')});await p.waitForTimeout(720);}
 const frames=await p.evaluate(()=>window.__guardianFrames);assert(frames.some(f=>f.blink>.95),mode+' keeps blinking');assert(Math.max(...frames.map(f=>Math.abs(f.gesture)))>.09);assert(frames.every(f=>f.scale[0]===1&&f.scale[1]===1),mode+' root never scale-pumps');
 const before=await p.evaluate(()=>({balance:app.services.economy.balance(),bet:app.bet,rounds:app.services.profile.current().gamesPlayed,tx:app.services.save.currentScope().transactions.length}));
 await p.evaluate(()=>{
  app.force='epic';window.__counterFrames=[];const start=performance.now();
  const sample=()=>{const stage=app.modal?.getComponent('SalonWinStage');
   if(stage){const sprites=stage.digits.slots.filter(s=>s.node.active).map((s,i)=>({character:stage.count.string[i],x:s.node.position.x,height:s.transform.height}));window.__counterFrames.push({time:performance.now()-start,display:stage.count.string,amount:stage.amount,balance:app.services.economy.balance(),visibleBalance:Number(app.balanceLabel.string.replace(/,/g,'')),sprites});}
   if(performance.now()-start<30000&&!(window.__counterFrames.length&&app.state.kind==='idle'&&!app.modal))requestAnimationFrame(sample);
  };requestAnimationFrame(sample);
 });await tap(p,'SPIN');await p.waitForTimeout(420);await p.screenshot({path:path.join(dir,'reels-moving.png')});
 await p.waitForFunction(()=>window.app.modal?.getComponent('SalonWinStage'),null,{timeout:60000});await p.waitForTimeout(1600);await p.screenshot({path:path.join(dir,'award-growing.png')});await tap(p,'Collect your treasure');await p.waitForTimeout(500);await p.screenshot({path:path.join(dir,'award-final.png')});
 // The first touch skips a live count, or collects an already-revealed award.
 // Check the actual phase before a second touch; recorded/headless timing varies.
 const canContinue=await p.evaluate(()=>{const stage=window.app.modal?.getComponent('SalonWinStage');return !!stage&&!stage.finished});
 if(canContinue)await tap(p,'Collect your treasure');
 await p.waitForFunction(()=>window.app.state.kind==='idle'&&!window.app.modal,null,{timeout:20000});await p.waitForTimeout(700);await p.screenshot({path:path.join(dir,'settled.png')});
 const counters=await p.evaluate(()=>window.__counterFrames);assert(counters.length>5,'Continuous award counter observed');
 let last=0;for(const f of counters){assert.equal(f.visibleBalance,f.balance,'Visible wallet matches the committed balance throughout the award');const value=Number(f.display.replace(/,/g,''));assert(value>=last&&value<=f.amount,'Count stays monotonic within the genuine payout');last=value;const cap=Math.min(...f.sprites.filter(s=>/\d/.test(s.character)).map(s=>s.height));for(const g of f.sprites.filter(s=>/[,\.]/.test(s.character)))assert(g.height<cap*.30,'Punctuation stays visually distinct during count');}
 const after=await p.evaluate(()=>({balance:app.services.economy.balance(),rounds:app.services.profile.current().gamesPlayed,win:Number(app.winLabel.string.replace(/[^0-9]/g,'')),tx:app.services.save.currentScope().transactions.slice(-4),kind:app.state.kind,modal:!!app.modal,celebrating:app.audio.celebrating,guardianCount:app.plane.getComponentsInChildren('CabinetGuardian').length}));
 assert.equal(after.rounds,before.rounds+1);assert.equal(after.balance,before.balance-before.bet+after.win);assert.equal(after.guardianCount,1);assert(!after.modal&&!after.celebrating);
 const video=p.video();await c.close();await video.saveAs(path.join(dir,'continuous.webm'));const original=await video.path();if(original!==path.join(dir,'continuous.webm'))fs.unlinkSync(original);
 results.push({mode,before,after,frames,counters,scope:'Forced EPIC uses actual paid reservation and settlement for presentation QA. This is not natural probability evidence.'});console.log('PASS continuous '+mode);
 }
 assert.equal(errors.length,0);
}finally{await browser.close();fs.writeFileSync(path.join(OUT,'motion-audit.json'),JSON.stringify({results,errors,scope:'Desktop Chromium engine preview with recording. No native device or frame-rate claim.'},null,2)+'\n');}
})().catch(e=>{console.error(e);process.exit(1)});
