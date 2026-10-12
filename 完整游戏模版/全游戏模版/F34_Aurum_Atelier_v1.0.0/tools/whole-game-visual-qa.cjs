/** Inspect final Cocos renders in disposable contexts; never opens the user's tab. */
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const P=path.resolve(__dirname,'..'),O=path.resolve(P,process.env.F34_QA_OUTPUT||'docs/screenshots/f34-whole-game-polish-v6-20261009');
const URL=process.env.F34_QA_URL||'http://127.0.0.1:6035/';
const A="window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp')";
const modes=['golden-hour','jade-treasury','pearl-palace','ruby-revel'];
const pages=['home','login','register','store','rewards','rank','profile'];
const report={date:new Date().toISOString(),scope:process.env.F34_QA_DIALOG_ONLY==='1'?'Isolated Cocos preview. Dialog refresh at 390 × 844: rules and features for all four modes, account dialogs, legal pages and consent. Bounds are diagnostic; screenshots decide visual quality.':'Isolated Cocos preview. Two phone sizes, every primary page, four loading scenes, dialogs and five locales. Bounds are diagnostic; screenshots decide visual quality.',errors:[],cases:[]};
for(const d of ['after','dialogs','loading','locales'])fs.mkdirSync(path.join(O,d),{recursive:true});
async function ready(p){await p.waitForFunction(`window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp')?.root && !(${A}).busy`,null,{timeout:90000});}
async function call(p,method,arg){await p.evaluate(({A,method,arg})=>{const a=(0,eval)(A);return a[method](arg)}, {A,method,arg});await ready(p);await p.waitForTimeout(550);}
async function enterMode(p,id){await p.goto(URL+'?debug=1&screen=game&game='+encodeURIComponent(id)+'&v=f34-whole-game-polish-v6-20261009');await ready(p);await p.waitForTimeout(650);const state=await p.evaluate(A=>{const a=(0,eval)(A);return {page:a.page,game:a.config?.id,modal:!!a.modal}},A);assert.equal(state.page,'game','Game route '+id);assert.equal(state.game,id,'Wrong captured mode '+id);assert.equal(state.modal,false,'Unexpected dialog '+id);}
async function tap(p,name){const q=await p.evaluate(({A,name})=>{const a=(0,eval)(A);function find(n){if(n.name===name&&n.activeInHierarchy)return n;for(const c of n.children){const r=find(c);if(r)return r}}const n=find(a.node);if(!n)throw Error('Missing '+name);const camera=window.cc.director.getScene().getComponentsInChildren('cc.Camera')[0],pt=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return {x:r.x+pt.x/c.width*r.width,y:r.y+r.height-pt.y/c.height*r.height}}, {A,name});await p.touchscreen.tap(q.x,q.y);await ready(p);await p.waitForTimeout(550);}
async function inspect(p,tag,file){if(file)await p.screenshot({path:path.join(O,file)});const data=await p.evaluate(({A,tag})=>{
 const a=(0,eval)(A),cc=window.cc,c=document.querySelector('canvas'),cr=c.getBoundingClientRect(),camera=cc.director.getScene().getComponentsInChildren('cc.Camera')[0];
 const labels=[];
 for(const l of a.node.getComponentsInChildren('cc.Label')){
  const n=l.node;if(!n.activeInHierarchy||!l.string.trim())continue;let alpha=1,ancestor=n;while(ancestor){alpha*=((ancestor.getComponent('cc.UIOpacity')?.opacity??255)/255);ancestor=ancestor.parent}if(alpha<.2)continue;
  const t=n.getComponent('cc.UITransform');if(!t?.isValid)continue;const x0=-t.anchorX*t.width,y0=-t.anchorY*t.height;
  const points=[[x0,y0],[x0+t.width,y0],[x0,y0+t.height],[x0+t.width,y0+t.height]].map(([x,y])=>{const world=t.convertToWorldSpaceAR(new cc.Vec3(x,y,0)),p=camera.worldToScreen(world);return {x:cr.x+p.x/c.width*cr.width,y:cr.y+cr.height-p.y/c.height*cr.height}});
  const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y)),w=Math.max(...points.map(p=>p.x))-x,h=Math.max(...points.map(p=>p.y))-y;
  const cssFont=+(h/t.height*(l.actualFontSize||l._actualFontSize||l.fontSize)).toFixed(2);
  labels.push({text:l.string,parent:n.parent.name,cssFont,rect:[x,y,w,h].map(v=>+v.toFixed(2)),outside:x<-2||y<-2||x+w>innerWidth+2||y+h>innerHeight+2});
 }
 return {tag,page:a.page,game:a.config?.id,locale:localStorage.getItem('aurum-atelier-f34.locale.v1')||'en',balance:a.services.economy.balance(),scroll:[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight],labels};
 }, {A,tag});assert(data.scroll.every(v=>v<=1),'Document overflow '+tag);assert(data.labels.length>0,'No visible labels '+tag);report.cases.push(data);console.log('CAPTURE',tag,'labels',data.labels.length,'outside',data.labels.filter(l=>l.outside).length);return data;}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
 if(process.env.F34_QA_DIALOG_ONLY==='1'){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  for(const id of modes){await enterMode(p,id);for(const features of [false,true]){await p.evaluate(({A,features})=>(0,eval)(A).rules(0,features),{A,features});await p.waitForTimeout(550);await inspect(p,id+(features?'-features':'-rules')+'-390x844','dialogs/'+id+(features?'-features':'-rules')+'-390x844.png');await call(p,'closeModal')}}
  await call(p,'navigate','profile');for(const method of ['languages','editNickname','avatars','accountOptions','history','deleteAccount','mail']){await call(p,method);await inspect(p,method+'-390x844','dialogs/'+method+'-390x844.png');await call(p,'closeModal')}
  for(const type of ['privacy','terms','support']){await call(p,'legal',type);await inspect(p,type+'-390x844','dialogs/legal-'+type+'-390x844.png');await call(p,'closeModal')}
  await call(p,'navigate','login');await call(p,'guestConsent');await inspect(p,'guestConsent-390x844','dialogs/guestConsent-390x844.png');await call(p,'closeModal');await call(p,'policyConsent');await inspect(p,'policyConsent-390x844','dialogs/policyConsent-390x844.png');await call(p,'closeModal');
  await context.close();assert.deepEqual(report.errors,[]);report.passed=true;return;
 }
 for(const [width,height] of [[390,844],[320,568]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(URL+'?debug=1&screen=home&v=f34-whole-game-polish-v6-20261009');await ready(p);
  for(const page of pages){await call(p,'navigate',page);await inspect(p,page+'-'+width+'x'+height,'after/'+page+'-'+width+'x'+height+'.png')}
  for(const id of modes){await enterMode(p,id);await inspect(p,id+'-'+width+'x'+height,'after/'+id+'-'+width+'x'+height+'.png')}
  if(width===320){
   for(const features of [false,true]){await p.evaluate(({A,features})=>(0,eval)(A).rules(0,features),{A,features});await p.waitForTimeout(550);const method=features?'features':'rules';await inspect(p,'small-'+method,'dialogs/'+method+'-320x568.png');await call(p,'closeModal')}
   await call(p,'navigate','profile');for(const method of ['languages','editNickname','avatars','accountOptions','history','deleteAccount','mail']){await call(p,method);await inspect(p,method+'-320x568','dialogs/'+method+'-320x568.png');await call(p,'closeModal')}
   await call(p,'legal','privacy');await inspect(p,'privacy-320x568','dialogs/legal-privacy-320x568.png');await call(p,'closeModal');
   await call(p,'navigate','login');await call(p,'guestConsent');await inspect(p,'guestConsent-320x568','dialogs/guestConsent-320x568.png');await call(p,'closeModal');
  }
  if(width===390){for(const id of modes){await enterMode(p,id);await p.evaluate(A=>{const a=(0,eval)(A);window.__qaLoading=a.gameLoading(a.config);a.loadingProgress(.66,'Preparing your collection…')},A);await p.waitForTimeout(550);await inspect(p,'loading-'+id,'loading/'+id+'-390x844.png');await p.evaluate(A=>{const a=(0,eval)(A);window.__qaLoading.destroy();a.loadingProgress=undefined;a.loadingArrival=undefined},A)}}
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:320,height:568},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(URL+'?debug=1&screen=profile&v=f34-whole-game-polish-v6-20261009');await ready(p);
 for(const locale of ['en','zh-CN','zh-TW','ja','ko']){
  await call(p,'navigate','profile');await call(p,'languages');await tap(p,'Locale '+locale);
  for(const page of pages){await call(p,'navigate',page);await inspect(p,locale+'-'+page,locale!=='en'&&['register','store','profile'].includes(page)?'locales/'+locale+'-'+page+'-320x568.png':undefined)}
  for(const id of modes){await enterMode(p,id);await inspect(p,locale+'-'+id,locale==='ko'?'locales/ko-'+id+'-320x568.png':undefined);await call(p,'rules');await inspect(p,locale+'-'+id+'-rules',locale==='ja'&&id==='ruby-revel'?'locales/ja-ruby-revel-rules-320x568.png':undefined);await call(p,'closeModal')}
 }
 await context.close();assert.deepEqual(report.errors,[]);report.passed=true;
 }finally{fs.writeFileSync(path.join(O,process.env.F34_QA_DIALOG_ONLY==='1'?'dialog-refresh-qa.json':'visual-runtime-qa.json'),JSON.stringify(report,null,2)+'\n');await browser.close()}})().catch(e=>{report.failure=e.stack;fs.writeFileSync(path.join(O,process.env.F34_QA_DIALOG_ONLY==='1'?'dialog-refresh-qa.json':'visual-runtime-qa.json'),JSON.stringify(report,null,2)+'\n');console.error(e);process.exitCode=1});
