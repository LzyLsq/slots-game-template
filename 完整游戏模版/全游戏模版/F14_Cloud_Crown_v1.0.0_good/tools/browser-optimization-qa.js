// Pass this function to Playwright run-code after starting tools/preview_server.py.
async (page) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4310/?debug=1&screen=game&game=ruby-revel');
  await page.waitForFunction(()=>window.cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp')?.reels);
  const result=await page.evaluate(async()=>{
    const app=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    if(!app.reduced)throw Error('System reduced-motion preference was ignored');
    await app.presentWin(1234,false);
    if(app.winLabel.string!=='WIN  1,234')throw Error('Reduced-motion win did not resolve at its final amount');
    app.winLabel.string='WIN  0';await wait(950);
    if(app.winLabel.string!=='WIN  0')throw Error('An old count-up overwrote the next round');
    const oldConfig=app.config,load=app.art.load;
    app.art.load=async()=>{throw Error('Simulated missing cabinet texture');};
    try{await app.navigate('game',{...oldConfig,id:'missing-cabinet'});}finally{app.art.load=load;}
    if(app.config!==oldConfig||app.page!=='game'||app.busy||app.modal)throw Error('Failed cabinet load corrupted navigation state');
    const atmosphere=app.plane.getChildByName('Cabinet reflections').getComponent('SalonAtmosphere');
    atmosphere.reducedMotion=false;await wait(100);atmosphere.reducedMotion=true;await wait(100);
    if([...atmosphere.motes,...atmosphere.glints].some(m=>m.alpha.opacity!==0))throw Error('Ambient light froze visibly in reduced motion');
    app.reels.reducedMotion=false;app.reels.highlight([0,1,2]);await wait(100);
    if(!app.reels.sparks.some(s=>s.alpha.opacity>0))throw Error('Winning symbols did not emit particles');
    await wait(850);
    if(app.reels.sparks.some(s=>s.alpha.opacity!==0))throw Error('Particles did not return to their pool');
    app.reels.reducedMotion=true;app.reels.highlight([0]);await wait(100);
    if(app.reels.sparks.some(s=>s.alpha.opacity!==0))throw Error('Reduced-motion particles are still visible');
    const originalGenerate=app.generator.generate.bind(app.generator),beforeBest=app.services.profile.current().biggestWin;
    app.generator.generate=(config,bet,rng)=>{
      const generated=originalGenerate(config,bet,rng);
      const forcedWin=Math.max(beforeBest+137,bet);
      return {...generated,wins:[],baseWin:forcedWin,featureWin:0,totalWin:forcedWin,feature:undefined,featureResult:undefined};
    };
    try{await app.spin();}finally{app.generator.generate=originalGenerate;}
    const liveBest=app.services.profile.current().biggestWin;
    if(liveBest<=beforeBest||app.topWinLabel.string!==liveBest.toLocaleString('en-US'))throw Error('TOP WIN did not refresh after settlement');
    return {countUpRaceFixed:true,failedNavigationPreserved:true,reducedMotion:true,particlesRecycled:true,topWinRefresh:true};
  });
  if(errors.length)throw Error(errors.join('\n'));return result;
}
