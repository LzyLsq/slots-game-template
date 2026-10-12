async (page) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const sizes=[[320,568],[375,812],[390,844],[430,932],[360,640],[739,766],[1024,768]];
  const results=[];
  for(const [width,height] of sizes) {
    await page.setViewportSize({width,height}); await page.waitForTimeout(260);
    for(const mode of [0,1,2,3]) {
      const state=await page.evaluate(({mode,t})=>{
        const a=window.cc.director.getScene().getComponentsInChildren(window.cc.Component).find(c=>typeof c.bootReady==='boolean');
        a.save.selectedMode=mode;a.showTaskGoldReveal('OPEN THE HOUSE',300);
        const c=a.activeOverlay.components.find(c=>c.playback&&c.actor);
        c.finished=true;c.actorOpacity.opacity=255;c.playback.time=t;c.applyPose(c.playback.advance(0).pose);
        const transform=n=>n.components.find(c=>typeof c.getBoundingBoxToWorld==='function');
        const actor=c.actor, parent=actor.parent;
        const caption=parent.children.find(n=>n.components.some(c=>c.string==='A LITTLE FORTUNE, JUST FOR YOU'));
        const title=parent.children.find(n=>n.name.includes('title-house-journal-wide'));
        const sourceAnchor=actor.worldPosition.clone();
        return {mode,time:t,coins:a.save.coins,grounded:actor.angle===0,actorScale:actor.scale.x,foot:{x:sourceAnchor.x,y:sourceAnchor.y},caption:caption?transform(caption).getBoundingBoxToWorld():undefined};
      },{mode,t:[2.75,3,2.94,3.22][mode]});
      // Let the separate title/ticket entrance tweens settle while this pose is held.
      await page.waitForTimeout(1050);
      if(width===390||mode===3) await page.screenshot({path:`output/playwright/treasure-fluid-${width}x${height}-${mode}.png`});
      results.push({width,height,...state});
      await page.evaluate(()=>{const a=window.cc.director.getScene().getComponentsInChildren(window.cc.Component).find(c=>typeof c.bootReady==='boolean');a.activeOverlay.destroy();a.activeOverlay=undefined;a.render();});
      await page.waitForTimeout(150);
    }
  }
  await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(260);
  // Material/frames belong to one presentation. Destroying or disabling it
  // cannot play stale sound/complete callbacks or keep live material instances.
  const lifecycle=await page.evaluate(async()=>{
    const a=window.cc.director.getScene().getComponentsInChildren(window.cc.Component).find(c=>typeof c.bootReady==='boolean');
    const coins=a.save.coins;a.showTaskGoldReveal('OPEN THE HOUSE',300);
    const c=a.activeOverlay.components.find(c=>c.playback&&c.actor),body=c.bodyMaterial,arm=c.armMaterial,frames=c.mouthFrames;
    let callbacks=0;c.onCue=()=>callbacks++;c.onFinished=()=>callbacks++;
    c.enabled=false;c.update(100);
    const afterDisable={disposed:c.disposed,callbacks,time:c.playback.time};
    a.activeOverlay.destroy();a.activeOverlay=undefined;a.render();
    await new Promise(resolve=>setTimeout(resolve,100));
    return {coins,balanceAfter:a.save.coins,afterDisable,bodyDestroyed:!body.isValid,armDestroyed:!arm.isValid,mouthFrames:frames.length};
  });
  const reduced=[];
  for(const mode of [0,1,2,3]) {
    await page.evaluate(mode=>{const a=window.cc.director.getScene().getComponentsInChildren(window.cc.Component).find(c=>typeof c.bootReady==='boolean');a.reduced=true;a.save.selectedMode=mode;a.showTaskGoldReveal('OPEN THE HOUSE',300);},mode);
    await page.waitForTimeout(1400);
    const entry=await page.evaluate(()=>{const a=window.cc.director.getScene().getComponentsInChildren(window.cc.Component).find(c=>typeof c.bootReady==='boolean');const c=a.activeOverlay.components.find(c=>c.playback&&c.actor);return {mode:c.mode,time:c.playback.time,bodyMaterial:!!c.bodyMaterial,armMaterial:!!c.armMaterial,complete:c.finished,coins:a.save.coins};});
    await page.mouse.click(195,713,{delay:70}); await page.waitForTimeout(180);
    entry.afterKeep=await page.evaluate(()=>{const a=window.cc.director.getScene().getComponentsInChildren(window.cc.Component).find(c=>typeof c.bootReady==='boolean');return {overlay:!!a.activeOverlay,coins:a.save.coins,page:a.page};}); reduced.push(entry);
  }
  await page.evaluate(()=>{const a=window.cc.director.getScene().getComponentsInChildren(window.cc.Component).find(c=>typeof c.bootReady==='boolean');a.reduced=false;a.save.selectedMode=0;a.render();});
  return {sizes,results,lifecycle,reduced,errors};
}
