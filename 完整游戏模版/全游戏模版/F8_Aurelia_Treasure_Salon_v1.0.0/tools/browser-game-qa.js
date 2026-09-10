async (page) => {
  const shots='/Users/xzkj/Documents/Codex/2026-08-28/gen/slots-game-template/完整游戏模版/全游戏模版/F8_Aurelia_Treasure_Salon_v1.0.0/output/playwright/';
  const point=async(name)=>page.evaluate(name=>{
    const cc=window.cc,scene=cc.director.getScene(),app=scene.getChildByName('Canvas').getComponent('AureliaApp');
    const find=n=>n.name===name?n:n.children.map(find).find(Boolean),n=find(app.root);
    if(!n)throw Error('Missing control: '+name);
    const p=scene.getComponentsInChildren(cc.Camera)[0].worldToScreen(n.worldPosition);
    const canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
    return {x:r.left+p.x/canvas.width*r.width,y:r.top+r.height-p.y/canvas.height*r.height};
  },name);
  const click=async name=>{const p=await point(name);await page.mouse.click(p.x,p.y);};
  const state=async()=>page.evaluate(()=>{
    const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
    return {kind:a.state.kind,running:a.reels?.running??false,travel:a.reels?.cols[0]?.travel??0,auto:a.auto,lamp:a.autoLamp?.string??'',sound:a.services.profile.current().settings.sound,soundLamp:a.soundLamp?.string??'',bet:a.bet,page:a.page,modal:!!a.modal};
  });
  const settle=async()=>{
    for(let i=0;i<50;i++){
      const s=await state();if(s.kind==='idle')return;
      if(s.modal){try{await click('Open vault 2');}catch{}}
      await page.waitForTimeout(400);
    }
    throw Error('Round did not return to idle');
  };
  const id=await page.evaluate(()=>new URL(location.href).searchParams.get('game')||'golden-hour');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4310/?debug=1&screen=game&game='+id+'&v=f8-final-qa');
  await page.waitForFunction(()=>window.cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp')?.reels && document.getElementById('csw-preloader')?.classList.contains('is-ready'));
  await page.waitForTimeout(600);
  await page.evaluate(()=>{
    const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
    for(let i=0;i<200;i++){
      const result=a.generator.generate(a.config,a.bet,a.rng);
      for(const round of result.featureResult?.rounds||[])for(const position of round.removed||[])
        if(!Number.isInteger(position)||position<0||position>=a.config.columns*a.config.rows)throw Error('Built cascade contains invalid cell index');
    }
  });
  await page.screenshot({path:shots+id+'-final.png'});
  const beforeControls=await state();
  await click('Increase bet');const raised=await state();
  if(raised.bet<=beforeControls.bet)throw Error('Increase bet did not change the wager');
  await click('Decrease bet');const restored=await state();
  if(restored.bet!==beforeControls.bet)throw Error('Decrease bet did not restore the wager');
  await click('Audio');await page.waitForTimeout(80);const soundChanged=await state();
  if(soundChanged.sound===beforeControls.sound||soundChanged.soundLamp!==(soundChanged.sound?'SOUND ON':'SOUND OFF'))throw Error('Sound control did not update its visible state');
  await click('Audio');await page.waitForTimeout(80);const soundRestored=await state();
  if(soundRestored.sound!==beforeControls.sound)throw Error('Sound control did not restore its setting');
  await click('Rules');if(!(await state()).modal)throw Error('Rules did not open');
  await click('Close dialog');await page.waitForTimeout(150);if((await state()).modal)throw Error('Rules shield remains');
  await click('SPIN');await page.waitForTimeout(220);const first=await state();
  await page.waitForTimeout(160);const next=await state();
  if(!first.running||next.travel<=first.travel)throw Error('SPIN did not move reel strips');
  await settle();
  await click('AUTO');await page.waitForTimeout(120);const on=await state();
  if(!on.auto||on.lamp!=='AUTO ON')throw Error('AUTO indicator not synchronized');
  await click('AUTO');const off=await state();if(off.auto||off.lamp!=='AUTO OFF')throw Error('AUTO did not disable');
  await settle();
  await page.setViewportSize({width:320,height:568});await page.waitForTimeout(300);
  await click('SPIN');await page.waitForTimeout(180);if(!(await state()).running)throw Error('Small-screen SPIN failed');
  await page.setViewportSize({width:430,height:932});await page.waitForTimeout(180);if(!(await state()).running)throw Error('Resize interrupted spin');
  await settle();await page.screenshot({path:shots+id+'-430.png'});
  if(errors.length)throw Error(errors.join('\n'));
  await click('Back to salon');await page.waitForTimeout(260);if((await state()).page!=='home')throw Error('Back button did not return to the salon');
  return {game:id,betControls:true,soundControl:true,spinTravel:[first.travel,next.travel],autoOn:on.lamp,autoOff:off.lamp,rulesClosed:true,backToSalon:true,resizeDuringSpin:true,final:await state(),errors};
}
