// Real rendered touch bounds and edge taps, including full-length nicknames.
// Contexts are isolated from the player's saved account and existing browser.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(process.env.QA_OUTPUT||'docs/qa/text-centering-20261012/header');
const BASE=process.env.QA_BASE||'http://127.0.0.1:6044/';
const VERSION=process.env.QA_VERSION||'f44-centered-reading-20261012';
const locales=(process.env.QA_LOCALES||'en,zh-CN,zh-TW,ja,ko').split(',');
const sizes=(process.env.QA_SIZES||'320x568,390x844').split(',').map(s=>s.split('x').map(Number));
const pages=['home','store','rewards','rank','profile'];
const fixtures=[['latin','WWWWWWWWWWWWWWWWWW'],['cjk','财富庆典招财纳福财富庆典招财纳福财富']];
fs.mkdirSync(OUT,{recursive:true});const records=[],errors=[];
async function ready(p,page){await p.waitForFunction(page=>{const a=window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.root&&!a.busy&&a.page===page&&!a.modal&&!a.node.getChildByName('Atelier loading')&&!document.getElementById('csw-preloader');},page,{timeout:90000});await p.waitForTimeout(180);}
async function navigate(p,page){await p.evaluate(page=>window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').navigate(page),page);await ready(p,page);}
async function inspect(p){return p.evaluate(()=>{
 const cc=window.cc,a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),k=innerWidth/cc.view.getVisibleSize().width;
 const find=(n,name)=>n.activeInHierarchy?(n.name===name?n:n.children.map(c=>find(c,name)).find(Boolean)):undefined;
 const bounds=n=>{const r=n.getComponent('cc.UITransform').getBoundingBoxToWorld();return{x:r.x*k,y:innerHeight-(r.y+r.height)*k,w:r.width*k,h:r.height*k};};
 const nickname=a.services.profile.current().nickname;
 const label=a.content.children.map(n=>n.getComponent('cc.Label')).find(l=>l?.string.replace(/\s/g,'')===nickname);
 const ctx=document.createElement('canvas').getContext('2d');ctx.font=`bold ${label.fontSize}px ${label.fontFamily}`;
 const lines=label.string.split('\n'),b=bounds(label.node),lineWidths=lines.map(s=>ctx.measureText(s).width*k*label.node.worldScale.x);
 const outline=(label.node.getComponent('cc.LabelOutline')?.width||0)*2*k*label.node.worldScale.x;
 return{page:a.page,targets:['Top up','Mail','Account avatar'].map(name=>({name,...bounds(find(a.content,name))})),nickname:{text:label.string,expected:nickname,font:label.fontSize*label.node.worldScale.y*k,align:[label.horizontalAlign,label.verticalAlign],bounds:b,lineWidths,outline,inkHeight:(lines.length-1)*label.lineHeight*k*label.node.worldScale.y+label.fontSize*k*label.node.worldScale.y+outline},scroll:[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight]};
});}
function overlaps(a,b){return Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)+.05&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y)+.05;}
function validate(data,width,height){
 assert.deepEqual(data.scroll,[0,0]);
 for(const target of data.targets){assert(target.w>=43.99&&target.h>=43.99,'Small target: '+target.name);assert(target.x>=0&&target.y>=0&&target.x+target.w<=width&&target.y+target.h<=height,'Offscreen target: '+target.name);}
 for(let i=0;i<data.targets.length;i++)for(let j=i+1;j<data.targets.length;j++)assert(!overlaps(data.targets[i],data.targets[j]),'Adjacent touch areas overlap');
 const n=data.nickname;assert.equal(n.text.replace(/\s/g,''),n.expected);assert(n.font>=9.5,'Nickname too small');assert.deepEqual(n.align,[1,1]);assert(n.lineWidths.every(w=>w+n.outline<=n.bounds.w+.5),'Nickname exceeds width');assert(n.inkHeight<=n.bounds.h+.5,'Nickname exceeds height');
}
async function edgeTap(p,target,corner){const x=corner==='right'?target.x+target.w-2:target.x+2,y=target.y+target.h-2;await p.touchscreen.tap(x,y);await p.waitForTimeout(180);}
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
 for(const [width,height] of sizes)for(const locale of locales){
  const c=await b.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(locale=>localStorage.setItem('fortune-skyways-f44.locale.v1',locale),locale);
  await p.goto(`${BASE}?debug=1&screen=home&v=${VERSION}`);await ready(p,'home');
  for(const page of pages){if(page!=='home')await navigate(p,page);const data=await inspect(p);validate(data,width,height);records.push({locale,size:[width,height],fixture:'default',...data});}
  for(const [kind,nickname] of fixtures){assert.equal(nickname.length,18);await p.evaluate(async nickname=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');if(!await a.services.profile.setNickname(nickname))throw Error('Nickname save failed');},nickname);await navigate(p,'home');const data=await inspect(p);validate(data,width,height);records.push({locale,size:[width,height],fixture:kind,...data});await p.screenshot({path:path.join(OUT,`${locale}-${width}x${height}-${kind}.png`)});}
  let data=await inspect(p);await edgeTap(p,data.targets[0],'left');await ready(p,'store');await navigate(p,'home');data=await inspect(p);await edgeTap(p,data.targets[1],'left');await p.waitForFunction(()=>window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').modal?.getComponentsInChildren('cc.Label').some(l=>l.node.name==='Text:Mailbox'),null,{timeout:5000});
  await p.evaluate(()=>window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').closeModal());await ready(p,'home');data=await inspect(p);await edgeTap(p,data.targets[2],'right');await ready(p,'profile');
  records.push({locale,size:[width,height],fixture:'edge taps',topup:'store',mail:'Mailbox',avatar:'profile'});console.log('PASS '+locale+' '+width+'x'+height+' header pages/nicknames/edge taps');await c.close();
 }
 assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(path.join(OUT,'header-audit.json'),JSON.stringify({date:new Date().toISOString(),records,errors},null,2));fs.rmSync(path.join(OUT,'failure.json'),{force:true});
 }finally{await b.close();}
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(OUT,'failure.json'),JSON.stringify({records,errors,failure:e.stack},null,2));process.exitCode=1;});
