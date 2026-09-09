async(page)=>{
 const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:4310/?debug=1&screen=game&game=ruby-revel&v=f8-natural-celebration');
 await page.waitForFunction(()=>document.getElementById('csw-preloader')?.classList.contains('is-ready'));await page.waitForTimeout(500);
 const motion=await page.evaluate(async()=>{
  const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),r=a.reels;
  if(a.state.kind!=='idle'||r.running)throw Error('Not idle before ambient sample');
  const before={x:r.reflection.position.x,y:r.cols[0].cells[2].node.position.y};
  const frames=[];let start=performance.now(),previous=start;
  await new Promise(resolve=>{const tick=now=>{frames.push(now-previous);previous=now;if(now-start<1600)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
  const sorted=frames.slice(1).sort((a,b)=>a-b);
  if(a.state.kind!=='idle'||r.running)throw Error('Spin contaminated ambient sample');
  const cell=r.cols[0].cells[2].node;
  if(Math.abs(cell.scale.x-cell.scale.y)>.0001)throw Error('Idle symbol is stretched');
  a.force='big';
  return {before,after:{x:r.reflection.position.x,y:r.cols[0].cells[2].node.position.y},medianFrameMs:sorted[Math.floor(sorted.length/2)],p95FrameMs:sorted[Math.floor(sorted.length*.95)]};
 });
 if(motion.before.x===motion.after.x||motion.before.y===motion.after.y)throw Error('Idle motion missing');
 const p=await page.evaluate(()=>{const cc=window.cc,s=cc.director.getScene(),a=s.getChildByName('Canvas').getComponent('AureliaApp'),p=s.getComponentsInChildren(cc.Camera)[0].worldToScreen(a.plane.getChildByName('SPIN').worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:p.x/c.width*r.width,y:r.height-p.y/c.height*r.height};});
 await page.mouse.click(p.x,p.y);
 await page.waitForFunction(()=>window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').modal?.name==='Treasure celebration',{},{timeout:30000});
 await page.waitForTimeout(900);
 await page.screenshot({path:'/Users/xzkj/Documents/Codex/2026-08-28/gen/slots-game-template/完整游戏模版/全游戏模版/F8_Aurelia_Treasure_Salon_v1.0.0/output/playwright/f8-big-win-final.png'});
 await page.mouse.click(195,420);await page.waitForTimeout(120);await page.mouse.click(195,420);
 await page.waitForFunction(()=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');return !a.modal&&a.state.kind==='idle';});
 await page.waitForTimeout(350);
 await page.evaluate(()=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),s=a.plane.getChildByName('SPIN');if(!s.active||s.getComponent('cc.UIOpacity')?.opacity!==255)throw Error('SPIN did not fade back');});
 if(errors.length)throw Error(errors.join('\n'));return {motion,celebrationDismissed:true,errors};
}
