// Inspect actual Cocos label bounds and exercise every reading leaf in private
// phone contexts. Layout assertions supplement, rather than replace, screenshots.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(process.env.QA_OUTPUT||'docs/qa/text-centering-20261012/after');
const BASE=process.env.QA_BASE||'http://127.0.0.1:6040/';
const VERSION=process.env.QA_VERSION||'f40-centered-reading-20261012';
const locales=(process.env.QA_LOCALES||'en,zh-CN,zh-TW,ja,ko').split(',');
const sizes=(process.env.QA_SIZES||'320x568,390x844').split(',').map(s=>s.split('x').map(Number));
const modes=['golden-phoenix','jade-dragon','pearl-qilin','amber-panda'];
const scope=process.env.QA_SCOPE||'all';assert(['all','reading','extras'].includes(scope));
fs.mkdirSync(OUT,{recursive:true});
const records=[],errors=[],issues=[];
async function ready(p,screen){await p.waitForFunction(screen=>{const a=window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.root&&!a.busy&&a.page===screen&&!a.node.getChildByName('Atelier loading')&&!a.node.getChildByName('Game mode loading')&&!document.getElementById('csw-preloader');},screen,{timeout:90000});await p.waitForTimeout(140);}
async function call(p,method,...args){await p.evaluate(({method,args})=>window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp')[method](...args),{method,args});await p.waitForTimeout(90);}
async function tap(p,name){const point=await p.evaluate(name=>{const cc=window.cc,a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');const find=n=>n.activeInHierarchy?(n.name===name?n:n.children.map(find).find(Boolean)):undefined;const n=find(a.modal||a.root);if(!n)throw Error('Missing '+name);const b=n.getComponent('cc.UITransform').getBoundingBoxToWorld(),k=innerWidth/cc.view.getVisibleSize().width;return{x:(b.x+b.width/2)*k,y:innerHeight-(b.y+b.height/2)*k};},name);await p.touchscreen.tap(point.x,point.y);await p.waitForTimeout(90);}
async function inspect(p,name,centered=false,capture=false){
 const data=await p.evaluate(()=>{
  const cc=window.cc,a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),scope=a.modal||a.root;
  const k=innerWidth/cc.view.getVisibleSize().width,ctx=document.createElement('canvas').getContext('2d');
  const visible=n=>{if(!n.activeInHierarchy)return false;let alpha=255;for(let v=n;v;v=v.parent)alpha*=((v.getComponent('cc.UIOpacity')?.opacity??255)/255);return alpha>=180;};
  const labels=scope.getComponentsInChildren('cc.Label').filter(l=>l.string&&visible(l.node)).map(l=>{
   const t=l.node.getComponent('cc.UITransform'),b=t.getBoundingBoxToWorld(),scale=b.width/t.width,outline=l.node.getComponent('cc.LabelOutline')?.width||0;
   ctx.font=`${l.isBold?'bold ':''} ${l.fontSize}px ${l.fontFamily||'Arial'}`;
   const lines=l.string.split('\n'),advance=Math.max(...lines.map(s=>ctx.measureText(s).width))+outline*2;
   const inkW=advance*scale*k,inkH=(Math.max(0,lines.length-1)*l.lineHeight+l.fontSize+outline*2)*scale*k;
   const box=[b.x*k,innerHeight-(b.y+b.height)*k,b.width*k,b.height*k];
   const center=[box[0]+box[2]/2,box[1]+box[3]/2];
   return{name:l.node.name,text:l.string,font:l.fontSize,screenFont:l.fontSize*scale*k,align:[l.horizontalAlign,l.verticalAlign],local:[l.node.position.x,l.node.position.y],box,ink:[center[0]-inkW/2,center[1]-inkH/2,inkW,inkH],fits:advance<=t.width+1&&inkH<=box[3]+1,parent:l.node.parent.name};
  });
  const diagrams=scope.getComponentsInChildren('cc.UITransform').filter(t=>t.node.name==='Actual rule diagram').map(t=>{const b=t.getBoundingBoxToWorld();return{name:t.node.name,center:(b.x+b.width/2)*k};});
  return {page:a.page,mode:a.config.id,labels,diagrams,modal:!!a.modal,scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight,innerWidth,innerHeight]};
 });
 const context=await p.viewportSize();const found=[];
 for(const l of data.labels){
  if(l.align[0]!==1||l.align[1]!==1)found.push('Uncentered label alignment: '+l.text);
  if(!l.fits)found.push('Glyphs exceed their frame: '+l.text);
  const [x,y,w,h]=l.ink;if(x<-.8||y<-.8||x+w>context.width+.8||y+h>context.height+.8)found.push('Text outside viewport: '+l.text);
  if(centered&&Math.abs(l.local[0])>.01&&!/PREV|NEXT|上一页|下一页|上一頁|下一頁|前|次|다음|이전/.test(l.text))found.push('Reading block displaced: '+l.text);
 }
 if(centered)for(const d of data.diagrams)if(Math.abs(d.center-context.width/2)>.5)found.push('Diagram displaced');
 if(data.scroll[0]>context.width||data.scroll[1]>context.height)found.push('Document scrolling');
 // Only pairs of visible text are compared; artwork and stable input areas are
 // intentionally larger than their captions. Tiny badge/outline contacts are ignored.
 for(let i=0;i<data.labels.length;i++)for(let j=i+1;j<data.labels.length;j++){
  const a=data.labels[i],b=data.labels[j],[x,y,w,h]=a.ink,[u,v,q,r]=b.ink;
  const dx=Math.min(x+w,u+q)-Math.max(x,u),dy=Math.min(y+h,v+r)-Math.max(y,v);
  if(dx>2&&dy>2)found.push(`Overlapping text: ${a.text} / ${b.text}`);
 }
 const file=capture?name+'.png':undefined;if(file)await p.screenshot({path:path.join(OUT,file)});
 records.push({name,size:context,file,...data,issues:found});issues.push(...found.map(issue=>({name,issue})));
 fs.writeFileSync(path.join(OUT,'text-audit.json'),JSON.stringify({version:VERSION,records,errors,issues},null,2));
 return data;
}
const counter=data=>data.labels.filter(l=>/^\d+ \/ \d+$/.test(l.text)).at(-1)?.text;
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
 for(const [width,height] of sizes)for(const locale of locales){
  const c=await b.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(locale=>localStorage.setItem('fortune-festival-f40.locale.v1',locale),locale);
  const prefix=locale+'-'+width+'x'+height,shots=locale==='en'||(locale==='zh-CN'&&width===320);
  await p.goto(`${BASE}?debug=1&screen=home&v=${VERSION}`);await ready(p,'home');
  if(scope!=='extras'){
  for(const which of ['terms','privacy','support']){
   await call(p,'legal',which);let data=await inspect(p,`${prefix}-${which}-1`,true,shots);const count=Number(counter(data).split(' / ')[1]);
   for(let i=1;i<count;i++){await tap(p,'Next legal page');data=await inspect(p,`${prefix}-${which}-${i+1}`,true,shots);assert.equal(counter(data),`${i+1} / ${count}`);}
   for(let i=count-1;i>0;i--){await tap(p,'Previous legal page');assert.equal(counter(await inspect(p,`${prefix}-${which}-back-${i}`,true)),`${i} / ${count}`);}
   await tap(p,'Close dialog');
  }
  for(const screen of ['home','store','rewards','rank','profile','login','register']){await call(p,'navigate',screen);await ready(p,screen);await inspect(p,`${prefix}-${screen}`,false,shots);}
  await call(p,'navigate','profile');await ready(p,'profile');
  for(const modal of ['accountOptions','languages','editNickname','history','mail']){await call(p,modal);await inspect(p,`${prefix}-${modal}`,false,shots);await tap(p,'Close dialog');}
  await call(p,'navigate','home');await ready(p,'home');
  for(const [i,mode] of modes.entries()){
   await tap(p,'Choose destination '+i);await tap(p,'Enter selected fortune house');await ready(p,'game');
   await inspect(p,`${prefix}-${mode}-cabinet`,false,shots);
   await tap(p,'Rules');let data=await inspect(p,`${prefix}-${mode}-rules-1`,true,shots);let count=Number(counter(data).split(' / ')[1]);
   for(let j=1;j<count;j++){await tap(p,'Next rule page');await inspect(p,`${prefix}-${mode}-rules-${j+1}`,false,shots&&locale==='en');}
   await tap(p,'Feature rules');data=await inspect(p,`${prefix}-${mode}-features-1`,true,shots);count=Number(counter(data).split(' / ')[1]);
   for(let j=1;j<count;j++){await tap(p,'Next rule page');await inspect(p,`${prefix}-${mode}-features-${j+1}`,true,shots&&locale==='en');}
   await tap(p,'Rule diagram');data=await inspect(p,`${prefix}-${mode}-help-1`,true,shots);count=Number(counter(data).split(' / ')[1]);
   for(let j=1;j<count;j++){await tap(p,'Next explanation');await inspect(p,`${prefix}-${mode}-help-${j+1}`,true,shots&&locale==='en');}
   await tap(p,'Close dialog');await tap(p,'Back to salon');await ready(p,'home');
  }
  }
  if(scope!=='reading'){
   await call(p,'navigate','profile');await ready(p,'profile');
   for(const modal of ['avatars','journey','deleteAccount','guestConsent']){
    await call(p,modal);await inspect(p,`${prefix}-${modal}`,false,shots);await tap(p,'Close dialog');
   }
   await call(p,'policyConsent');await inspect(p,`${prefix}-policyConsent`,true,shots);await call(p,'closeModal',true);
   await call(p,'mail');
   for(const id of ['welcome','maintenance','weekend']){
    await tap(p,'Mail item '+id);await inspect(p,`${prefix}-letter-${id}`,true,shots);
    if(id==='welcome'){
     await tap(p,'Collect mail attachment');await inspect(p,`${prefix}-letter-collected`,false,shots);
    }
    await tap(p,'Back to mailbox');
   }
   await tap(p,'Close dialog');await call(p,'history');
   await inspect(p,`${prefix}-history-with-entry`,false,shots);await tap(p,'Close dialog');
   // An isolated test account exercises the supported 18-character limit;
   // existing player data and the user's browser are never touched.
   for(const [kind,nickname] of [['latin','WWWWWWWWWWWWWWWWWW'],['cjk','财富庆典招财纳福财富庆典招财纳福财富']]){
    assert.equal(nickname.length,18);
    await p.evaluate(async nickname=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');if(!await a.services.profile.setNickname(nickname))throw Error('Nickname fixture failed');},nickname);
    await call(p,'navigate','profile');await ready(p,'profile');
    const profile=await inspect(p,`${prefix}-profile-long-name-${kind}`,false,shots);
    const names=profile.labels.filter(l=>l.text.replace(/\s/g,'')===nickname);
    assert.equal(names.length,2);assert(names.every(l=>l.screenFont>=9),'Full-length nickname must stay readable');
    assert(Math.max(...names.map(l=>l.screenFont))>=11.5,'Profile nickname must not collapse to tiny type');
    await call(p,'editNickname');
    await inspect(p,`${prefix}-nickname-18-characters-${kind}`,false,shots);await tap(p,'Close dialog');
   }
  }
  await c.close();console.log('CHECKED '+prefix);
 }
 }finally{await b.close();}
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(issues.length,0,JSON.stringify(issues.slice(0,30),null,2));
 console.log(`PASS ${records.length} rendered text inspections, ${errors.length} page errors.`);
})().catch(e=>{console.error(e);process.exitCode=1});
