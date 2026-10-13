const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const P=path.resolve(__dirname,'../..'),O=path.resolve(process.env.QA_OUTPUT||path.join(P,'docs/qa/startup'));fs.mkdirSync(O,{recursive:true});
const ready=()=>{const a=window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.root&&!a.busy&&!a.node.getChildByName('Atelier loading')&&!document.getElementById('csw-preloader')};
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});let errors=[],results=[];
for(const [w,h,motion] of [[390,844,'no-preference'],[320,568,'no-preference'],[320,568,'reduce']]){
 const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:motion});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.__startupEvents=[];window.addEventListener('aurelia-load-progress',e=>window.__startupEvents.push(e.detail.progress));window.addEventListener('aurelia-app-ready',()=>window.__startupEvents.push('ready'))});
 let releaseBoot;const bootGate=new Promise(resolve=>{releaseBoot=resolve});
 await p.route('**/index.js',async r=>{await bootGate;await r.continue()});
 await p.goto('http://127.0.0.1:6044/?debug=1&screen=home&v=startup-final',{waitUntil:'commit'});
 await p.locator('#csw-preloader').waitFor({state:'visible',timeout:20000});
 await p.screenshot({path:path.join(O,`startup-${w}x${h}-${motion}.png`)});
 assert(!(await p.locator('#csw-preloader').innerText()).match(/ATELIER|Golden Wilds|GOLDEN SANCTUARIES/));assert.equal(await p.locator('.invitation').innerText(),'FOUR SKY PORTS · ONE TREASURE VOYAGE');releaseBoot();try{await p.waitForFunction(ready,null,{timeout:90000});}catch(e){console.error('BOOT STATE',await p.evaluate(()=>{const a=window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return {events:window.__startupEvents,cc:!!window.cc,scene:!!window.cc?.director?.getScene(),app:!!a,root:!!a?.root,busy:a?.busy,page:a?.page,loader:document.getElementById('csw-preloader')?.innerText}}),errors);throw e;}await p.screenshot({path:path.join(O,`arrived-${w}x${h}-${motion}.png`)});
 const data=await p.evaluate(()=>({events:window.__startupEvents,scroll:[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight],overlay:!!document.querySelector('#csw-preloader')}));assert.deepEqual(data.scroll,[0,0]);assert.equal(data.overlay,false);assert(data.events.includes('ready'));results.push({w,h,motion,...data});await c.close();console.log('PASS startup '+w+' '+motion);
}
for(const [locale,htmlLang,invitation] of [['en','en','FOUR SKY PORTS · ONE TREASURE VOYAGE'],['zh-CN','zh-CN','四座空港 · 一段寻宝旅程'],['zh-TW','zh-TW','四座空港 · 一段尋寶旅程'],['ja','ja','4つの空港 · 宝探しの旅'],['ko','ko','네 공항 · 하나의 보물 항해']]){
 const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),p=await c.newPage();
 await p.addInitScript(locale=>{localStorage.setItem('fortune-skyways-f44.locale.v1',locale);localStorage.setItem('golden-wilds-f36.locale.v1',locale==='en'?'zh-CN':'en')},locale);
 let releaseBoot;const bootGate=new Promise(resolve=>{releaseBoot=resolve});await p.route('**/index.js',async r=>{await bootGate;await r.abort()});
 await p.goto('http://127.0.0.1:6044/?debug=1&screen=home&v=startup-locale-final',{waitUntil:'domcontentloaded'});await p.locator('#csw-preloader').waitFor({state:'visible'});
 assert.equal(await p.locator('html').getAttribute('lang'),htmlLang);assert.equal(await p.locator('.invitation').innerText(),invitation);
 const text=await p.locator('#csw-preloader').innerText();assert(!/Golden Wilds|GOLDEN SANCTUARIES|黄金秘境|黃金秘境/.test(text));
 await p.screenshot({path:path.join(O,`startup-locale-${locale}.png`)});results.push({locale,htmlLang,invitation,persistedF44Locale:true,ignoresF36Locale:true});releaseBoot();await c.close();console.log('PASS startup branding and saved locale '+locale);
}
const c=await b.newContext({viewport:{width:320,height:568},deviceScaleFactor:2,isMobile:true,hasTouch:true}),p=await c.newPage();await p.route('**/index.js',r=>r.abort());await p.goto('http://127.0.0.1:6044/?debug=1&v=startup-failure',{waitUntil:'domcontentloaded'});await p.locator('#loading-retry').waitFor({state:'visible',timeout:20000});await p.screenshot({path:path.join(O,'failure-320x568.png')});await p.unroute('**/index.js');await p.locator('#loading-retry').click();await p.waitForFunction(ready,null,{timeout:90000});results.push({failureRetry:true,overlayRemoved:true});console.log('PASS startup failure retry');await c.close();await b.close();assert.equal(errors.length,0);fs.writeFileSync(path.join(O,'startup-audit.json'),JSON.stringify({results,errors},null,2));})().catch(e=>{console.error(e);process.exit(1)});
