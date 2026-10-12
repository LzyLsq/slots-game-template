// Capture authored service scenes and genuine mode loading in isolated QA accounts.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(process.env.QA_OUTPUT||'docs/screenshots/f40-final-20261010/services');
const BASE='http://127.0.0.1:6040/';
const VERSION=process.env.QA_VERSION||'f40-final-20261010';
fs.mkdirSync(OUT,{recursive:true});
const records=[],errors=[];
async function ready(p,page){await p.waitForFunction(page=>{const a=window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a&&a.page===page&&!a.busy&&!a.node.getChildByName('Atelier loading')&&!a.node.getChildByName('Game mode loading')&&!document.getElementById('csw-preloader');},page,{timeout:120000});}
async function tap(p,name){const point=await p.evaluate(name=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');let n;function find(node){if(node.name===name&&node.activeInHierarchy)n=node;for(const c of node.children)find(c)}find(a.root);if(!n)throw new Error('Missing active control '+name);const w=n.worldPosition,s=window.cc.view.getVisibleSize();return {x:w.x/s.width*innerWidth,y:(s.height-w.y)/s.height*innerHeight}},name);await p.touchscreen.tap(point.x,point.y);}
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
for(const [width,height] of [[390,844],[320,568]]){
 const c=await b.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 for(const screen of ['login','register','store','rewards','rank','profile']){
  await p.goto(`${BASE}?debug=1&screen=${screen}&v=${VERSION}`);await ready(p,screen);await p.waitForTimeout(450);
  const state=await p.evaluate(()=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');return {page:a.page,labels:a.root.getComponentsInChildren('cc.Label').filter(l=>l.node.activeInHierarchy).map(l=>l.string),scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight,innerWidth,innerHeight]}});
  assert(state.scroll[0]<=width+1&&state.scroll[1]<=height+1,'Page must not scroll');const file=`${screen}-${width}x${height}.png`;await p.screenshot({path:path.join(OUT,file)});records.push({file,size:[width,height],...state});console.log('CAPTURE',file);
 }
 if(width===390){
  await p.goto(`${BASE}?debug=1&screen=home&v=${VERSION}`);await ready(p,'home');
  // Delay only owned QA resource requests so the actual loading progress is visible.
  await p.route('**/*',async route=>{if(/\.(png|jpg|jpeg)(\?|$)/.test(route.request().url()))await new Promise(r=>setTimeout(r,1000));await route.continue();});
  for(const [i,mode] of ['golden-phoenix','jade-dragon','pearl-qilin','amber-panda'].entries()){
   await tap(p,'Choose destination '+i);await tap(p,'Enter selected fortune house');
   await p.waitForFunction(()=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');const n=a.node.getChildByName('Game mode loading');return n&&n.activeInHierarchy&&n.children.some(c=>(c.getComponent('cc.UIOpacity')?.opacity??0)>150);},null,{timeout:15000});
   const file=`loading-${mode}-390x844.png`;await p.screenshot({path:path.join(OUT,file)});records.push({file,size:[width,height],mode,fixture:'Owned QA image requests delayed 1000ms; real resource progress and UI entry'});await ready(p,'game');await tap(p,'Back to salon');await ready(p,'home');console.log('CAPTURE',file);
  }
 }
 await c.close();
}
await b.close();assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(path.join(OUT,'capture-audit.json'),JSON.stringify({date:new Date().toISOString().slice(0,10),records,errors},null,2));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(OUT,'capture-failure.json'),JSON.stringify({records,errors,failure:e.stack},null,2));process.exit(1)});
