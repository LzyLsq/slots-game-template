async(page)=>{
 const shots='/Users/xzkj/Documents/Codex/2026-08-28/gen/slots-game-template/完整游戏模版/全游戏模版/F8_Aurelia_Treasure_Salon_v1.0.0/output/playwright/';
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:4310/?debug=1&screen=register&v=f8-forms-final');
 await page.waitForFunction(()=>document.getElementById('csw-preloader')?.classList.contains('is-ready'));await page.waitForTimeout(600);
 const click=async(name,field=false)=>{
  const p=await page.evaluate(({name,field})=>{
   const cc=window.cc,scene=cc.director.getScene(),a=scene.getChildByName('Canvas').getComponent('AureliaApp');
   const find=n=>(field?n.getComponent('cc.EditBox')?.placeholder===name:n.name===name)?n:n.children.map(find).find(Boolean);
   const n=find(a.root);if(!n)throw Error('Missing '+name);
   const p=scene.getComponentsInChildren(cc.Camera)[0].worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();
   return {x:r.left+p.x/c.width*r.width,y:r.top+r.height-p.y/c.height*r.height};
  },{name,field});await page.mouse.click(p.x,p.y);
 };
 await page.screenshot({path:shots+'f8-register-final.png'});
 await click('Username',true);await page.locator('input:visible').fill('F8_QA_Draft');await page.mouse.click(195,315);
 await click('Nickname',true);await page.locator('input:visible').fill('TreasureTester');await page.mouse.click(195,315);
 await click('Terms');await page.waitForTimeout(200);await click('Close dialog');await click('Accept terms');
 const draft=await page.evaluate(()=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');return {username:a.draft.username,nickname:a.draft.nickname,accepted:a.draft.acceptedTerms};});
 if(draft.username!=='F8_QA_Draft'||draft.nickname!=='TreasureTester'||!draft.accepted)throw Error('Registration draft lost');
 await page.screenshot({path:shots+'f8-register-draft-preserved.png'});
 for(const screen of ['login','home','store','rewards','rank','profile']){
  await page.goto('http://127.0.0.1:4310/?debug=1&screen='+screen+'&v=f8-final');
  await page.waitForFunction(()=>document.getElementById('csw-preloader')?.classList.contains('is-ready'));await page.waitForTimeout(550);
  await page.screenshot({path:shots+'f8-'+screen+'-final.png'});
 }
 if(errors.length)throw Error(errors.join('\n'));return {draftPreserved:true,pagesCaptured:7,errors};
}
