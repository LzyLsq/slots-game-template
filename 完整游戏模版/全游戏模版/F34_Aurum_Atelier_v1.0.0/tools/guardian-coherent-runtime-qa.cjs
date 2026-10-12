const {chromium}=require(process.env.F34_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'docs/screenshots/f34-coherent-guardians-v4-20261009');fs.mkdirSync(path.join(OUT,'motion'),{recursive:true});
const report={date:'2026-10-09',artVersion:'coherent-v4',scope:'Isolated Cocos preview contexts, no spins, purchases or real-save edits. Continuous guardian idle cycles, component anticipation/celebration responses and reduced motion. Response probes are not gameplay winnings.',cases:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for(const [mode,w,h,reduce] of [
  ['pearl-palace',390,844,false],['ruby-revel',390,844,false],
  ['pearl-palace',320,568,false],['ruby-revel',320,568,false],
  ['pearl-palace',320,568,true],['ruby-revel',320,568,true]
 ]){
  const tag=(mode==='pearl-palace'?'pearl':'ruby')+'-'+w+'x'+h+(reduce?'-reduced':'');
  const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:reduce?'reduce':'no-preference'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:6035/?debug=1&screen=game&game='+mode+'&v=f34-coherent-guardians-v4-20261009');
  await page.waitForFunction(()=>{
   const a=window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');
   return a?.page==='game'&&a.reels&&!a.busy&&!a.node.getChildByName('Atelier loading')&&a.plane?.getComponentInChildren('CabinetGuardian');
  },null,{timeout:90000});
  await page.waitForTimeout(500);
  // Capture a real 9.6-second idle cycle without screenshot calls. The probe
  // reads the existing node and leaves its clock, state and transformations alone.
  const sample=await page.evaluate(async ({reduce,w})=>{
   const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),g=a.plane.getComponentInChildren('CabinetGuardian');
   const values=[],images=[],started=performance.now();let recorder,chunks=[],nextImage=0,phase='idle',maxPose,minPose;
   const offering=g.node.getChildByName('Pearl gift seated on the plinth');
   const response=w===390&&!reduce;
   const duration=reduce?1600:(response?19600:9600);
   const balanceBefore=a.services.economy.balance();
   if(!reduce){
    const stream=document.querySelector('canvas').captureStream(30);
    recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2400000});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.start(250);
   }
   await new Promise(done=>{const event=window.cc.Director.EVENT_AFTER_DRAW;function take(){
    const elapsed=performance.now()-started;
    if(response&&elapsed>=9600&&phase==='idle'){phase='anticipation';g.watch(true)}
    if(response&&elapsed>=11300&&phase==='anticipation'){phase='celebration';g.celebrate()}
    if(response&&elapsed>=14500&&phase==='celebration'){phase='recovery';g.watch(false)}
    const p=g.body.getWorldPosition(),o=offering?.getWorldPosition();
    values.push({ms:elapsed,phase,angle:g.arm.angle,bodyAngle:g.body.angle,scale:[g.body.scale.x,g.body.scale.y],sole:[p.x,p.y],offering:o?[o.x,o.y]:null,behindTorso:g.arm.parent.children[0]===g.arm});
    if(!reduce&&(!maxPose||g.arm.angle>maxPose.angle))maxPose={ms:elapsed,angle:g.arm.angle,url:document.querySelector('canvas').toDataURL('image/png')};
    if(!reduce&&(!minPose||g.arm.angle<minPose.angle))minPose={ms:elapsed,angle:g.arm.angle,url:document.querySelector('canvas').toDataURL('image/png')};
if(!reduce&&performance.now()-started>=nextImage){images.push({ms:performance.now()-started,angle:g.arm.angle,url:document.querySelector('canvas').toDataURL('image/png')});nextImage+=1200;}if(performance.now()-started>=duration){window.cc.director.off(event,take);done()}}window.cc.director.on(event,take)});
   let bytes;
   if(recorder){await new Promise(done=>{recorder.onstop=done;recorder.stop()});bytes=Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer()));}
   const frames=values.slice(1).map((v,i)=>v.ms-values[i].ms).sort((a,b)=>a-b);
   return {values,images,maxPose,minPose,balanceBefore,bytes,reduced:g.reducedMotion,balance:a.services.economy.balance(),state:a.state.kind,frameClock:{medianMs:frames[Math.floor(frames.length*.5)],p95Ms:frames[Math.floor(frames.length*.95)],maximumMs:frames.at(-1)}};
  },{reduce,w});
  assert(sample.values.every(v=>v.behindTorso),'Wave must remain behind solid corrected torso');
  const angles=sample.values.map(v=>v.angle);let min=Math.min(...angles),max=Math.max(...angles);
  if(reduce){assert(sample.reduced);assert(Math.abs(max-min)<.0001);assert(sample.values.every(v=>Math.abs(v.bodyAngle-sample.values[0].bodyAngle)<.0001))}
  else{const idle=sample.values.filter(v=>v.phase==='idle').map(v=>v.angle);assert(Math.max(...idle)-Math.min(...idle)>4,'Full idle cycle must have visible shoulder motion');fs.writeFileSync(path.join(OUT,'motion',tag+(w===390?'-idle-and-response.webm':'-idle-cycle.webm')),Buffer.from(sample.bytes));}
  for(let i=0;i<sample.images.length;i++)fs.writeFileSync(path.join(OUT,'motion',tag+'-frame-'+i+'.png'),Buffer.from(sample.images[i].url.split(',')[1],'base64'));
  for(const [pose,label] of [[sample.maxPose,'max'],[sample.minPose,'min']])if(pose)fs.writeFileSync(path.join(OUT,'motion',tag+'-'+label+'-pose.png'),Buffer.from(pose.url.split(',')[1],'base64'));
  const final=await page.evaluate(()=>new Promise(done=>{window.cc.director.once(window.cc.Director.EVENT_AFTER_DRAW,()=>done(document.querySelector('canvas').toDataURL('image/png')))}));
  fs.writeFileSync(path.join(OUT,tag+'.png'),Buffer.from(final.split(',')[1],'base64'));
  assert.equal(sample.balanceBefore,sample.balance,'Animation probing must not change the wallet');
  assert(sample.values.every(v=>Math.abs(v.sole[0]-sample.values[0].sole[0])<.001&&Math.abs(v.sole[1]-sample.values[0].sole[1])<.001),'Breathing pivot must stay planted');
  if(mode==='pearl-palace')assert(sample.values.every(v=>v.offering&&Math.abs(v.offering[0]-sample.values[0].offering[0])<.001&&Math.abs(v.offering[1]-sample.values[0].offering[1])<.001),'Pearl gift must remain still');
  if(!reduce)assert(min>=-3.1&&max<=(mode==='pearl-palace'?13.31:17.01),'Limb must remain within reviewed movement range');
  if(w===390&&!reduce){assert(sample.values.some(v=>v.phase==='anticipation'));assert(sample.values.some(v=>v.phase==='celebration'));assert(sample.values.some(v=>v.phase==='recovery'))}

  assert.deepEqual(errors,[]);report.cases.push({tag,mode,width:w,height:h,reducedMotion:reduce,sampleCount:sample.values.length,durationMs:sample.values.at(-1).ms,angleMin:min,angleMax:max,frameClock:sample.frameClock,shoulderBehindTorso:true,solePivotStationary:true,offeringStationary:mode==='pearl-palace',responseProbed:w===390&&!reduce,balance:sample.balance,state:sample.state,errors});
  fs.writeFileSync(path.join(OUT,'motion',tag+'-samples.json'),JSON.stringify(sample.values)+'\n');
  await context.close();console.log('PASS '+tag+' shoulder motion '+min.toFixed(2)+'..'+max.toFixed(2));
 }
 await browser.close();fs.writeFileSync(path.join(OUT,'runtime-qa.json'),JSON.stringify(report,null,2)+'\n');
})().catch(e=>{console.error(e);process.exit(1)});
