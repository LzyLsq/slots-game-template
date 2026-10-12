const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const OUT=path.resolve(process.env.QA_OUTPUT||path.join(__dirname,'../../docs/probability-20261010/runtime'));
fs.mkdirSync(OUT,{recursive:true});
const modes=['golden-phoenix','jade-dragon','pearl-qilin','amber-panda'];
const scales=[.41305,2.4511,1.2776,1.2834];
const errors=[];
async function ready(p){await p.waitForFunction(()=>{const a=window.cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.reels&&!a.busy&&a.page==='game'&&!a.node.getChildByName('Atelier loading')},null,{timeout:90000});await p.waitForTimeout(500);}
async function state(p){return p.evaluate(()=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');return {kind:a.state.kind,bet:a.bet,coins:a.services.economy.balance(),played:a.services.profile.current().gamesPlayed,save:a.services.save.currentScope(),modal:a.modal?.name}});}
async function tap(p,name,optional=false){const point=await p.evaluate(name=>{const cc=window.cc,a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');const walk=n=>n.name===name&&n.activeInHierarchy?n:n.children.map(walk).find(Boolean);const n=walk(a.node);if(!n)return null;const b=n.getComponent('cc.UITransform').getBoundingBoxToWorld(),k=innerWidth/cc.view.getVisibleSize().width;return {x:(b.x+b.width/2)*k,y:innerHeight-(b.y+b.height/2)*k}},name);if(!point){if(optional)return false;throw Error('Missing '+name);}await p.touchscreen.tap(point.x,point.y);return true;}
async function observe(p,expected){await p.evaluate(expected=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');if(a.config.payoutScale!==expected)throw Error('Preview has stale payout factor '+a.config.payoutScale+' != '+expected);if(a.force)throw Error('Unexpected forced result');window.__probabilityRounds=[];const original=a.generator.generate.bind(a.generator);a.generator.generate=(...args)=>{const r=original(...args);window.__probabilityRounds.push({result:structuredClone(r),force:args[3]});return r};},expected);}
async function finish(p){const started=Date.now();while(Date.now()-started<90000){const s=await state(p);if(s.kind==='idle'&&!s.modal){await p.waitForTimeout(180);return state(p);}if(s.modal==='Treasure celebration')await tap(p,'Collect your treasure',true);await p.waitForTimeout(120);}throw Error('Round did not finish');}
async function modeAudit(browser,mode,index){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(mode+': '+e.message));
  await p.goto('http://127.0.0.1:6040/?debug=1&screen=game&game='+mode+'&v=f40-probability-audit-20261010');await ready(p);await observe(p,scales[index]);
  try{
  assert.equal((await state(p)).played,0,'each QA account is fresh and isolated');const rounds=[];
  for(let round=1;round<=12;round++){
    const before=await state(p),count=await p.evaluate(()=>window.__probabilityRounds.length);
    await tap(p,'SPIN');await p.waitForFunction(count=>window.__probabilityRounds.length===count+1,count,{timeout:10000});await tap(p,'SPIN');
    const after=await finish(p),captured=await p.evaluate(()=>window.__probabilityRounds.at(-1)),r=captured.result;
    assert.equal(await p.evaluate(()=>window.__probabilityRounds.length),count+1,'double tap generates exactly one result');
    assert.equal(after.played,before.played+1);assert.equal(r.totalWin,r.baseWin+r.featureWin);
    assert.equal(after.coins,before.coins-before.bet+r.totalWin);assert(!after.save.pendingSpin);
    const ids=new Set(before.save.transactions.map(t=>t.id)),tx=after.save.transactions.filter(t=>!ids.has(t.id)&&['spin-bet','spin-win'].includes(t.type));
    assert.equal(tx.filter(t=>t.type==='spin-bet').length,1);assert.equal(tx.filter(t=>t.type==='spin-win').length,r.totalWin>0?1:0);
    assert(tx.every(t=>t.reference===tx[0].reference));assert.equal(tx.reduce((s,t)=>s+t.amount,0),r.totalWin-before.bet);
    const minimum=round===5?5:round===10?10:undefined;
    assert.equal(captured.force.newcomerMinimum,minimum);assert.equal(captured.force.winTier,undefined);
    const benefit=r.wins.filter(w=>w.symbolId==='newcomer-benefit').reduce((s,w)=>s+w.credits,0);
    if(minimum)assert(r.totalWin>=minimum*before.bet);else assert.equal(benefit,0);
    for(const ws of [r.wins,...(r.featureResult?.rounds.map(t=>t.wins)||[])])if(mode==='pearl-qilin'){
      const cells=ws.filter(w=>w.kind==='cluster').flatMap(w=>w.positions);assert.equal(new Set(cells).size,cells.length);
    }
    const rejected=await p.evaluate(({id,win})=>window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').services.economy.settleSpin(id,win),{id:tx[0].reference,win:r.totalWin});assert.equal(rejected,false);assert.equal((await state(p)).coins,after.coins);
    rounds.push({round,chargedBet:before.bet,totalWin:r.totalWin,minimum:minimum||0,benefit,played:after.played,balance:after.coins,feature:!!r.feature});
    if(round===4||round===10){await p.reload();await ready(p);assert.equal((await state(p)).played,round);assert.equal((await state(p)).coins,after.coins);await observe(p,scales[index]);}
  }
  const settled=await state(p);const reserved=await p.evaluate(id=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');return a.services.economy.reserveSpin(id,a.bet)},'probability-recovery-'+mode);assert(reserved);assert.equal((await state(p)).coins,settled.coins-settled.bet);
  await p.reload();await ready(p);const recovered=await state(p);assert.equal(recovered.coins,settled.coins);assert.equal(recovered.played,12);assert(!recovered.save.pendingSpin);
  if(mode==='pearl-qilin'){await tap(p,'Rules');await p.screenshot({path:path.join(OUT,'qilin-rules.png')});}
  const report={gameId:mode,payoutScale:scales[index],rounds,pendingRefundRestored:true,duplicateSettlementRejected:true,scope:'Isolated fresh local account. Real crypto RNG, production generator, touch input and wallet settlement; no forced wins. Reduced motion speeds presentation only.'};
  fs.writeFileSync(path.join(OUT,mode+'.json'),JSON.stringify(report,null,2)+'\n');await ctx.close();console.log('PASS '+mode+' twelve actual rounds, milestones, reload, repeated input and settlement, pending refund');return report;
  }catch(error){await p.screenshot({path:path.join(OUT,mode+'-failure.png')});fs.writeFileSync(path.join(OUT,mode+'-failure.json'),JSON.stringify({state:await state(p),rounds:await p.evaluate(()=>window.__probabilityRounds)},null,2)+'\n');await ctx.close();throw error;}
}
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{const settled=await Promise.allSettled(modes.map((mode,i)=>modeAudit(b,mode,i)));for(const r of settled)if(r.status==='rejected')errors.push(String(r.reason?.stack||r.reason));fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify({errors,modes: settled.filter(r=>r.status==='fulfilled').map(r=>r.value.gameId)},null,2)+'\n');assert.equal(errors.length,0,errors.join('\n'));}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
