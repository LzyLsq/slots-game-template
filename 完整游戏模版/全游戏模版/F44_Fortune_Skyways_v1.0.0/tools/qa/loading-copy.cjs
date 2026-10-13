// Focused rendering fixture for the changed two-line F44 loading rule plate.
// Actual entry/progress/failure paths are separately covered by runtime and readiness.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(process.env.QA_OUTPUT||'docs/qa/f44-final-20261013/loading-copy');
const modes=['golden-otter','moon-rabbit','star-fox','cloud-elephant'];
const expected=['CENTRE LINE\nGOLDEN NUDGE','243 WAYS\nMOONLIGHT VOYAGE','5+ ADJACENT\nCONSTELLATION CASCADE','20 PAYLINES\nCLOUD CARGO HOLD'];
const locales=['en','zh-CN','zh-TW','ja','ko'];
const records=[],errors=[];fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
 for(const [width,height] of [[320,568],[390,844]])for(const locale of locales){
  const c=await b.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(locale=>localStorage.setItem('fortune-skyways-f44.locale.v1',locale),locale);
  for(const [i,mode] of modes.entries()){
   await p.goto(`http://127.0.0.1:6044/?debug=1&screen=game&game=${mode}&v=f44-loading-copy-final`);
   assert.equal(await p.locator('html').getAttribute('lang'),locale,'Requested F44 locale must actually be active');
   await p.waitForFunction(()=>{const a=window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.page==='game'&&!a.busy&&!a.node.getChildByName('Atelier loading')&&!document.getElementById('csw-preloader')},{},{timeout:120000});
   const result=await p.evaluate(()=>{
    const cc=window.cc,a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
    const n=a.gameLoading(a.config);a.loadingProgress(.42,'Preparing your game…');
    const k=innerWidth/cc.view.getVisibleSize().width,ctx=document.createElement('canvas').getContext('2d');
    const labels=n.getComponentsInChildren('cc.Label').filter(l=>l.string&&l.node.activeInHierarchy).map(l=>{
     const t=l.node.getComponent('cc.UITransform'),b=t.getBoundingBoxToWorld();
     ctx.font=`${l.isBold?'bold ':''}${l.fontSize}px ${l.fontFamily||'Arial'}`;
     const lines=l.string.split('\n'),outline=l.node.getComponent('cc.LabelOutline')?.width||0;
     const glyphWidth=Math.max(...lines.map(s=>ctx.measureText(s).width))+2*outline;
     const glyphHeight=(lines.length-1)*l.lineHeight+l.fontSize+2*outline;
     return {text:l.string,font:l.fontSize,align:[l.horizontalAlign,l.verticalAlign],fits:glyphWidth<=t.width+1&&glyphHeight<=t.height+1,box:[b.x*k,innerHeight-(b.y+b.height)*k,b.width*k,b.height*k],local:[l.node.position.x,l.node.position.y]};
    });
    n.destroy();a.loadingProgress=undefined;a.loadingArrival=undefined;return {labels,mode:a.config.id};
   });
   assert.equal(result.mode,mode);assert.equal(result.labels.length,2);
   const rule=result.labels.find(l=>l.text.includes('\n'));assert(rule,'Two-line rule required');
   if(locale==='en')assert.equal(rule.text,expected[i]);else assert.notEqual(rule.text,expected[i],'Cocos loading rule must be translated');
   for(const label of result.labels){assert(label.fits,`${locale} ${mode} text exceeds loading plate: ${label.text}`);assert.deepEqual(label.align,[1,1]);assert.equal(label.local[0],0);const [x,y,w,h]=label.box;assert(x>=-1&&y>=-1&&x+w<=width+1&&y+h<=height+1,'Loading label outside phone');}
   records.push({size:[width,height],locale,mode,...result});
  }
  await c.close();console.log('PASS '+locale+' '+width+'x'+height+' four loading rule plates');
 }
 assert.equal(errors.length,0);console.log('PASS '+records.length+' loading copy fixtures');
 }finally{await b.close();fs.writeFileSync(path.join(OUT,'loading-copy-audit.json'),JSON.stringify({records,errors,fixture:'Rendered the actual Cocos gameLoading() on prepared cabinets with 42% fixture progress. Does not simulate resource timing; actual navigation is tested separately.'},null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});
