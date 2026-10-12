// Check the rendered hall against the painted navigation, then operate its
// labels and swipes in isolated phone contexts. This is not a motion benchmark.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(process.env.QA_OUTPUT||'docs/qa/text-centering-20261012/hall');
const BASE=process.env.QA_BASE||'http://127.0.0.1:6040/';
const VERSION=process.env.QA_VERSION||'f40-centered-reading-20261012';
const locales=(process.env.QA_LOCALES||'en,zh-CN,zh-TW,ja,ko').split(',');
const sizes=(process.env.QA_SIZES||'320x568,390x844').split(',').map(s=>s.split('x').map(Number));
fs.mkdirSync(OUT,{recursive:true});
const records=[],errors=[];
async function ready(p,screen){await p.waitForFunction(screen=>{const a=window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.root&&!a.busy&&a.page===screen&&!a.modal&&!a.node.getChildByName('Atelier loading')&&!a.node.getChildByName('Game mode loading')&&!document.getElementById('csw-preloader');},screen,{timeout:90000});await p.waitForTimeout(150);}
async function hall(p){return p.evaluate(()=>{
 const cc=window.cc,a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),stage=a.content.getChildByName('Fortune festival atlas'),k=innerWidth/cc.view.getVisibleSize().width;
 const bounds=n=>{const b=n.getComponent('cc.UITransform').getBoundingBoxToWorld();return{x:b.x*k,y:innerHeight-(b.y+b.height)*k,w:b.width*k,h:b.height*k};};
 const label=n=>{const l=n.getComponentsInChildren('cc.Label').find(l=>l.node.activeInHierarchy);return{text:l.string,bounds:bounds(l.node),screenFont:l.fontSize*l.node.worldScale.y*k};};
 const nav=a.content.children.find(n=>n.children.some(c=>c.name==='Navigation engraved separators'));
 const footer=stage.children.find(n=>n.name.startsWith('Text:Four houses'));
 const selectors=[0,1,2,3].map(i=>{const hit=stage.getChildByName('Choose destination '+i);return{hitBounds:bounds(hit),...label(hit)};});
 const headers=a.content.children.filter(n=>n!==stage&&!n.name.includes('salon-hall')&&n!==nav);
 return{route:a.selectedRoute,brand:bounds(stage.getChildByName('canopy-brand')),header:headers.map(bounds),navigation:bounds(nav),footer:label(footer),selectors,enter:bounds(stage.getChildByName('Enter selected fortune house')),album:bounds(stage.getChildByName('Festival album')),presentations:stage.children.filter(n=>n.name.startsWith('House presentation')).length,scroll:[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight]};
});}
async function tap(p,name){const q=await p.evaluate(name=>{const cc=window.cc,a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),k=innerWidth/cc.view.getVisibleSize().width;const find=n=>n.activeInHierarchy?(n.name===name?n:n.children.map(find).find(Boolean)):undefined;const n=find(a.root);if(!n)throw Error('Missing '+name);const b=n.getComponent('cc.UITransform').getBoundingBoxToWorld();return{x:(b.x+b.width/2)*k,y:innerHeight-(b.y+b.height/2)*k};},name);await p.touchscreen.tap(q.x,q.y);}
function rectContains(a,b){return b.x>=a.x-.5&&b.y>=a.y-.5&&b.x+b.w<=a.x+a.w+.5&&b.y+b.h<=a.y+a.h+.5;}
async function swipe(p,c,from,to,y){const cd=await c.newCDPSession(p);try{await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y}]});for(let i=1;i<=8;i++){await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from+(to-from)*i/8,y}]});await p.waitForTimeout(20);}await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}finally{await cd.detach();}await p.waitForTimeout(240);}
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
 for(const [width,height] of sizes)for(const locale of locales){
  const c=await b.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(locale=>localStorage.setItem('fortune-festival-f40.locale.v1',locale),locale);
  await p.goto(`${BASE}?debug=1&screen=home&v=${VERSION}`);await ready(p,'home');const data=await hall(p);
  assert.deepEqual(data.scroll,[0,0]);
  const headerBottom=Math.max(...data.header.map(r=>r.y+r.h));
  assert(data.brand.y>=headerBottom+2,'Brand overlaps the header');
  assert(data.footer.bounds.y+data.footer.bounds.h<=data.navigation.y-4,'Footer overlaps painted navigation');
  assert(data.footer.screenFont>=9.5,'Hall footer shrank to tiny text');
  assert(data.enter.y+data.enter.h<=data.album.y-1,'Hall buttons overlap');
  assert(data.album.y+data.album.h<=data.footer.bounds.y-1,'Album overlaps footer');
  assert(data.presentations===1);
  for(const [i,selector] of data.selectors.entries()){
   assert(selector.screenFont>=9.5,'Mode caption shrank to tiny text');assert(rectContains(selector.hitBounds,selector.bounds));
   assert(selector.hitBounds.y+selector.hitBounds.h<=data.enter.y-1,'Selector overlaps enter button');
   // Tap the lower part of the visible caption, where the old hit box ended.
   const q=await p.evaluate(i=>{const cc=window.cc,a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),n=a.content.getChildByName('Fortune festival atlas').getChildByName('Choose destination '+i),l=n.getComponentsInChildren('cc.Label')[0],k=innerWidth/cc.view.getVisibleSize().width;const b=l.node.getComponent('cc.UITransform').getBoundingBoxToWorld(),hit=n.getComponent('cc.UITransform').getBoundingBoxToWorld();return{x:(b.x+b.width/2)*k,y:innerHeight-(b.y+b.height*.15)*k,contained:b.x>=hit.x-.01&&b.y>=hit.y-.01&&b.x+b.width<=hit.x+hit.width+.01&&b.y+b.height<=hit.y+hit.height+.01};},i);
   assert(q.contained,'Visible caption extends outside its touch area');await p.touchscreen.tap(q.x,q.y);await p.waitForTimeout(140);assert.equal((await hall(p)).route,i,'Caption tap selected wrong house');
  }
  const first=(await hall(p)).route,y=data.selectors[0].bounds.y-70;
  for(let i=0;i<3;i++){await swipe(p,c,width*.78,width*.22,y);assert.equal((await hall(p)).route,(first+1)%4);await swipe(p,c,width*.22,width*.78,y);assert.equal((await hall(p)).route,first);}
  await p.screenshot({path:path.join(OUT,`${locale}-${width}x${height}-home.png`)});
  await tap(p,'Enter selected fortune house');await ready(p,'game');const mode=await p.evaluate(()=>window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').config.id);assert.equal(mode,'amber-panda');await tap(p,'Back to salon');await ready(p,'home');assert.equal((await hall(p)).presentations,1);
  records.push({locale,size:[width,height],headerBottom,...data,captionTaps:4,reverseSwipePairs:3,enteredMode:mode});console.log('PASS '+locale+' '+width+'x'+height);await c.close();
 }
 assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(path.join(OUT,'hall-audit.json'),JSON.stringify({date:new Date().toISOString(),records,errors},null,2));console.log('PASS '+records.length+' rendered hall contexts');
 }finally{await b.close();}
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(OUT,'failure.json'),JSON.stringify({records,errors,failure:e.stack},null,2));process.exitCode=1;});
